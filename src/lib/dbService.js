import { openDB } from 'idb';
import { nanoid } from 'nanoid';
import { addOperation, putOperation, SYNC_QUEUE_STORE } from './syncService';
import { newPageContentSchema, newPageSchema, TLDRAW_WHITEBOARD_FORMAT_VERSION } from '../utils/constants.js';
import { getWorkspaceRandomImage } from "../utils/assets.js";
import { decryptDataWithMasterKey, encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';
import { isOrderKey, orderKeyFor, sortByOrder } from './pageOrder.js';

const broadcastChannel = new BroadcastChannel('db-updates');

// `remotePageIds` lists pages whose content sync replaced, so open editors can reload them.
const notifyUpdate = (detail = {}) => {
    broadcastChannel.postMessage({ type: 'update', ...detail });
};

const STORE_NAME = 'workspacemeta';
const TOMBSTONE_STORE = 'tombstones';
const NOTES_GENERATION_KEY = 'mintypeNotesGeneration';
let fallbackNotesGeneration = nanoid();
let notesGenerationStorageAvailable = true;
let db; // This will hold our initialized database instance
let dbPromise = null;

function getNotesGeneration() {
    if (notesGenerationStorageAvailable) {
        try {
            return localStorage.getItem(NOTES_GENERATION_KEY) || fallbackNotesGeneration;
        } catch {
            notesGenerationStorageAvailable = false;
        }
    }
    return fallbackNotesGeneration;
}

function advanceNotesGeneration() {
    fallbackNotesGeneration = nanoid();
    if (notesGenerationStorageAvailable) {
        try {
            localStorage.setItem(NOTES_GENERATION_KEY, fallbackNotesGeneration);
        } catch {
            notesGenerationStorageAvailable = false;
        }
    }
    return fallbackNotesGeneration;
}

export const initializeDB = async () => {
    if (db) return db;
    dbPromise ??= openDB("Mintype", 5, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

                // Version 1: Initial stores
                if (oldVersion < 1) {
                    console.log("Setting up initial database schema...");

                    db.createObjectStore("workspacemeta", { keyPath: "id" });
                    db.createObjectStore("pagedata", { keyPath: "id" });
                    db.createObjectStore("syncqueue", { keyPath: "id" });
                }

                // Future versions can be added here
                if (oldVersion < 3) {
                    console.log("Adding rootId index to pagedata...");
                    const pageDataStore = transaction.objectStore("pagedata");
                    const metaStore = transaction.objectStore("workspacemeta");
                    pageDataStore.createIndex('id', 'id', { unique: false });
                    metaStore.createIndex('rootId', 'rootId', { unique: false })
                }

                // Deleted page IDs with their deletion time, so deletions sync instead of being
                // inferred from a page missing on Drive.
                if (oldVersion < 5) {
                    db.createObjectStore(TOMBSTONE_STORE, { keyPath: 'id' });
                }
            },
            blocked() {
                console.warn('Database upgrade is waiting for other Mintype tabs to close.');
            },
            // Lets a newer tab upgrade the database; this tab reopens it on its next access.
            blocking() {
                db?.close();
                db = null;
                dbPromise = null;
            },
        }).then((database) => {
            db = database;
            return database;
        }, (error) => {
            dbPromise = null;
            throw error;
        });
    return dbPromise;
};

const pageContentMutationQueues = new Map();

function withPageContentLock(pageId, operation) {
    const previous = pageContentMutationQueues.get(pageId) || Promise.resolve();
    const current = previous
        .catch(() => {})
        .then(() => {
            if (typeof navigator !== 'undefined' && navigator.locks?.request) {
                return navigator.locks.request(`mintype-page-content:${pageId}`, operation);
            }
            return operation();
        });

    pageContentMutationQueues.set(pageId, current);
    return current.finally(() => {
        if (pageContentMutationQueues.get(pageId) === current) {
            pageContentMutationQueues.delete(pageId);
        }
    });
}

// Writes content, its lastModified and its sync operation in one transaction, so a page is
// never changed without being queued for sync. `meta` creates the page's metadata with it, so
// a page never exists without its content.
async function writePageData(pageId, pageData, {
    expectedContentVersion,
    requireExisting = false,
    requireMetadata = false,
    updateLastModified = false,
    queueOperation = null,
    meta = null,
} = {}) {
    const stores = queueOperation ? ['pagedata', STORE_NAME, SYNC_QUEUE_STORE] : ['pagedata', STORE_NAME];
    const tx = db.transaction(stores, 'readwrite');
    const contentStore = tx.objectStore('pagedata');
    const metaStore = tx.objectStore(STORE_NAME);
    const currentPage = await contentStore.get(pageId);

    if ((requireExisting && !currentPage)
        || (expectedContentVersion !== undefined && currentPage?.iv !== expectedContentVersion)) {
        await tx.done;
        return false;
    }

    const currentMeta = await metaStore.get(pageId);
    if (requireMetadata && !currentMeta) {
        await tx.done;
        return false;
    }

    await contentStore.put({ id: pageId, ...pageData });
    if (meta) await metaStore.put(meta);
    if (updateLastModified && currentMeta) {
        currentMeta.lastModified = Date.now();
        await metaStore.put(currentMeta);
    }
    if (queueOperation) {
        await putOperation(tx.objectStore(SYNC_QUEUE_STORE), pageId, queueOperation);
    }
    await tx.done;
    return true;
}

async function mutatePageContent({
    pageId,
    masterKey,
    mutate,
    notFoundMessage,
    addToQueue = true,
    updateLastModified = true,
    notify = true,
}) {
    await initializeDB();
    return withPageContentLock(pageId, async () => {
        const page = await db.get('pagedata', pageId);
        if (!page) throw new Error(notFoundMessage || `Entry with id ${pageId} not found`);

        const content = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);
        const result = await mutate(content);
        if (result?.skipWrite) return result.value;

        const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(content));
        const didWrite = await writePageData(pageId, encrypted, {
            expectedContentVersion: page.iv,
            requireExisting: true,
            updateLastModified,
            queueOperation: addToQueue ? 'update' : null,
        });
        if (!didWrite) throw new Error('Page content changed before the update could be saved');
        if (notify) notifyUpdate();
        return result?.hasValue ? result.value : result;
    });
}

// Add a new  root entry
async function addRootEntry({ id, newContent, addToQueue = true, password }) {
    await initializeDB();

    const nano = nanoid()
    const newId = id || nano;
    const newEntry = {
        id: newId,
        rootId: newId,
        parentId: null,
        created: Date.now(),
        remoteFileId: null,
        lastModified: Date.now(),
        lastMetaModified: Date.now(),
        type: "workspace",
        ...newContent, // Spread newContent to include dynamic properties
    };

    const encrypted = await encryptDataWithMasterKey(password, JSON.stringify({
        background: getWorkspaceRandomImage() || null,
    }));
    await writePageData(newId, encrypted, {
        meta: newEntry,
        queueOperation: addToQueue ? 'create' : null,
    });
    notifyUpdate();
    return newId;
}

async function addMetaEntry({ id, newContent, addToQueue = true }) {
    await initializeDB();
    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    console.log(newContent)
    await db.put(STORE_NAME, { id: newId, ...newContent });
    if (addToQueue) {
        await addOperation(newId, 'create'); // Add to sync queue
    }
    notifyUpdate();
    return newId;
}

// Add a new entry
async function addEntry({ id, newContent, parentId, rootId, addToQueue = true, masterKey }) {
    await initializeDB();

    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    const newEntry = {
        id: newId,
        rootId,
        parentId,
        ...newContent, // Spread newContent to include dynamic properties
    };
    if (!isOrderKey(newEntry.order)) {
        const allEntries = await db.getAll(STORE_NAME);
        newEntry.order = orderKeyFor(allEntries.filter(e => e.parentId === parentId && !e.deleted));
    }
    // encrypt the note
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...newPageContentSchema(newContent.type),
    }));
    await writePageData(newId, encrypted, {
        meta: newEntry,
        queueOperation: addToQueue ? 'create' : null,
    });
    notifyUpdate();
    return newId;
}

async function addContentEntry({ id, newContent, addToQueue = true, masterKey }) {
    await initializeDB();
    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    // encrypt the note first
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(newContent));
    const didWrite = await writePageData(newId, encrypted, {
        requireMetadata: true,
        queueOperation: addToQueue ? 'create' : null,
    });
    if (!didWrite) throw new Error('Page was removed before its content could be saved');
    notifyUpdate();
    return newId;
}

// Writes an imported page's metadata and content in one transaction, then queues it for sync,
// so the queue never holds a page without content. Returns false without writing if notes were
// reset since the import started.
async function importPage({ meta, content, masterKey, expectedNotesGeneration }) {
    await initializeDB();
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(content));
    return withPageContentLock(meta.id, async () => {
        const tx = db.transaction([STORE_NAME, 'pagedata', SYNC_QUEUE_STORE], 'readwrite');
        if (expectedNotesGeneration !== undefined && getNotesGeneration() !== expectedNotesGeneration) {
            await tx.done;
            return false;
        }
        if (!isOrderKey(meta.order)) {
            const allEntries = await tx.objectStore(STORE_NAME).getAll();
            meta = { ...meta, order: orderKeyFor(allEntries.filter(e => e.parentId === meta.parentId && !e.deleted)) };
        }
        await Promise.all([
            tx.objectStore(STORE_NAME).put(meta),
            tx.objectStore('pagedata').put({ id: meta.id, ...encrypted }),
            putOperation(tx.objectStore(SYNC_QUEUE_STORE), meta.id, 'create'),
        ]);
        await tx.done;
        return true;
    });
}

// get all trashed files
async function getDeletedFiles() {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    return allEntries.filter(e => e.deleted === true);
}

// restore trashed file
// The restored entry goes to the end of its parent, since its old order belongs to its former siblings.
async function restoreTrashedFile(id) {
    await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allEntries = await store.getAll();
    const entry = allEntries.find(e => e.id === id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);
    entry.deleted = false;
    entry.order = orderKeyFor(allEntries.filter(e => e.parentId === entry.parentId && e.id !== id && !e.deleted));
    entry.lastMetaModified = Date.now();
    await store.put(entry);
    await tx.done;
    setMetadataModified();
    notifyUpdate();
}

// Get an entry by its ID
async function getEntry(id, password) {
    console.log("getting entry")
    await initializeDB();
    // get both the meta and content
    const pageData = await getContent(id, password);

    return (
        { ...(await db.get(STORE_NAME, id) || {}), ...(pageData || {}) }
    )
}

async function getMeta(id) {
    console.log("getting meta entry")
    await initializeDB();
    return db.get(STORE_NAME, id);
}

async function getContent(id, masterKey) {
    console.log("getting content entry")
    await initializeDB();
    const enc_content = await db.get('pagedata', id);
    // decrypt content
    const decrypted = await decryptDataWithMasterKey(masterKey, enc_content.iv, enc_content.ciphertext);

    return decrypted;
}

// The stored { iv, ciphertext } record, for exports that keep content encrypted.
async function getEncryptedContent(id) {
    await initializeDB();
    const page = await db.get('pagedata', id);
    return page ? { iv: page.iv, ciphertext: page.ciphertext } : null;
}

// get all quick notes
async function getAllQuickNotes() {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    return allEntries.filter(e => e.parentId === 'quickNote');
}

function setMetadataModified() {
    // in local storage, set a metadata modified to true
    const metadataModified = localStorage.getItem('metadataModified');
    if (metadataModified !== 'true') {
        console.log('Metadata modified, setting flag.');
        localStorage.setItem('metadataModified', 'true');
    }
}

// Update a specific field in an entry
async function updateMetaField({ id, fieldName, newValue, addToQueue = true, updateMeta = true, notify = true }) {
    console.log("updating meta entry")
    await initializeDB();
    console.log(id, fieldName, newValue);
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);
    entry[fieldName] = newValue;

    if (updateMeta) entry.lastMetaModified = Date.now();
    await db.put(STORE_NAME, entry);
    if (addToQueue) {
        setMetadataModified();
    }
    if (notify) {
        notifyUpdate(); // this causes encrypted page updates to fail, fix later.
    }
}

async function updateContentField({ id, fieldName, newValue, addToQueue = true, updateLastModified = true, masterKey }) {
    console.log('updating content entry');
    return mutatePageContent({
        pageId: id,
        masterKey,
        mutate: (content) => {
            content[fieldName] = newValue;
        },
        addToQueue,
        updateLastModified,
    });
}

async function updateTldrawSnapshot({ id, snapshot, masterKey }) {
    return mutatePageContent({
        pageId: id,
        masterKey,
        mutate: (content) => {
            content.tldraw = {
                formatVersion: TLDRAW_WHITEBOARD_FORMAT_VERSION,
                snapshot,
            };
        },
    });
}

// trash entry
async function trashEntry({ id, addToQueue = true }) {
    await initializeDB();
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);
    entry.deleted = true;
    entry.parentId = entry.rootId;
    entry.lastMetaModified = Date.now();
    await db.put(STORE_NAME, entry);

    // Children are trashed too and moved to the root, so each can be restored on its own.
    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);
    for (const child of childEntries) {
        await trashEntry({ id: child.id, addToQueue });
    }

    if (addToQueue) {
        setMetadataModified();
    }
    notifyUpdate();
}

// Delete an entry and its children recursively
async function deleteEntry({ id, addToQueue = true }) {
    await initializeDB();

    // Retrieve the entry to identify its children
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);

    // Recursively delete all children
    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);
    for (const child of childEntries) {
        await deleteEntry({ id: child.id, addToQueue });
    }

    await deleteQuickNotesByRootId(id, addToQueue);

    // The lock prevents an in-flight content mutation from recreating the deleted page data. The
    // tombstone and the Drive delete are written with the deletion so neither can be lost.
    await withPageContentLock(id, async () => {
        const stores = addToQueue
            ? [STORE_NAME, 'pagedata', TOMBSTONE_STORE, SYNC_QUEUE_STORE]
            : [STORE_NAME, 'pagedata'];
        const tx = db.transaction(stores, 'readwrite');
        const current = await tx.objectStore(STORE_NAME).get(id);
        await tx.objectStore(STORE_NAME).delete(id);
        await tx.objectStore('pagedata').delete(id);
        if (addToQueue) {
            await tx.objectStore(TOMBSTONE_STORE).put({ id, deletedAt: Date.now() });
            await putOperation(tx.objectStore(SYNC_QUEUE_STORE), id, 'delete', current?.remoteFileId || null);
        }
        await tx.done;
    });
    notifyUpdate();
}

// delete all quickNotes with a particular rootId
async function deleteQuickNotesByRootId(rootId, addToQueue = true) {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    const quickNotes = allEntries.filter(e => e.rootId === rootId && e.parentId === 'quickNote');
    for (const quickNote of quickNotes) {
        await deleteEntry({ id: quickNote.id, addToQueue });
    }
}

// Duplicate an entry and its children
async function duplicateEntry(id, newParentId) {
    await initializeDB();
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);

    const newId = nanoid();
    const newEntry = {
        ...entry,
        id: newId,
        parentId: newParentId, // Set new parent ID
    };
    entry.lastModified = Date.now();
    await db.put(STORE_NAME, newEntry);
    await addOperation(newId, 'create')

    // Duplicate children and maintain hierarchy
    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);

    for (const child of childEntries) {
        await duplicateEntry(child.id, newId); // Recursively duplicate children
    }

    notifyUpdate();

    return newId;
}

// Moves an entry under `newParentId`, directly before its sibling `beforeId`, or to the end of
// the parent when `beforeId` is null. A new `rootId` is applied to every descendant. Metadata is
// read and written in one transaction so the order key is computed from current siblings.
// Returns false without writing when the move is not allowed: a workspace itself, a page into
// itself or its descendants, sub-pages under a quick note, or a page with sub-pages into quick notes.
async function moveEntry(id, newParentId, rootId, beforeId = null) {
    await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const allEntries = await store.getAll();
    const byId = new Map(allEntries.map(e => [e.id, e]));
    const entry = byId.get(id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);

    const childrenOf = (parentId) => allEntries.filter(e => e.parentId === parentId);
    const refuse = async (reason) => {
        console.warn(`Cannot move entry ${id} to ${newParentId}: ${reason}`);
        await tx.done;
        return false;
    };

    if (entry.parentId === null) return refuse('workspaces cannot be moved');
    if (!newParentId) return refuse('missing parent');
    // Walks up from the new parent; `seen` stops on a cycle already present in synced data.
    const seen = new Set();
    for (let currentId = newParentId; currentId && byId.has(currentId) && !seen.has(currentId); currentId = byId.get(currentId).parentId) {
        if (currentId === id) return refuse('would create a circular reference');
        seen.add(currentId);
    }
    if (byId.get(newParentId)?.parentId === 'quickNote') return refuse('quick notes cannot contain sub-pages');
    if (newParentId === 'quickNote' && childrenOf(id).length > 0) return refuse('quick notes cannot contain sub-pages');

    const siblings = childrenOf(newParentId).filter(e => e.id !== id && !e.deleted);
    if (entry.parentId === newParentId && !entry.deleted && isOrderKey(entry.order)) {
        const current = sortByOrder([...siblings, entry]);
        const nextSibling = current[current.indexOf(entry) + 1];
        if (beforeId ? nextSibling?.id === beforeId : !nextSibling) {
            await tx.done;
            return true;
        }
    }

    const now = Date.now();
    entry.parentId = newParentId;
    entry.order = orderKeyFor(siblings, beforeId);
    entry.lastMetaModified = now;
    // Quick notes keep the workspace they belong to.
    if (rootId && newParentId !== 'quickNote' && entry.rootId !== rootId) {
        const moved = new Set();
        const stack = [entry];
        while (stack.length) {
            const current = stack.pop();
            if (moved.has(current.id)) continue;
            moved.add(current.id);
            current.rootId = rootId;
            current.lastMetaModified = now;
            if (current !== entry) await store.put(current);
            stack.push(...childrenOf(current.id));
        }
    }
    await store.put(entry);
    await tx.done;

    setMetadataModified();
    notifyUpdate();
    return true;
}

async function movePagesToWorkspace(id, newRootId) {
    return moveEntry(id, newRootId, newRootId);
}

// Get all entries for a given rootId
async function getAllEntriesByRoot(rootId) {
    await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('rootId');

    const results = [];
    let cursor = await index.openCursor(rootId);

    while (cursor) {
        results.push(cursor.value);
        cursor = await cursor.continue();
    }

    return results;
}

async function getAllContentByRoot(rootId) {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    const pageIds = allEntries
        .filter(entry => entry.rootId === rootId)
        .map(entry => entry.id);
    const allPages = await db.getAll('pagedata');
    const pages = allPages.filter(page => pageIds.includes(page.id));
    return pages;
}

// Get ALL entries
async function getAllEntries() {
    await initializeDB();
    return db.getAll(STORE_NAME);
}

// gell all content
async function getAllContent(masterKey) {
    await initializeDB();
    const allContent = await db.getAll('pagedata');
    // decrypt all the content and return it
    const decryptedContent = await Promise.all(allContent.map(async (content) => {
        const decrypted = await decryptDataWithMasterKey(masterKey, content.iv, content.ciphertext);
        return { id: content.id, ...decrypted };
    }));
    return decryptedContent;
}

// Get ALL root entries
async function getAllRootEntries(password) {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    // get only those with parentId = null
    const roots = allEntries.filter(e => e.parentId === null);
    // get content for each root
    const rootsWithContent = await Promise.all(roots.map(async (root) => {
        const enc_content = await db.get('pagedata', root.id);
        const decrypted_content = await decryptDataWithMasterKey(password, enc_content.iv, enc_content.ciphertext);
        return { ...root, ...decrypted_content };
    }));
    return rootsWithContent;
}

async function getAllRootMeta() {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);

    const roots = allEntries.filter(e => e.parentId === null);

    return roots;
}

export const updateDocumentMarkdown = async (pageId, markdown, masterKey) => {
    return mutatePageContent({
        pageId,
        masterKey,
        notFoundMessage: 'Page not found or invalid type',
        mutate: (content) => {
            content.markdown = markdown;
        },
    });
};

// wipe the sync queue
export const clearSyncQueue = async () => {
    await initializeDB();
    await db.clear("syncqueue");
    console.log("Sync queue cleared.");
};

// wipe the notes
export const clearNotes = async () => {
    advanceNotesGeneration();
    await initializeDB();
    const tx = db.transaction([STORE_NAME, 'pagedata', TOMBSTONE_STORE], 'readwrite');
    await Promise.all([
        tx.objectStore(STORE_NAME).clear(),
        tx.objectStore('pagedata').clear(),
        tx.objectStore(TOMBSTONE_STORE).clear(),
    ]);
    await tx.done;
    console.log("Notes cleared.");
};

// ---- Drive sync state ----
// `syncedModified` on an entry is the lastModified of the content last uploaded to or
// downloaded from Drive. It is local bookkeeping and never published.

const hasSameSyncClock = (entry, expected) => Boolean(entry && expected)
    && entry.lastModified === expected.lastModified
    && entry.lastMetaModified === expected.lastMetaModified;

const entrySyncTime = (entry) => Math.max(entry.lastModified || 0, entry.lastMetaModified || 0);

// One consistent read of everything a sync cycle reconciles.
async function getSyncState() {
    await initializeDB();
    const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE, SYNC_QUEUE_STORE], 'readonly');
    const [entries, tombstones, operations] = await Promise.all([
        tx.objectStore(STORE_NAME).getAll(),
        tx.objectStore(TOMBSTONE_STORE).getAll(),
        tx.objectStore(SYNC_QUEUE_STORE).getAll(),
    ]);
    await tx.done;
    return { entries, tombstones, operations };
}

async function putTombstones(tombstones) {
    await initializeDB();
    const tx = db.transaction(TOMBSTONE_STORE, 'readwrite');
    for (const { id, deletedAt } of tombstones) {
        const current = await tx.store.get(id);
        if (!current || current.deletedAt < deletedAt) await tx.store.put({ id, deletedAt });
    }
    await tx.done;
}

// Applies a newer entry from Drive, with its content when `record` is given. It is skipped if
// the local entry changed since `expected` was read (null means it must still be absent); that
// local change is newer and wins on the next sync.
async function applyRemoteEntry({ entry, record, expected, expectedNotesGeneration }) {
    await initializeDB();
    return withPageContentLock(entry.id, async () => {
        const tx = db.transaction([STORE_NAME, 'pagedata', TOMBSTONE_STORE, SYNC_QUEUE_STORE], 'readwrite');
        const metaStore = tx.objectStore(STORE_NAME);
        const current = await metaStore.get(entry.id);
        const tombstone = await tx.objectStore(TOMBSTONE_STORE).get(entry.id);
        const unchanged = expected
            ? hasSameSyncClock(current, expected)
            : !current && !(tombstone?.deletedAt >= entrySyncTime(entry));
        if (!unchanged || getNotesGeneration() !== expectedNotesGeneration) {
            await tx.done;
            return false;
        }

        const { syncedModified: _ignored, ...next } = entry;
        const syncedModified = record ? entry.lastModified : current?.syncedModified;
        if (syncedModified !== undefined) next.syncedModified = syncedModified;
        await metaStore.put(next);
        if (record) {
            await tx.objectStore('pagedata').put({ id: entry.id, iv: record.iv, ciphertext: record.ciphertext });
            // The queued upload holds the older local content that just lost.
            const queueStore = tx.objectStore(SYNC_QUEUE_STORE);
            const operation = await queueStore.get(entry.id);
            if (operation && operation.operation !== 'delete') await queueStore.delete(entry.id);
        }
        await tx.done;
        return true;
    });
}

// Applies a deletion made on another device, unless the local entry changed since `expected`.
async function applyRemoteDeletion({ id, deletedAt, expected, expectedNotesGeneration }) {
    await initializeDB();
    return withPageContentLock(id, async () => {
        const tx = db.transaction([STORE_NAME, 'pagedata', TOMBSTONE_STORE, SYNC_QUEUE_STORE], 'readwrite');
        const current = await tx.objectStore(STORE_NAME).get(id);
        if (!hasSameSyncClock(current, expected) || getNotesGeneration() !== expectedNotesGeneration) {
            await tx.done;
            return false;
        }
        await tx.objectStore(STORE_NAME).delete(id);
        await tx.objectStore('pagedata').delete(id);
        await tx.objectStore(SYNC_QUEUE_STORE).delete(id);
        const tombstoneStore = tx.objectStore(TOMBSTONE_STORE);
        const tombstone = await tombstoneStore.get(id);
        if (!tombstone || tombstone.deletedAt < deletedAt) await tombstoneStore.put({ id, deletedAt });
        await tx.done;
        return true;
    });
}

// The stored encrypted record with the metadata it was saved with, read together so the
// uploaded content and its lastModified always match.
async function getUploadRecord(id) {
    await initializeDB();
    const tx = db.transaction([STORE_NAME, 'pagedata'], 'readonly');
    const [meta, page] = await Promise.all([
        tx.objectStore(STORE_NAME).get(id),
        tx.objectStore('pagedata').get(id),
    ]);
    await tx.done;
    return meta && page ? { meta, record: { iv: page.iv, ciphertext: page.ciphertext } } : null;
}

// Records where a page's content now lives on Drive. Returns false if the page was deleted while
// it uploaded, so the caller can remove the file its delete operation did not know about.
async function recordUpload({ id, remoteFileId, syncedModified }) {
    await initializeDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const current = await tx.store.get(id);
    if (current && (current.remoteFileId !== remoteFileId || current.syncedModified !== syncedModified)) {
        await tx.store.put({ ...current, remoteFileId, syncedModified });
    }
    await tx.done;
    return Boolean(current);
}

// Forgets every Drive file reference and queues all pages for upload, for when sync moves to a
// different Drive folder (e.g. another Google account) that holds none of them.
async function resetSyncState() {
    await initializeDB();
    const tx = db.transaction([STORE_NAME, TOMBSTONE_STORE, SYNC_QUEUE_STORE], 'readwrite');
    const metaStore = tx.objectStore(STORE_NAME);
    const queueStore = tx.objectStore(SYNC_QUEUE_STORE);
    await Promise.all([queueStore.clear(), tx.objectStore(TOMBSTONE_STORE).clear()]);
    for (const entry of await metaStore.getAll()) {
        const { syncedModified: _ignored, ...next } = entry;
        await metaStore.put({ ...next, remoteFileId: null });
        await putOperation(queueStore, entry.id, 'create');
    }
    await tx.done;
}

// Export the service
const dbService = {
    initializeDB,
    addRootEntry,
    addMetaEntry,
    addEntry,
    addContentEntry,
    getContent,
    getEncryptedContent,
    getNotesGeneration,
    getMeta,
    moveEntry,
    movePagesToWorkspace,
    getEntry,
    updateMetaField,
    updateContentField,
    updateTldrawSnapshot,
    trashEntry,
    deleteEntry,
    duplicateEntry,
    getAllEntriesByRoot,
    getAllContentByRoot,
    getAllQuickNotes,
    getAllEntries,
    getAllRootEntries,
    getAllRootMeta,
    getAllContent,
    clearSyncQueue,
    clearNotes,
    setMetadataModified,
    getDeletedFiles,
    restoreTrashedFile,
    notifyUpdate,
    importPage,
    updateDocumentMarkdown,
    getSyncState,
    putTombstones,
    applyRemoteEntry,
    applyRemoteDeletion,
    getUploadRecord,
    recordUpload,
    resetSyncState,
};

export default dbService;
