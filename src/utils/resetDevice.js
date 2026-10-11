// Erases everything Mintype keeps in this browser: every IndexedDB database (notes, keys, sync
// queue), localStorage (settings, Drive IDs, the account session) and sessionStorage. Notes in
// Google Drive and the Mintype account are not touched.

// Listed by name too, for browsers without indexedDB.databases().
const KNOWN_DATABASES = ['Mintype', 'MSS'];

// A deletion waits while another tab holds the database open, and finishes once it closes.
function deleteDatabase(name, onBlocked) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => onBlocked?.();
    });
}

export async function resetDevice({ onBlocked } = {}) {
    const names = new Set(KNOWN_DATABASES);
    try {
        for (const { name } of await indexedDB.databases()) {
            if (name) names.add(name);
        }
    } catch {
        // Not supported; the known databases are still deleted.
    }
    await Promise.all([...names].map((name) => deleteDatabase(name, onBlocked)));

    try {
        localStorage.clear();
    } catch {
        // Storage can be unavailable (e.g. blocked site data).
    }
    try {
        sessionStorage.clear();
    } catch {
        // As above.
    }
}
