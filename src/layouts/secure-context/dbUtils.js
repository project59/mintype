// utils/dbUtils.js
import { openDB } from "idb";

const DB_NAME = "MSS";
const STORE = "secure_store";

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  });
}

export async function setItem(key, value) {
  const db = await getDB();
  return db.put(STORE, value, key);
}

export async function getItem(key) {
  const db = await getDB();
  return db.get(STORE, key);
}

export async function clearStore() {
  const db = await getDB();
  await db.clear(STORE);
}
