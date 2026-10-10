import { nanoid } from 'nanoid';
import dbService from './dbService';

export const SYNC_QUEUE_STORE = 'syncqueue';

// Each file has at most one queued operation, keyed by its ID: the newest operation describes
// everything Drive still needs. `rev` identifies this particular operation so completing an
// older one never removes its replacement.
export function putOperation(store, fileId, operation, remoteFileId = null) {
    return store.put({
        id: fileId,
        fileId,
        operation,
        remoteFileId,
        rev: nanoid(),
        timestamp: Date.now(),
    });
}

export async function addOperation(fileId, operation, remoteFileId = null) {
    const db = await dbService.initializeDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    await putOperation(tx.store, fileId, operation, remoteFileId);
    await tx.done;
}

// Used by sync repairs, which must not replace an operation the user queued in the meantime.
export async function addOperationIfAbsent(fileId, operation) {
    const db = await dbService.initializeDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    if (!await tx.store.get(fileId)) await putOperation(tx.store, fileId, operation);
    await tx.done;
}

// Removes an executed operation unless it was replaced while it ran (e.g. an edit made during
// its upload), in which case the replacement stays queued.
export async function completeOperation(operation) {
    const db = await dbService.initializeDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const current = await tx.store.get(operation.id);
    if (current?.rev === operation.rev) {
        await tx.store.delete(operation.id);
    }
    await tx.done;
}

export async function getAllOperations() {
    const db = await dbService.initializeDB();
    return db.getAll(SYNC_QUEUE_STORE);
}

// Returns whether metadata changed locally since the last call, and clears the flag. A sync
// that fails afterwards sets it again.
export function consumeMetadataModified() {
    const modified = localStorage.getItem('metadataModified') === 'true';
    if (modified) localStorage.setItem('metadataModified', 'false');
    return modified;
}

const syncService = {
    addOperation,
    addOperationIfAbsent,
    completeOperation,
    getAllOperations,
    consumeMetadataModified,
};

export default syncService;
