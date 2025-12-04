import dbService from './dbService';

let db; // This will hold our initialized database instance

export const initializeDB = async () => {
    const database = await dbService.initializeDB();
    db = database;
};

export const addOperation = async (fileId, operationType, remoteFileId = null) => {
    if(!db) await initializeDB();

    // Get all operations and filter by fileId
    const tx = db.transaction("syncqueue", "readwrite");
    const store = tx.objectStore("syncqueue");
    const allOps = await store.getAll();

    // Find existing operations for this file
    const existingOps = allOps.filter(op => op.fileId === fileId);

    // Sort by timestamp
    existingOps.sort((a, b) => a.timestamp - b.timestamp);

    // Create the new operation
    const newOp = {
        id: fileId,
        fileId,
        operation: operationType,
        remoteFileId: remoteFileId, // to be filled when the operation is executed
        timestamp: Date.now()
    };

    // Remove all existing operations for this file
    for (const op of existingOps) {
        await store.delete(op.id);
    }

    // Add the new operation to the store
    await store.add(newOp);
    console.log(`Added operation ${operationType} for file ${fileId} to sync queue`);
    dbService.setMetadataModified(); // Update lastMetadataModified timestamp

    await tx.complete;
};

export async function deleteOperation(operationId) {
    if(!db) await initializeDB();
    return db.delete("syncqueue", operationId);
}

export async function getAllOperations() {
    if(!db) await initializeDB();
    return db.getAll("syncqueue");
}

// Export the service
const syncService = {
    initializeDB,
    addOperation,
    deleteOperation,
    getAllOperations
};

export default syncService;
