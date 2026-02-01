import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";

type YjsSyncState = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  persistence: IndexeddbPersistence;
  url: string;
  room: string;
};

const DEFAULT_SYNC_URL = "wss://sync.readsync.org";
const ROOM_KEY = "incrementum_sync_room";

let instance: YjsSyncState | null = null;

function generateRoomId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function getSyncRoomId(): string {
  if (typeof window === "undefined") {
    return "incrementum-local";
  }

  let room = localStorage.getItem(ROOM_KEY);
  if (!room) {
    room = generateRoomId();
    localStorage.setItem(ROOM_KEY, room);
  }
  return room;
}

export function setSyncRoomId(roomId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(ROOM_KEY, roomId);
}

export function createNewSyncRoomId(): string {
  const room = generateRoomId();
  setSyncRoomId(room);
  return room;
}

export function getYjsSync(): YjsSyncState {
  if (instance) {
    return instance;
  }

  const url = import.meta.env.VITE_YJS_SYNC_URL || DEFAULT_SYNC_URL;
  const room = import.meta.env.VITE_YJS_ROOM || getSyncRoomId();

  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence("incrementum-yjs", doc);
  const provider = new WebsocketProvider(url, room, doc, {
    connect: true,
  });

  instance = {
    doc,
    provider,
    persistence,
    url,
    room,
  };

  return instance;
}
