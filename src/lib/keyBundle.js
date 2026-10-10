import { getItem, setItem } from '../layouts/secure-context/dbUtils.js';

// The key bundle is the master key encrypted ("wrapped") with the user's password and recovery
// key. Each device stores its own copy, and a copy is saved to the Mintype account so other
// devices can restore the same key. Changing the password re-wraps the same key: `wrappedAt`
// records when, so the newest copy of a key replaces older ones everywhere and the new password
// reaches every device.

const KEY_CHECK_ITEM = 'key_check';
const WRAPPED_AT_ITEM = 'wrapped_at';

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

// A one-way fingerprint of the master key, so two bundles can be compared without decrypting
// them: a password change re-wraps the same key and keeps its fingerprint. The key is 256 random
// bits, so the hash reveals nothing usable about it.
export async function rememberKeyCheck(rawMasterKey) {
    const label = new TextEncoder().encode('mintype-key-check:v1:');
    const input = new Uint8Array(label.length + rawMasterKey.length);
    input.set(label);
    input.set(rawMasterKey, label.length);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    await setItem(KEY_CHECK_ITEM, toBase64(digest.slice(0, 16)));
}

// Records when this device's copy was wrapped (setup, password change, import).
export async function setWrappedAt(wrappedAt) {
    await setItem(WRAPPED_AT_ITEM, wrappedAt);
}

// Also the format of the exported key backup file.
export async function buildLocalBundle() {
    const salt = await getItem('salt');
    const masterKeyEnc = await getItem('master_key_enc');
    if (!salt || !masterKeyEnc?.iv || !masterKeyEnc?.ciphertext) return null;
    const recoveryKeyEnc = await getItem('recovery_key_enc');
    const recoverySalt = await getItem('recovery_salt');
    const keyCheck = await getItem(KEY_CHECK_ITEM);
    const wrappedAt = await getItem(WRAPPED_AT_ITEM);

    return {
        version: 1,
        iterations: 800000,
        salt: toBase64(salt),
        iv: toBase64(masterKeyEnc.iv),
        ciphertext: toBase64(masterKeyEnc.ciphertext),
        recoveryKeyEnc: recoveryKeyEnc
            ? { iv: toBase64(recoveryKeyEnc.iv), ciphertext: toBase64(recoveryKeyEnc.ciphertext) }
            : null,
        recoverySalt: recoverySalt ? toBase64(recoverySalt) : null,
        keyCheck,
        wrappedAt,
        created: new Date().toISOString(),
    };
}

const hasKey = (bundle) => Boolean(bundle?.salt && bundle?.iv && bundle?.ciphertext && bundle.keyCheck);

// Returns the account's bundle, or null if none is saved. Throws if the account can't be read,
// so callers never mistake a failed request for an empty account.
export async function fetchAccountBundle(accessToken) {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/get-bundle`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Could not read the account key (${response.status})`);
    const data = await response.json();
    return hasKey(data.bundle_tokens) ? data.bundle_tokens : null;
}

// Returns null once saved, or the server's reason for refusing: 'DIFFERENT_KEY' (the account
// holds another key and `replace` was not set) or 'STALE_WRAPPER' (the account's copy of this
// key is newer).
export async function uploadAccountBundle(accessToken, bundle, { replace = false } = {}) {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/set-bundle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ bundle_tokens: bundle, replace }),
    });
    if (response.status === 409) {
        const body = await response.json().catch(() => ({}));
        return body.code || 'DIFFERENT_KEY';
    }
    if (!response.ok) throw new Error(`Could not save the account key (${response.status})`);
    return null;
}

const isSameKey = (local, account) => local.keyCheck === account.keyCheck;

export async function storeBundleLocally(bundle) {
    await setItem('salt', fromBase64(bundle.salt));
    await setItem('master_key_enc', { iv: fromBase64(bundle.iv), ciphertext: fromBase64(bundle.ciphertext) });
    await setItem('recovery_key_enc', bundle.recoveryKeyEnc
        ? { iv: fromBase64(bundle.recoveryKeyEnc.iv), ciphertext: fromBase64(bundle.recoveryKeyEnc.ciphertext) }
        : null);
    await setItem('recovery_salt', bundle.recoverySalt ? fromBase64(bundle.recoverySalt) : null);
    await setItem(KEY_CHECK_ITEM, bundle.keyCheck);
    await setWrappedAt(bundle.wrappedAt);
}

/**
 * Brings this device's copy of the key and the account's copy in line, newest wins:
 * - 'saved': this device's copy was newer (or the account had none) and was uploaded;
 * - 'adopted': the account's copy of the same key was newer, e.g. the password was changed on
 *   another device; the next unlock here uses that password;
 * - 'unchanged': both copies are already in line;
 * - 'conflict': the account holds a different key; nothing was changed.
 */
export async function reconcileAccountKey(accessToken, isRetry = false) {
    const local = await buildLocalBundle();
    if (!local) throw new Error('This device has no encryption key');
    const account = await fetchAccountBundle(accessToken);
    if (account && !isSameKey(local, account)) return 'conflict';

    if (account) {
        if (account.wrappedAt > local.wrappedAt) {
            await storeBundleLocally(account);
            return 'adopted';
        }
        if (account.wrappedAt === local.wrappedAt) return 'unchanged';
    }

    const refusal = await uploadAccountBundle(accessToken, local);
    if (!refusal) return 'saved';
    if (refusal === 'DIFFERENT_KEY') return 'conflict';
    // The account's copy changed meanwhile and is newer: compare again with the current one.
    return isRetry ? 'unchanged' : reconcileAccountKey(accessToken, true);
}
