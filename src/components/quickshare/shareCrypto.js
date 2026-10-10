import { arrayBufferToBase64, base64ToArrayBuffer } from '../../layouts/secure-context/secureUtils.js';

// A QuickShare page is encrypted with a one-off AES-GCM key. The server stores only the
// ciphertext; the key travels in the link's #fragment, which browsers never send to a server.
//
// Stored file: [format version: 1 byte][IV: 12 bytes][AES-GCM ciphertext of gzipped JSON payload].

const KEY_PARAM = 'k';
const FORMAT_VERSION = 1;
const IV_LENGTH = 12;

const toBase64Url = (base64) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (base64Url) => {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return base64 + '='.repeat((4 - (base64.length % 4)) % 4);
};

const transform = async (bytes, stream) => new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer(),
);

export async function encryptSharedPage(payload) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const compressed = await transform(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('gzip'));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed));

    const body = new Uint8Array(1 + IV_LENGTH + ciphertext.length);
    body[0] = FORMAT_VERSION;
    body.set(iv, 1);
    body.set(ciphertext, 1 + IV_LENGTH);

    const rawKey = await crypto.subtle.exportKey('raw', key);
    return { body, keyFragment: `${KEY_PARAM}=${toBase64Url(arrayBufferToBase64(rawKey))}` };
}

// Returns the key from a location hash such as `#k=...`, or null when it is missing or malformed.
export async function readShareKey(hash) {
    const encoded = new URLSearchParams(hash.replace(/^#/, '')).get(KEY_PARAM);
    if (!encoded) return null;
    try {
        const raw = base64ToArrayBuffer(fromBase64Url(encoded));
        if (raw.byteLength !== 32) return null;
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
    } catch {
        return null;
    }
}

// Throws when the file is not a supported share or the key does not match it.
export async function decryptSharedPage(key, buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length <= 1 + IV_LENGTH || bytes[0] !== FORMAT_VERSION) throw new Error('Unsupported share format');
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.subarray(1, 1 + IV_LENGTH) },
        key,
        bytes.subarray(1 + IV_LENGTH),
    );
    const json = await transform(new Uint8Array(decrypted), new DecompressionStream('gzip'));
    return JSON.parse(new TextDecoder().decode(json));
}
