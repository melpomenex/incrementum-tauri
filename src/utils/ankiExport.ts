import * as JSZip from "jszip";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import type { LearningItem } from "../types/document";

export interface AnkiExportOptions {
  deckName: string;
}

const DEFAULT_CSS = `.card { font-family: arial; font-size: 20px; text-align: left; color: #2c2c2c; background: #ffffff; }`;

function normalizeText(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function buildFields(front: string, back: string): string {
  return `${front}\u001f${back}`;
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function joinTags(tags: string[]): string {
  if (tags.length === 0) return "";
  return ` ${tags.join(" ")} `;
}

function mapStateToAnki(state: LearningItem["state"], isSuspended: boolean): { type: number; queue: number } {
  if (isSuspended) {
    return { type: 2, queue: -1 };
  }
  switch (state) {
    case "learning":
      return { type: 1, queue: 1 };
    case "review":
      return { type: 2, queue: 2 };
    case "relearning":
      return { type: 3, queue: 3 };
    case "new":
    default:
      return { type: 0, queue: 0 };
  }
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 86400000;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / msPerDay));
}

export async function buildAnkiApkg(
  items: LearningItem[],
  { deckName }: AnkiExportOptions
): Promise<Uint8Array> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE col (
      id integer primary key,
      crt integer not null,
      mod integer not null,
      scm integer not null,
      ver integer not null,
      dty integer not null,
      usn integer not null,
      ls integer not null,
      conf text not null,
      models text not null,
      decks text not null,
      dconf text not null,
      tags text not null
    );
  `);

  db.run(`
    CREATE TABLE notes (
      id integer primary key,
      guid text not null,
      mid integer not null,
      mod integer not null,
      usn integer not null,
      tags text not null,
      flds text not null,
      sfld integer not null,
      csum integer not null,
      flags integer not null,
      data text not null
    );
  `);

  db.run(`
    CREATE TABLE cards (
      id integer primary key,
      nid integer not null,
      did integer not null,
      ord integer not null,
      mod integer not null,
      usn integer not null,
      type integer not null,
      queue integer not null,
      due integer not null,
      ivl integer not null,
      factor integer not null,
      reps integer not null,
      lapses integer not null,
      left integer not null,
      odue integer not null,
      odid integer not null,
      flags integer not null,
      data text not null
    );
  `);

  db.run(`CREATE INDEX ix_notes_usn on notes (usn);`);
  db.run(`CREATE INDEX ix_notes_csum on notes (csum);`);
  db.run(`CREATE INDEX ix_cards_nid on cards (nid);`);
  db.run(`CREATE INDEX ix_cards_sched on cards (did, queue, due);`);
  db.run(`CREATE INDEX ix_cards_usn on cards (usn);`);

  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);
  const nowDays = Math.floor(now / 86400000);
  const deckId = now;
  const modelId = now + 1;

  const models = {
    [modelId]: {
      id: modelId,
      name: "Incrementum Basic",
      type: 0,
      mod: nowSeconds,
      usn: -1,
      sortf: 0,
      did: deckId,
      tmpls: [
        {
          name: "Card 1",
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}<hr id=answer>{{Back}}",
          did: null,
          ord: 0,
          bafmt: "",
          bqfmt: "",
          bfont: "Arial",
          bsize: 20,
        },
      ],
      flds: [
        { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20 },
        { name: "Back", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20 },
      ],
      css: DEFAULT_CSS,
      latexPre: "\\documentclass[12pt]{article}\\n\\special{papersize=3in,5in}\\n\\usepackage[utf8]{inputenc}\\n\\usepackage{amssymb,amsmath}\\n\\pagestyle{empty}\\n\\setlength{\\parindent}{0pt}\\n\\begin{document}",
      latexPost: "\\end{document}",
      req: [[0, "any", [0, 1]]],
    },
  };

  const decks = {
    [deckId]: {
      id: deckId,
      name: deckName,
      mod: nowSeconds,
      usn: -1,
      desc: "",
      dyn: 0,
      collapsed: false,
      conf: 1,
      extendNew: 0,
      extendRev: 0,
      lrnToday: [0, 0],
      newToday: [0, 0],
      revToday: [0, 0],
      timeToday: [0, 0],
      confId: 1,
    },
  };

  const deckConfig = {
    1: {
      id: 1,
      name: "Default",
      mod: nowSeconds,
      usn: -1,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      new: { perDay: 20, ints: [1, 10], initialFactor: 2500, bury: true, order: 1 },
      rev: { perDay: 200, ease4: 1.3, ivlFct: 1, maxIvl: 36500, bury: true, hardFactor: 1.2 },
      lapse: { mins: [10], leechFails: 8, leechAction: 0, mult: 0 },
      replayq: true,
    },
  };

  const colConfig = {
    nextPos: items.length + 1,
    estTimes: true,
    activeDecks: [deckId],
    sortType: "noteFld",
    timeLim: 0,
    sortBackwards: false,
    addToCur: true,
    curDeck: deckId,
    newSpread: 0,
    dueCounts: true,
  };

  db.run(
    "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (1, ?, ?, ?, 11, 0, -1, 0, ?, ?, ?, ?, ?)",
    [
      nowDays,
      nowSeconds,
      nowSeconds,
      JSON.stringify(colConfig),
      JSON.stringify(models),
      JSON.stringify(decks),
      JSON.stringify(deckConfig),
      "{}",
    ]
  );

  let noteIndex = 0;
  for (const item of items) {
    const noteId = now + noteIndex + 1;
    const cardId = now + noteIndex + 100000;
    const front = normalizeText(item.question || item.clozeText || "");
    const back = normalizeText(item.answer || "");
    if (!front) {
      noteIndex += 1;
      continue;
    }

    const tags = [
      ...item.tags,
      "incrementum-export",
      `incrementum-id::${item.id}`,
    ];

    const fields = buildFields(front, back);
    const guid = item.id;
    const csumHex = await sha1Hex(front);
    const csum = parseInt(csumHex.slice(0, 8), 16) || 0;
    const sfld = front.length > 255 ? front.slice(0, 255) : front;

    db.run(
      "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')",
      [noteId, guid, modelId, nowSeconds, joinTags(tags), fields, sfld, csum]
    );

    const dueDate = item.dueDate ? new Date(item.dueDate) : new Date();
    const due = daysBetween(new Date(nowDays * 86400000), dueDate);
    const interval = Math.max(0, Math.round(item.interval || 0));
    const factor = Math.round((item.easeFactor || 2.5) * 1000);
    const { type, queue } = mapStateToAnki(item.state, item.isSuspended);

    db.run(
      "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, 0, ?, -1, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, '')",
      [
        cardId,
        noteId,
        deckId,
        nowSeconds,
        type,
        queue,
        due,
        interval,
        factor,
        item.reviewCount || 0,
        item.lapses || 0,
      ]
    );

    noteIndex += 1;
  }

  const dbBytes = db.export();
  db.close();

  const zip = new JSZip();
  zip.file("collection.anki2", dbBytes);
  zip.file("media", "{}");

  return await zip.generateAsync({ type: "uint8array" });
}
