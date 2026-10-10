import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import dbService from '../../lib/dbService';
import { decryptDataWithMasterKey } from '../../layouts/secure-context/secureUtils';

export const MINTYPE_DATA_FILE = 'mintype-data.json';
export const MINTYPE_EXPORT_VERSION = 2;

// IDs are nanoid() or Notion-style hex strings; shorter word-like tokens are never IDs.
const ID_TOKEN = /[\w-]{10,}/g;

const contentProblem = (entry, content) => {
    if (!content || typeof content !== 'object') return 'Page content is not valid JSON';
    if (entry.type === 'workspace') return null;
    if (entry.type === 'document') {
        return typeof content.markdown === 'string' ? null : 'Unsupported document format (exported before Mintype 2.0?)';
    }
    if (entry.type === 'whiteboard') {
        return Object.hasOwn(content, 'tldraw') ? null : 'Unsupported whiteboard format (exported before Mintype 2.0?)';
    }
    return `Unknown page type "${entry.type}"`;
};

const readEntries = async (data, masterKey) => {
    if (!data.encrypted) return data.entries;
    try {
        return (await decryptDataWithMasterKey(masterKey, data.iv, data.ciphertext)).entries;
    } catch {
        throw new Error('This export was encrypted with different keys. Unlock Mintype with the keys it was exported from and try again.');
    }
};

// Imports a workspace exported by JsonExporter as a new copy: every page gets a new ID, and
// hierarchy, internal page references and page IDs inside content are remapped to match, so an
// import never overwrites existing pages or their Drive files. Encrypted exports must be imported
// with the same master key; plaintext exports from earlier versions are also accepted.
export async function importMintypeZip(zipFile, masterKey) {
    const zip = await JSZip.loadAsync(zipFile);
    const dataFile = zip.file(MINTYPE_DATA_FILE);
    if (!dataFile) throw new Error(`${MINTYPE_DATA_FILE} was not found. Is this a Mintype JSON export?`);

    let data;
    try {
        data = JSON.parse(await dataFile.async('text'));
    } catch {
        throw new Error(`${MINTYPE_DATA_FILE} is not valid JSON.`);
    }
    const entries = await readEntries(data, masterKey);
    if (!Array.isArray(entries)) throw new Error(`${MINTYPE_DATA_FILE} contains no pages.`);

    const workspace = entries.find((entry) => entry.parentId === null && entry.type === 'workspace');
    if (!workspace) throw new Error('This export does not contain a workspace.');

    const failures = [];
    const contents = new Map();
    for (const entry of entries) {
        const name = entry.name || 'Untitled';
        const file = zip.file(`${entry.id}.json`);
        if (!file) {
            failures.push({ name, error: 'Page content is missing from the export' });
            continue;
        }
        try {
            const stored = JSON.parse(await file.async('text'));
            const content = data.encrypted
                ? await decryptDataWithMasterKey(masterKey, stored.iv, stored.ciphertext)
                : stored;
            const problem = contentProblem(entry, content);
            if (problem) failures.push({ name, error: problem });
            else contents.set(entry.id, content);
        } catch (error) {
            failures.push({ name, error: `Could not read page content: ${error.message}` });
        }
    }
    if (!contents.has(workspace.id)) {
        throw new Error('The workspace itself could not be read from this export.');
    }

    const newIds = new Map([...contents.keys()].map((id) => [id, nanoid()]));
    const remapIds = (text) => text.replace(ID_TOKEN, (token) => newIds.get(token) ?? token);
    const newWorkspaceId = newIds.get(workspace.id);
    // Pages whose parent was not imported are kept at the top of the workspace.
    const newParentId = (entry) => {
        if (entry.id === workspace.id) return null;
        if (entry.parentId === 'quickNote') return entry.parentId;
        return newIds.get(entry.parentId) ?? newWorkspaceId;
    };

    const expectedNotesGeneration = dbService.getNotesGeneration();
    const imported = entries.filter((entry) => contents.has(entry.id));
    for (const entry of imported) {
        const meta = {
            ...entry,
            id: newIds.get(entry.id),
            parentId: newParentId(entry),
            rootId: newWorkspaceId,
            remoteFileId: null,
        };
        const content = JSON.parse(remapIds(JSON.stringify(contents.get(entry.id))));
        const didImport = await dbService.importPage({ meta, content, masterKey, expectedNotesGeneration });
        if (!didImport) throw new Error('Notes were reset during the import.');
    }
    dbService.notifyUpdate();

    return {
        total: entries.length,
        success: imported.length,
        failed: failures.length,
        failures,
        workspaceId: newWorkspaceId,
    };
}
