import { decryptDataWithMasterKey, encryptDataWithMasterKey } from '../../layouts/secure-context/secureUtils.js';

// The QuickShare links this device created, so reopening Quick Share shows a page's link instead
// of making another. A link contains its page's key, so each record is encrypted with the master
// key; only the page ID and expiry time are readable. Expired records are dropped.
//
// localStorage: { [pageId]: { expiresAt, iv, ciphertext } }, where the ciphertext holds
// { id, link, manageToken, expiresAt, contentHash }.
const STORAGE_KEY = 'quickshareLinks';

const readAll = () => {
    try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!all || typeof all !== 'object') return {};
        return Object.fromEntries(Object.entries(all).filter(([, stored]) => stored?.expiresAt > Date.now()));
    } catch {
        return {};
    }
};

const writeAll = (all) => {
    try {
        if (Object.keys(all).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Without storage the link is simply not remembered.
    }
};

export async function getSharedLink(masterKey, pageId) {
    const stored = readAll()[pageId];
    if (!stored) return null;
    try {
        return await decryptDataWithMasterKey(masterKey, stored.iv, stored.ciphertext);
    } catch {
        forgetSharedLink(pageId);
        return null;
    }
}

export async function rememberSharedLink(masterKey, pageId, record) {
    const { iv, ciphertext } = await encryptDataWithMasterKey(masterKey, JSON.stringify(record));
    writeAll({ ...readAll(), [pageId]: { expiresAt: record.expiresAt, iv, ciphertext } });
}

export function forgetSharedLink(pageId) {
    const all = readAll();
    delete all[pageId];
    writeAll(all);
}
