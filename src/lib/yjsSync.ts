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
const DEFAULT_ROOM = "incrementum-global";

let instance: YjsSyncState | null = null;

export function getYjsSync(): YjsSyncState {
  if (instance) {
    return instance;
  }

  const url = import.meta.env.VITE_YJS_SYNC_URL || DEFAULT_SYNC_URL;
  const room = import.meta.env.VITE_YJS_ROOM || DEFAULT_ROOM;

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
