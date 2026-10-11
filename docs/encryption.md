# Encryption in detail

This page describes exactly how Mintype encrypts your notes, with links to the code that does it. All cryptography uses the browser's built-in [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API); Mintype does not include its own implementations of any algorithm.

## Summary

| What | How |
| --- | --- |
| Note encryption | AES-256-GCM with a random 96-bit IV for every write |
| Master key | 256 random bits, created on your device |
| Password → key | PBKDF2-HMAC-SHA-256, 800,000 iterations, random 128-bit salt |
| Recovery key | 256 random bits, shown as 64 hexadecimal characters |
| QuickShare | A new AES-256-GCM key for every share, carried in the link's `#` fragment |

## The keys

### Master key

During setup, your device generates the **master key**, a random 256-bit AES-GCM key ([`secureUtils.js`](../src/layouts/secure-context/secureUtils.js), `generateMasterKey`). It encrypts the content of every page, workspace data, your Google Drive access tokens, and the sync metadata file in Drive.

The master key is never stored or sent anywhere unencrypted.

### Key-encryption keys

The master key is stored "wrapped": encrypted with a key-encryption key (KEK) derived from a secret you hold. There are two wrapped copies ([`SecureContext.jsx`](../src/layouts/secure-context/SecureContext.jsx), `handleSetup`):

1. **Password copy.** Your password is stretched with PBKDF2-SHA-256 (800,000 iterations, a random 16-byte salt) into an AES-256-GCM key, which encrypts the master key ([`secureUtils.js`](../src/layouts/secure-context/secureUtils.js), `deriveKEK`).
2. **Recovery copy.** The same process is applied to your recovery key, with its own salt.

The high iteration count makes each password guess slow. It does not make a weak password safe; see [Limitations](limitations.md#weak-passwords-can-be-guessed-offline).

### Recovery key

The recovery key is 32 random bytes from the browser's secure random number generator, shown as 64 hexadecimal characters. Mintype displays it once at setup and does not store it in readable form.

## Unlocking

When you enter your password ([`localKey.js`](../src/layouts/secure-context/localKey.js), `unwrapMasterKey`):

1. Your device reads the salt and the wrapped master key from local storage.
2. It derives the KEK from your password and decrypts the master key. AES-GCM authentication fails if the password is wrong, so a wrong password is detected without storing anything that could be compared against it.
3. The master key is imported as a **non-extractable** key held in memory, so page scripts can use it but cannot read its bytes.

The master key lives only in memory. Locking the app, reloading, or closing the tab discards it.

## Encrypting pages

Each page's content is serialised to JSON and encrypted with the master key, with a fresh random 12-byte IV every time it is saved ([`secureUtils.js`](../src/layouts/secure-context/secureUtils.js), `encryptDataWithMasterKey`). The result is stored as `{ iv, ciphertext }`.

The same encrypted record is uploaded to Google Drive as-is. Sync never decrypts a page to upload it ([`driveService.js`](../src/lib/driveService.js)).

Page **metadata** (titles, emoji, hierarchy, timestamps) is stored differently on your device and in Drive. See [What is stored where](data-storage.md).

## Changing your password

Changing your password decrypts the master key with your old password (or your recovery key), then wraps the **same** master key again with the new password and a new salt ([`SecureContext.jsx`](../src/layouts/secure-context/SecureContext.jsx), `handleChangePassword`).

Your notes are not re-encrypted, because the master key does not change. This keeps password changes instant, but it means an old copy of your wrapped key still opens with your old password. See [Limitations](limitations.md#changing-your-password-does-not-change-your-key).

The recovery key is not affected by a password change.

## Your Mintype account copy

If you sign in to a Mintype account, your device uploads a **key bundle** so your other devices can use the same master key ([`keyBundle.js`](../src/lib/keyBundle.js)). The bundle contains:

| Field | Contents |
| --- | --- |
| `salt`, `iv`, `ciphertext` | The master key wrapped with your password |
| `recoveryKeyEnc`, `recoverySalt` | The master key wrapped with your recovery key |
| `iterations` | The PBKDF2 iteration count |
| `keyCheck` | A fingerprint of the master key (below) |
| `wrappedAt`, `created` | Timestamps |

Your password and your unwrapped master key are not part of the bundle. The key file you download from **Settings → Security and Recovery** has the same format.

The `keyCheck` fingerprint lets two devices tell whether they hold the same master key without decrypting anything. It is the first 16 bytes of `SHA-256("mintype-key-check:v1:" ‖ master key)`. Because the master key is 256 random bits, the fingerprint cannot be used to recover or guess it.

When the password is changed on one device, the bundle with the newer `wrappedAt` replaces the older one on the account and then on your other devices.

## Google Drive access tokens

Mintype stores your Google Drive access and refresh tokens on your device, encrypted with your master key ([`tokenService.js`](../src/lib/tokenService.js)).

Drive authorisation and token refreshes go through Mintype's server, which holds the Google app credentials needed to complete them. That means the server receives your Drive tokens during sign-in and each time it refreshes them. Those tokens can access the files in your `Mintype` Drive folder, which contain only encrypted data. See [Limitations](limitations.md#mintypes-server-handles-your-drive-tokens).

## QuickShare

QuickShare uses a separate key for every share ([`shareCrypto.js`](../src/components/quickshare/shareCrypto.js)):

1. The page, its name and emoji are serialised to JSON and gzip-compressed.
2. A new random 256-bit AES-GCM key and a random 12-byte IV encrypt the compressed data.
3. The stored file is `[format version: 1 byte][IV: 12 bytes][ciphertext]`.
4. The key is base64url-encoded into the link as `#k=<key>`.

Browsers do not send the `#` fragment of a URL to servers, so Mintype's server stores and serves only the ciphertext. The master key is not involved, so a share link reveals nothing about your other pages.

## Sensitive pages

Marking a page as sensitive does not encrypt it differently. It is encrypted with the master key like every other page, and the password prompt is shown by the app before the page is displayed. Sensitive pages are excluded from the search index and from QuickShare.
