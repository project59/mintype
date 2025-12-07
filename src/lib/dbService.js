import { openDB } from 'idb';
import { nanoid } from 'nanoid';
import { addOperation } from './syncService';
import { newPageContentSchema, newPageSchema } from '../utils/constants.js';
import { getWorkspaceRandomImage } from "../utils/assets.js";
import { decryptDataWithMasterKey, encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';

const broadcastChannel = new BroadcastChannel('db-updates');

const notifyUpdate = () => {
    broadcastChannel.postMessage({ type: 'update' });
};

const STORE_NAME = 'workspacemeta';
const HISTORY_STORE_NAME = 'history';
const MAX_HISTORY_SIZE = 20;
let db; // This will hold our initialized database instance

export const initializeDB = async () => {
    if (!db) {
        db = await openDB("Mintype", 3, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

                // Version 1: Initial stores
                if (oldVersion < 1) {
                    console.log("Setting up initial database schema...");

                    db.createObjectStore("workspacemeta", { keyPath: "id" });
                    db.createObjectStore("pagedata", { keyPath: "id" });
                    db.createObjectStore("syncqueue", { keyPath: "id" });
                    db.createObjectStore("history", { keyPath: "pageId" });

                    const searchStore = db.createObjectStore("searchIndex", { keyPath: "id" });
                    searchStore.createIndex('content', 'content');
                    searchStore.createIndex('pageId', 'pageId');
                    searchStore.createIndex('rootId', 'rootId');
                    searchStore.createIndex('type', 'type');
                    searchStore.createIndex('compound', ['rootId', 'pageId']);

                }

                // Future versions can be added here
                if (oldVersion < 3) {
                    console.log("Adding rootId index to pagedata...");
                    const pageDataStore = transaction.objectStore("pagedata");
                    const metaStore = transaction.objectStore("workspacemeta");
                    pageDataStore.createIndex('id', 'id', { unique: false });
                    metaStore.createIndex('rootId', 'rootId', { unique: false })
                }
            }
        });
        console.log("Database initialized.");
        return db;
    } else {
        // console.log("Database already initialized.");
        return db;
    }
};

// Save history state
async function saveHistoryState(pageId, action, masterKey) {
    console.log('history saving');
    try {
        await initializeDB();
        // we can get the raw encrypted content from pagedata
        const currentPage = await db.get('pagedata', pageId);
        if (!currentPage) {
            throw new Error("Page not found");
        }

        // Get existing history or create new
        let historyRecord = await db.get(HISTORY_STORE_NAME, pageId);
        if (!historyRecord) {
            historyRecord = {
                pageId,
                undoStack: [],
                redoStack: []
            };
        }

        // Save the CURRENT state before changes are made
        const snapshot = {
            page: currentPage,
            action,
            timestamp: Date.now()
        };

        historyRecord.undoStack.push(snapshot);
        historyRecord.redoStack = []; // Clear redo when new action occurs

        // Maintain max history size
        if (historyRecord.undoStack.length > MAX_HISTORY_SIZE) {
            historyRecord.undoStack = historyRecord.undoStack.slice(-MAX_HISTORY_SIZE);
        }

        await db.put(HISTORY_STORE_NAME, historyRecord);
    } catch (error) {
        console.error('Failed to save history state:', error);
    }
}

// Get undo state and apply it
async function getUndoState(pageId, masterKey) {
    try {
        await initializeDB();
        const historyRecord = await db.get(HISTORY_STORE_NAME, pageId);

        if (!historyRecord || historyRecord.undoStack.length === 0) {
            return null;
        }

        // Get current page state for redo stack
        const currentPage = await db.get('pagedata', pageId);
        if (!currentPage) {
            throw new Error("Page not found");
        }

        // Move current state to redo stack
        const currentSnapshot = {
            page: currentPage,
            action: 'current_state',
            timestamp: Date.now()
        };
        historyRecord.redoStack.push(currentSnapshot);

        // Get and remove the last undo state
        const undoSnapshot = historyRecord.undoStack.pop();

        await db.put('pagedata', { id: pageId, ...undoSnapshot.page });
        await addOperation(pageId, 'update');
        await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });

        // Update history record
        await db.put(HISTORY_STORE_NAME, historyRecord);

        return undoSnapshot;
    } catch (error) {
        console.error('No undo state');
        return null;
    }
}

// Get redo state and apply it
async function getRedoState(pageId, masterKey) {
    try {
        await initializeDB();
        const historyRecord = await db.get(HISTORY_STORE_NAME, pageId);

        if (!historyRecord || historyRecord.redoStack.length === 0) {
            return null;
        }

        // Get current page state for undo stack
        const currentPage = await db.get('pagedata', pageId);
        if (!currentPage) {
            throw new Error("Page not found");
        }

        // Move current state to undo stack
        const currentSnapshot = {
            page: JSON.parse(JSON.stringify(currentPage)),
            action: 'current_state',
            timestamp: Date.now()
        };
        historyRecord.undoStack.push(currentSnapshot);

        // Get and remove the last redo state
        const redoSnapshot = historyRecord.redoStack.pop();

        await db.put('pagedata', { id: pageId, ...redoSnapshot.page });
        await addOperation(pageId, 'update');
        await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });

        // Update history record
        await db.put(HISTORY_STORE_NAME, historyRecord);

        return redoSnapshot;
    } catch (error) {
        console.error('Failed to get redo state:', error);
        return null;
    }
}

// Clear history for a page
async function clearPageHistory() {
    try {
        await initializeDB();
        // remove ALL entries inside history
        await db.clear(HISTORY_STORE_NAME);
    } catch (error) {
        console.error('Failed to clear page history:', error);
    }
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
        wikiId: null,
        lastModified: Date.now(),
        lastMetaModified: Date.now(),
        type: "workspace",
        ...newContent, // Spread newContent to include dynamic properties
    };
    await db.put(STORE_NAME, newEntry);

    const encrypted = await encryptDataWithMasterKey(password, JSON.stringify({
        background: getWorkspaceRandomImage() || null,
    }));
    await db.put('pagedata', { id: newId, ...encrypted });

    if (addToQueue) {
        await addOperation(newId, 'create'); // Add to sync queue
    }
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
async function addEntry({ id, newContent, parentId, rootId, addToQueue = true, preloadedData, masterKey }) {
    await initializeDB();

    if (preloadedData) {
        console.log('preloaded')
        const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(preloadedData));
        console.log('encrypt success')

        await db.put('pagedata', { id: id, ...encrypted });
        console.log('put success')

        if (addToQueue) {
            await addOperation(preloadedData.id, 'create'); // Add to sync queue
        }
        notifyUpdate();
        return preloadedData.id;
    }

    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    const newEntry = {
        id: newId,
        rootId,
        parentId,
        ...newContent, // Spread newContent to include dynamic properties
    };
    await db.put(STORE_NAME, newEntry);
    // encrypt the note
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...newPageContentSchema(newContent.type),
    }));
    await db.put('pagedata', {
        id: newId,
        ...encrypted
    });
    if (addToQueue) {
        await addOperation(newId, 'create'); // Add to sync queue
    }
    notifyUpdate();
    return newId;
}

async function addNotionEntry({ id, name, emoji, pageContent, parentId, rootId, masterKey }) {
    await initializeDB();

    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    const newEntry = {
        id: newId,
        rootId,
        parentId,
        emoji,
        ...newPageSchema('document', null, name), // Spread newContent to include dynamic properties
    };
    await db.put(STORE_NAME, newEntry);


    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...pageContent,
    }));
    await db.put('pagedata', {
        id: newId,
        ...encrypted
    });

    await addOperation(newId, 'create'); // Add to sync queue
    notifyUpdate();
    return newId;
}

async function addContentEntry({ id, newContent, addToQueue = true, masterKey }) {
    await initializeDB();
    // if id is not null use it, otherwise generate a new one
    const newId = id || nanoid();
    // encrypt the note first
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(newContent));
    await db.put('pagedata', { id: newId, ...encrypted });
    if (addToQueue) {
        await addOperation(newId, 'create'); // Add to sync queue
    }
    notifyUpdate();
    return newId;
}

// update an entry, given the whole object is pulled from the server
async function updateMetaEntry(id, newContent) {
    await initializeDB();
    // delete the old entry
    await db.delete(STORE_NAME, id);
    // add the new entry
    await db.put(STORE_NAME, newContent);
    notifyUpdate();
}

// get all trashed files
async function getDeletedFiles() {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    return allEntries.filter(e => e.deleted === true);
}

// restore trashed file
async function restoreTrashedFile(id, rootId) {
    await initializeDB();
    const entry = await db.get(STORE_NAME, id);
    entry.deleted = false;
    // entry.rootId = rootId;
    // entry.parentId = rootId;
    await db.put(STORE_NAME, entry);
    setMetadataModified();
    notifyUpdate();
}

async function getSiblings(id) {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    return allEntries.filter(e => e.parentId === id);
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
    console.log("updating content entry")
    await initializeDB();
    const entry = await db.get('pagedata', id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);

    // decrypt first
    const decrypted = await decryptDataWithMasterKey(masterKey, entry.iv, entry.ciphertext);
    decrypted[fieldName] = newValue;

    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify(decrypted));
    await db.put('pagedata', { id, ...encrypted });

    const metaEntry = await db.get(STORE_NAME, id);
    if (updateLastModified) metaEntry.lastModified = Date.now();
    await db.put(STORE_NAME, metaEntry);

    if (addToQueue) {
        await addOperation(id, 'update'); // Add to sync queue
    }
    notifyUpdate();
}

// trash entry
async function trashEntry({ id, addToQueue = true }) {
    await initializeDB();
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);
    entry.deleted = true;
    entry.parentId = entry.rootId;
    await db.put(STORE_NAME, entry);

    // we also want to recursively trash all its children too, and set their parent id and root id as the same (for easy restore)
    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);
    for (const child of childEntries) {
        child.parentId = child.rootId;
        await db.put(STORE_NAME, child);
        await trashEntry({ id: child.id });
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
    const remoteFileId = entry.remoteFileId || null;

    // Recursively delete all children
    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);
    for (const child of childEntries) {
        await deleteEntry({ id: child.id }); // Recursively delete children
    }

    // Delete the current entry
    await db.delete(STORE_NAME, id);
    await db.delete('pagedata', id);
    if (addToQueue) {
        await addOperation(id, 'delete', remoteFileId); // Add to sync queue
    }
    notifyUpdate();
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

async function moveEntry(id, newParentId, rootId) {
    await initializeDB();
    const entry = await db.get(STORE_NAME, id);
    if (!entry) throw new Error(`Entry with id ${id} not found`);

    // Check if newParentId is a descendant of the entry being moved
    if (newParentId && await isDescendant(id, newParentId)) {
        console.warn(`Cannot move entry ${id} to ${newParentId}: would create circular reference`);
        return; // Do nothing
    }

    // when moving from quick notes to a workspace, a rootId is required
    if (rootId) {
        entry.rootId = rootId;
    }
    entry.parentId = newParentId; // Update parent ID

    // update lastModified timestamp
    entry.lastMetaModified = Date.now();

    await db.put(STORE_NAME, entry);
    setMetadataModified();
    notifyUpdate();
}

async function movePagesToWorkspace(id, newParentId, newRootId) {
    // move this entry to the new root, and also its children too, maintaining their structure.
    await moveEntry(id, newParentId, newRootId);

    const allEntries = await db.getAll(STORE_NAME);
    const childEntries = allEntries.filter(e => e.parentId === id);

    for (const child of childEntries) {
        await movePagesToWorkspace(child.id, id, newRootId);
    }
}

// Helper function to check if targetId is a descendant of ancestorId
async function isDescendant(ancestorId, targetId) {
    let currentId = targetId;

    while (currentId) {
        if (currentId === ancestorId) {
            return true; // Found circular reference
        }

        const currentEntry = await db.get(STORE_NAME, currentId);
        if (!currentEntry) break;

        currentId = currentEntry.parentId;
    }

    return false;
}

// helpder function to check if a targetId has a child
async function hasChild(targetId) {
    const allEntries = await db.getAll(STORE_NAME);
    console.log(allEntries.filter(e => e.parentId === targetId))
    return allEntries.filter(e => e.parentId === targetId).length > 0;
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
    console.log(pages);
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
    console.log(decryptedContent)
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

// change the rootId of all of a particular roots pages
async function updateWikiId(rootId, wikiId) {
    await initializeDB();
    const allEntries = await db.getAll(STORE_NAME);
    for (const entry of allEntries) {
        if (entry.rootId === rootId) {
            entry.wikiId = wikiId;
            await db.put(STORE_NAME, entry);
        }
    }
}


export const updateElement = async (pageId, updatedElement, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    const elements = decrypted.elements;
    const elementIndex = elements.findIndex(el => el.id === updatedElement.id);
    if (elementIndex !== -1) {
        elements[elementIndex] = updatedElement;
        console.log(`Element ${updatedElement.id} updated in page ${pageId}.`);
    } else {
        elements.push(updatedElement);
        console.log(`New element ${updatedElement.id} added to page ${pageId}.`);
    }
    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        elements: elements
    }));
    await db.put('pagedata', { id: pageId, ...encrypted });

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
};

export const deleteElement = async (pageId, elementId, elementIds, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    const elements = decrypted.elements;

    if (elementIds && elementIds.length > 0) {
        const updatedElements = elements.filter(el => !elementIds.includes(el.id));
        console.log(`Elements ${elementIds.join(', ')} deleted from page ${pageId}.`);
        // encrypt again
        const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
            ...decrypted,
            elements: updatedElements
        }));

        await db.put('pagedata', { id: pageId, ...encrypted });
    } else {
        const updatedElements = elements.filter(el => el.id !== elementId);
        if (updatedElements.length === elements.length) {
            console.log(`Element ${elementId} not found in page ${pageId}.`);
            return;
        }
        console.log(`Element ${elementId} deleted from page ${pageId}.`);
        // encrypt again
        const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
            ...decrypted,
            elements: updatedElements
        }));

        await db.put('pagedata', { id: pageId, ...encrypted });
    }

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
    console.log(`Element ${elementId} deleted from page ${pageId}.`);
};

// get all comments for a page
export const getAllComments = async (pageId, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    // decrypt content
    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }
    return decrypted.comments;
}

// edit a comment
export const updateComment = async (pageId, updatedComment, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }
    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);
    const commentIndex = decrypted.comments.findIndex(comment => comment.id === updatedComment.id);

    if (commentIndex !== -1) {
        // Update existing comment
        decrypted.comments[commentIndex] = updatedComment;
        console.log(`Comment ${updatedComment.id} updated in page ${pageId}.`);
    } else {
        // Add new comment
        decrypted.comments.push(updatedComment);
        console.log(`New comment ${updatedComment.id} added to page ${pageId}.`);
    }

    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: decrypted.comments
    }));
    await addOperation(pageId, 'update')

    // Save the updated page back to the database
    await db.put('pagedata', { id: pageId, ...encrypted });
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
};

// delete comment
export const deleteComment = async (pageId, commentId, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);

    if (!page) {
        throw new Error("Page not found or invalid type");
    }
    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    // Filter out the comment to be deleted
    const updatedComments = decrypted.comments.filter(comment => comment.id !== commentId);

    if (updatedComments.length === decrypted.comments.length) {
        console.log(`Comment ${commentId} not found in page ${pageId}.`);
        return; // No comment was deleted
    }

    decrypted.comments = updatedComments;
    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: updatedComments
    }));
    await addOperation(pageId, 'update')

    // Save the updated page back to the database
    await db.put('pagedata', { id: pageId, ...encrypted });
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });

    console.log(`Comment ${commentId} deleted from page ${pageId}.`);
};

// Add a reply to a comment thread
export const addReplyToComment = async (pageId, commentId, reply, name, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    const commentIndex = decrypted.comments.findIndex(comment => comment.id === commentId);
    if (commentIndex === -1) {
        throw new Error("Comment not found");
    }

    // Add reply to the thread
    const newId = nanoid();
    const newReply = {
        id: newId,
        author: name || 'anonymous', // Replace with actual user
        content: reply,
        createdAt: Date.now(),
        editedAt: null,
        reactions: {}
    };

    decrypted.comments[commentIndex].thread.push(newReply);
    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: decrypted.comments
    }));
    await db.put('pagedata', { id: pageId, ...encrypted });

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
    return newReply;
};

// Edit a specific thread item
export const editThreadItem = async (pageId, commentId, threadIndex, newContent, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    console.log("editThreadItem", pageId, commentId, threadIndex, newContent);

    const commentIndex = decrypted.comments.findIndex(comment => comment.id === commentId);
    if (commentIndex === -1 || !decrypted.comments[commentIndex].thread[threadIndex]) {
        throw new Error("Comment or thread item not found");
    }

    decrypted.comments[commentIndex].thread[threadIndex].content = newContent;
    decrypted.comments[commentIndex].thread[threadIndex].editedAt = Date.now();
    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: decrypted.comments
    }));
    await db.put('pagedata', { id: pageId, ...encrypted });

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });

};

// Delete a specific thread item
export const deleteThreadItem = async (pageId, commentId, threadIndex, masterKey) => {
    await initializeDB();
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    const commentIndex = decrypted.comments.findIndex(comment => comment.id === commentId);
    if (commentIndex === -1) {
        throw new Error("Comment not found");
    }

    // Don't allow deleting the main comment (index 0)
    if (threadIndex === 0) {
        throw new Error("Cannot delete main comment thread item");
    }

    decrypted.comments[commentIndex].thread.splice(threadIndex, 1);
    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: decrypted.comments
    }));
    await db.put('pagedata', { id: pageId, ...encrypted });

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
};

// Add this to your dbService.js
export const getComment = async (pageId, commentId, masterKey) => {
    console.log("getComment", pageId, commentId);
    try {
        const comments = await getAllComments(pageId, masterKey);
        return comments.find(comment => comment.id === commentId);
    } catch (error) {
        console.error('Error fetching single comment:', error);
        throw error;
    }
};

// Add or increment reaction
export const addReaction = async (pageId, commentId, threadIndex, reactionType, masterKey) => {
    await initializeDB();
    console.log("addReaction", pageId, commentId, threadIndex, reactionType);
    const page = await db.get('pagedata', pageId);
    if (!page) {
        throw new Error("Page not found or invalid type");
    }

    const decrypted = await decryptDataWithMasterKey(masterKey, page.iv, page.ciphertext);

    const commentIndex = decrypted.comments.findIndex(comment => comment.id === commentId);
    console.log(decrypted.comments[commentIndex].thread[threadIndex])
    if (commentIndex === -1 || !decrypted.comments[commentIndex].thread[threadIndex]) {
        throw new Error("Comment or thread item not found");
    }

    const threadItem = decrypted.comments[commentIndex].thread[threadIndex];
    if (!threadItem.reactions) {
        threadItem.reactions = {};
    }

    // Increment reaction count
    threadItem.reactions[reactionType] = (threadItem.reactions[reactionType] || 0) + 1;

    // encrypt again
    const encrypted = await encryptDataWithMasterKey(masterKey, JSON.stringify({
        ...decrypted,
        comments: decrypted.comments
    }));
    await db.put('pagedata', { id: pageId, ...encrypted });

    await addOperation(pageId, 'update');
    await updateMetaField({ id: pageId, fieldName: 'lastModified', newValue: Date.now(), updateMeta: false, notify: false });
};

// wipe the sync queue
export const clearSyncQueue = async () => {
    await initializeDB();
    await db.clear("syncqueue");
    console.log("Sync queue cleared.");
};

// wipe the notes
export const clearNotes = async () => {
    await initializeDB();
    await db.clear("workspacemeta");
    await db.clear("pagedata");
    console.log("Notes cleared.");
};

export const addDummyPage = async () => {
    await initializeDB();
    const newId = nanoid();
    const newEntry = {
        id: newId,
        rootId: 'BgpijvEwTpnvotX8DhAeF',
        parentId: 'BgpijvEwTpnvotX8DhAeF',
        created: Date.now(),
        lastModified: Date.now(),
        lastMetaModified: Date.now(),
        type: "document",
        emoji: null,
        isFavorite: false,
        order: 0,
        deleted: false,
        encrypted: false,
        remoteFileId: null,
        wikiId: null,
        name: "Dummy Page",
    };
    await db.put(STORE_NAME, newEntry);
    await db.put('pagedata', {
        id: newId,
        iv: "gYq+yty+w6Sy8LTj",
        ciphertext: "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"
    });
    console.log("Dummy page added.");
}

// Export the service
const dbService = {
    initializeDB,
    addRootEntry,
    addMetaEntry,
    addEntry,
    addContentEntry,
    getContent,
    getMeta,
    updateMetaEntry,
    moveEntry,
    movePagesToWorkspace,
    getEntry,
    updateMetaField,
    updateContentField,
    hasChild,
    getSiblings,
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
    updateWikiId,
    updateElement,
    deleteElement,
    getAllComments,
    getComment,
    updateComment,
    deleteComment,
    addReaction,
    deleteThreadItem,
    editThreadItem,
    clearSyncQueue,
    clearNotes,
    saveHistoryState,
    getUndoState,
    getRedoState,
    clearPageHistory,
    setMetadataModified,
    getDeletedFiles,
    restoreTrashedFile,
    notifyUpdate,
    addDummyPage,
    addNotionEntry
};

export default dbService;
