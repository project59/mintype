# Check it yourself

You do not have to take Mintype's word for how your notes are protected. This page shows how to check the main claims with tools you already have. The steps use Chrome's developer tools; Firefox and Edge have the same panels under similar names.

Open the developer tools with **F12**, or **Cmd+Option+I** on a Mac.

## Your notes are encrypted on your device

1. Open Mintype and unlock it.
2. In developer tools, open **Application** (in Firefox, **Storage**), then **IndexedDB → Mintype → pagedata**.
3. Each entry is one page. Its content is an `iv` and a `ciphertext` of random-looking text, not your writing.

In **workspacemeta** you will see page titles in readable form. That is expected; see [Limitations](limitations.md#titles-and-structure-are-not-encrypted-on-your-device).

Your keys are in **IndexedDB → MSS → secure_store**. `master_key_enc` and `recovery_key_enc` are encrypted. There is no entry containing your password or your recovery key.

## Your notes are encrypted in Google Drive

1. Open [Google Drive](https://drive.google.com) and find the `Mintype` folder.
2. Download any file in it and open it in a text editor.
3. You will see `{"ciphertext": "...", "iv": "..."}` and nothing readable. The file names are page IDs, not titles.

## Your password is never sent anywhere

1. Lock Mintype, then open the **Network** tab in developer tools.
2. Unlock Mintype with your password.
3. Look through the requests. Unlocking happens entirely on your device, so none of the requests contain your password.

## A QuickShare key never reaches the server

1. Create a QuickShare link and open it in a private window with the Network tab open.
2. Find the request to `/api/get-quicksharepage/...`. Its address contains the share ID but not the `#k=` part of your link.
3. The file downloaded next is encrypted. It is decrypted in your browser using the key from the link.

## Read the code

The parts of the app that handle encryption are short enough to read in one sitting:

| File | What it does |
| --- | --- |
| [`src/layouts/secure-context/secureUtils.js`](../src/layouts/secure-context/secureUtils.js) | Key derivation, encryption and decryption |
| [`src/layouts/secure-context/SecureContext.jsx`](../src/layouts/secure-context/SecureContext.jsx) | Setup, unlocking, password changes and locking |
| [`src/layouts/secure-context/localKey.js`](../src/layouts/secure-context/localKey.js) | Unwrapping the master key |
| [`src/lib/keyBundle.js`](../src/lib/keyBundle.js) | The key bundle saved to your account |
| [`src/lib/dbService.js`](../src/lib/dbService.js) | Encrypted storage of page content |
| [`src/lib/driveService.js`](../src/lib/driveService.js) | What is uploaded to Google Drive |
| [`src/lib/tokenService.js`](../src/lib/tokenService.js) | Encrypted storage of Google Drive tokens |
| [`src/components/quickshare/shareCrypto.js`](../src/components/quickshare/shareCrypto.js) | QuickShare encryption |
| [`src/lib/searchUtils.js`](../src/lib/searchUtils.js) | The in-memory search index |

You can also [run Mintype locally](https://github.com/project59/mintype#local-development) from the source code.
