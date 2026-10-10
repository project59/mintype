import dbService from './dbService';
import syncService from './syncService';
import { isDriveNotFound } from './driveErrors';
import { decryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';

// Drive sync. Every cycle reads the remote metadata file, merges it with local state, downloads
// and uploads page content, and writes the merged metadata back; nothing is pushed without
// first reading what is on Drive.
//
// Conflicts resolve without user input, newest change wins:
// - metadata (name, parent, order, trash...) by `lastMetaModified`;
// - content by `lastModified`, and `remoteFileId` travels with the winning content;
// - permanent deletions are tombstones `{ [id]: deletedAt }` in the metadata file. A deletion
//   wins over an entry unless the entry changed after it. A page missing from the metadata
//   file is never treated as deleted.

const CONCURRENCY = 4;

const entryTime = (entry) => Math.max(entry.lastModified, entry.lastMetaModified);

const withoutLocalFields = ({ syncedModified: _ignored, ...entry }) => entry;

function mergeEntries(local, remote) {
    const metaSource = remote.lastMetaModified > local.lastMetaModified ? remote : local;
    const remoteContentNewer = remote.lastModified > local.lastModified;
    return {
        ...withoutLocalFields(metaSource),
        lastModified: remoteContentNewer ? remote.lastModified : local.lastModified,
        remoteFileId: remoteContentNewer ? remote.remoteFileId : (local.remoteFileId || remote.remoteFileId),
    };
}

const sortedObject = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const stableStringify = (value) => JSON.stringify(value, (_key, item) => (
    item && typeof item === 'object' && !Array.isArray(item) ? sortedObject(item) : item
));
const sameRemoteMeta = (a, b) => stableStringify({ entries: [...a.entries].sort((x, y) => (x.id < y.id ? -1 : 1)), tombstones: a.tombstones })
    === stableStringify({ entries: [...b.entries].sort((x, y) => (x.id < y.id ? -1 : 1)), tombstones: b.tombstones });

async function forEachLimited(items, limit, task) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) await task(items[next++]);
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Decides what the merged remote metadata does locally. Only reads; nothing is applied here.
function planPull({ local, remote, tombstones }) {
    const remoteById = new Map(remote.entries.map((entry) => [entry.id, entry]));
    const operations = new Map(local.operations.map((operation) => [operation.fileId, operation]));
    const isDeleted = (entry) => tombstones.get(entry.id) >= entryTime(entry);
    const plan = { deletions: [], metaUpdates: [], downloads: [], missingOperations: [] };

    for (const entry of local.entries) {
        const remoteEntry = remoteById.get(entry.id);
        const deletedAt = tombstones.get(entry.id);
        const remoteAlive = remoteEntry && !isDeleted(remoteEntry);

        if (deletedAt >= Math.max(entryTime(entry), remoteEntry ? entryTime(remoteEntry) : 0)) {
            plan.deletions.push({ id: entry.id, deletedAt, expected: entry });
            continue;
        }

        const contentOnDrive = entry.remoteFileId && entry.syncedModified === entry.lastModified;
        if (!remoteAlive) {
            // Only here, or changed after a deletion elsewhere removed its Drive file.
            if (!operations.has(entry.id) && (!contentOnDrive || deletedAt !== undefined)) {
                plan.missingOperations.push([entry.id, entry.remoteFileId ? 'update' : 'create']);
            }
            continue;
        }

        const merged = mergeEntries(entry, remoteEntry);
        if (remoteEntry.lastModified > entry.lastModified) {
            plan.downloads.push({ entry: merged, expected: entry });
            continue;
        }
        if (remoteEntry.lastMetaModified > entry.lastMetaModified) {
            plan.metaUpdates.push({ entry: merged, expected: entry });
        }
        if (entry.lastModified > remoteEntry.lastModified && !contentOnDrive && !operations.has(entry.id)) {
            plan.missingOperations.push([entry.id, 'update']);
        }
    }

    const localIds = new Set(local.entries.map((entry) => entry.id));
    for (const remoteEntry of remote.entries) {
        if (localIds.has(remoteEntry.id) || isDeleted(remoteEntry)) continue;
        plan.downloads.push({ entry: remoteEntry, expected: null });
    }
    return plan;
}

// The metadata file to publish: remote entries merged with every local entry whose content is on
// Drive. Each local entry is published with the lastModified of the content it uploaded or
// downloaded (`syncedModified`), so other devices never record content as newer than what they
// downloaded. Until it has one, any remote entry for it is kept as is.
function buildRemoteMeta({ remote, local, tombstones, deadRemoteFiles }) {
    const merged = new Map();
    for (const entry of remote.entries) {
        if (!deadRemoteFiles.has(entry.remoteFileId)) merged.set(entry.id, entry);
    }
    for (const entry of local.entries) {
        if (!entry.remoteFileId || entry.syncedModified === undefined) continue;
        const uploaded = { ...withoutLocalFields(entry), lastModified: entry.syncedModified };
        const remoteEntry = merged.get(entry.id);
        merged.set(entry.id, remoteEntry ? mergeEntries(uploaded, remoteEntry) : uploaded);
    }
    return {
        name: 'mintype-data',
        type: 'appdata',
        entries: [...merged.values()].filter((entry) => !(tombstones.get(entry.id) >= entryTime(entry))),
        tombstones: Object.fromEntries(tombstones),
    };
}

async function executeOperation(drive, operation) {
    if (operation.operation === 'delete') {
        if (operation.remoteFileId) await drive.deleteFile(operation.remoteFileId);
        await syncService.completeOperation(operation);
        return;
    }

    const page = await dbService.getUploadRecord(operation.fileId);
    if (!page) {
        // Deleted, or metadata without content: there is nothing to upload.
        await syncService.completeOperation(operation);
        return;
    }

    const { meta, record } = page;
    let remoteFileId = meta.remoteFileId;
    if (remoteFileId) {
        try {
            await drive.updateFile(remoteFileId, meta, record);
        } catch (error) {
            // Deleted on Drive (e.g. by another device before this edit won): upload it anew.
            if (!isDriveNotFound(error)) throw error;
            remoteFileId = null;
        }
    }
    if (!remoteFileId) remoteFileId = await drive.createFile(meta, record);

    if (!await dbService.recordUpload({ id: meta.id, remoteFileId, syncedModified: meta.lastModified })) {
        await drive.deleteFile(remoteFileId);
    }
    await syncService.completeOperation(operation);
}

/**
 * Runs one sync cycle. `cache` holds the last seen metadata file version and contents, so an
 * idle cycle costs one small request.
 */
export async function runSyncCycle({
    drive,
    masterKey,
    cache,
    force = false,
    isCancelled = () => false,
    onPhase,
    onProgress,
}) {
    const metadataModified = syncService.consumeMetadataModified();
    let result = null;
    try {
        result = await syncCycle({ drive, masterKey, cache, force: force || metadataModified, isCancelled, onPhase, onProgress });
        return result;
    } finally {
        if (!result && metadataModified) dbService.setMetadataModified();
    }
}

async function syncCycle({ drive, masterKey, cache, force, isCancelled, onPhase, onProgress }) {
    const notesGeneration = dbService.getNotesGeneration();
    const version = await drive.getMetaVersion();
    let local = await dbService.getSyncState();
    const remoteUnchanged = cache.version !== undefined && cache.version === version;
    if (!force && remoteUnchanged && local.operations.length === 0) return { skipped: true };

    // ---- Pull ----
    onPhase?.('pull');
    const remote = remoteUnchanged ? cache.meta : await drive.readMeta();
    if (isCancelled()) return null;

    const tombstones = new Map(local.tombstones.map(({ id, deletedAt }) => [id, deletedAt]));
    const newTombstones = Object.entries(remote.tombstones)
        .filter(([id, deletedAt]) => !(tombstones.get(id) >= deletedAt))
        .map(([id, deletedAt]) => ({ id, deletedAt }));
    newTombstones.forEach(({ id, deletedAt }) => tombstones.set(id, deletedAt));
    if (newTombstones.length) await dbService.putTombstones(newTombstones);

    const plan = planPull({ local, remote, tombstones });
    const changedIds = new Set();
    const deadRemoteFiles = new Set();
    let failed = 0;

    for (const deletion of plan.deletions) {
        if (await dbService.applyRemoteDeletion({ ...deletion, expectedNotesGeneration: notesGeneration })) {
            changedIds.add(deletion.id);
        }
    }
    for (const update of plan.metaUpdates) {
        if (await dbService.applyRemoteEntry({ ...update, expectedNotesGeneration: notesGeneration })) {
            changedIds.add(update.entry.id);
        }
    }

    let downloaded = 0;
    if (plan.downloads.length) onProgress?.({ total: plan.downloads.length, completed: 0 });
    await forEachLimited(plan.downloads, CONCURRENCY, async ({ entry, expected }) => {
        if (isCancelled()) return;
        try {
            const record = await drive.downloadFile(entry.remoteFileId);
            // Rejects corrupt files, or files from another key, before they replace local content.
            await decryptDataWithMasterKey(masterKey, record.iv, record.ciphertext);
            const applied = await dbService.applyRemoteEntry({ entry, record, expected, expectedNotesGeneration: notesGeneration });
            if (applied) changedIds.add(entry.id);
        } catch (error) {
            if (isDriveNotFound(error)) {
                deadRemoteFiles.add(entry.remoteFileId);
            } else {
                failed++;
                console.error(`Failed to download page ${entry.id}:`, error);
            }
        }
        onProgress?.({ total: plan.downloads.length, completed: ++downloaded, current: entry.name });
    });

    for (const [id, operation] of plan.missingOperations) {
        await syncService.addOperationIfAbsent(id, operation);
    }

    // A page whose parent was deleted elsewhere while it changed here moves to its workspace root.
    const entriesNow = await dbService.getAllEntries();
    const presentIds = new Set(entriesNow.map((entry) => entry.id));
    for (const entry of entriesNow) {
        if (entry.parentId && entry.parentId !== 'quickNote' && !presentIds.has(entry.parentId)
            && tombstones.has(entry.parentId) && presentIds.has(entry.rootId) && entry.rootId !== entry.id) {
            await dbService.updateMetaField({ id: entry.id, fieldName: 'parentId', newValue: entry.rootId, notify: false });
            changedIds.add(entry.id);
        }
    }
    if (isCancelled()) return null;

    // ---- Push ----
    onPhase?.('push');
    local = await dbService.getSyncState();
    let uploaded = 0;
    if (local.operations.length) onProgress?.({ total: local.operations.length, completed: 0 });
    await forEachLimited(local.operations, CONCURRENCY, async (operation) => {
        if (isCancelled()) return;
        try {
            await executeOperation(drive, operation);
        } catch (error) {
            failed++;
            console.error(`Failed to sync ${operation.operation} for ${operation.fileId}:`, error);
        }
        onProgress?.({ total: local.operations.length, completed: ++uploaded });
    });
    onProgress?.({ total: 0, completed: 0 });
    if (isCancelled()) return null;

    // Re-read so deletions made during this cycle are published with it.
    local = await dbService.getSyncState();
    for (const { id, deletedAt } of local.tombstones) {
        if (!(tombstones.get(id) >= deletedAt)) tombstones.set(id, deletedAt);
    }
    const nextMeta = buildRemoteMeta({ remote, local, tombstones, deadRemoteFiles });
    if (!sameRemoteMeta(nextMeta, remote)) {
        cache.version = await drive.writeMeta(nextMeta);
        cache.meta = nextMeta;
    } else {
        cache.version = version;
        cache.meta = remote;
    }

    if (changedIds.size || uploaded) dbService.notifyUpdate({ remotePageIds: [...changedIds] });
    return { skipped: false, downloaded: changedIds.size, uploaded, failed };
}
