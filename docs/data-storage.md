# What is stored where

This page lists everything Mintype stores, where it is kept, and whether it is encrypted. "Encrypted" here means encrypted with your master key, which only your password or recovery key can unlock. See [Encryption in detail](encryption.md).

## On your device

Mintype stores your data in your browser's IndexedDB and localStorage. Nothing is stored in cookies.

### Your notes

| Data | Encrypted? | Notes |
| --- | --- | --- |
| Page and whiteboard content, including images | Yes | One `{ iv, ciphertext }` record per page |
| Workspace content (such as cover images) | Yes | |
| Page and workspace **titles and emoji** | **No** | Readable by anyone with access to this browser profile |
| Page hierarchy, order, and the favourite, sensitive and trash flags | **No** | |
| Created and modified times | **No** | |
| Sync queue | **No** | Page IDs and the kind of change waiting to upload, no content |
| Record of permanently deleted pages | **No** | Page IDs and deletion times, so deletions sync |

### Your keys

| Data | Encrypted? | Notes |
| --- | --- | --- |
| Master key, wrapped with your password | Yes | Needs your password to open |
| Master key, wrapped with your recovery key | Yes | Needs your recovery key to open |
| Salts, key fingerprint and timestamps | No | Not secret; needed to unlock |
| Google Drive access and refresh tokens | Yes | Only if you turned on sync |

Your password and your recovery key are never stored.

### Settings in localStorage

The colour theme, which sidebar folders are collapsed, the Pomodoro timer state, the IDs of your Mintype folder and metadata file in Google Drive, and the time of the last sync. If you are signed in, your browser also stores your account session (an access token for Mintype's servers and your email address).

### The search index

To search encrypted notes, Mintype needs readable text. When you open the search window, Mintype decrypts your pages and builds a search index of page titles and text **in memory only**. It is never written to disk, and sensitive pages are left out. The index is discarded when you close the search window or lock the app.

## In your Google Drive

Only if you turn on sync. Mintype keeps everything in a folder called `Mintype`:

| File | Encrypted? | Contents |
| --- | --- | --- |
| `mintype-data.json` | Yes | All page metadata (titles, emoji, hierarchy, flags, timestamps) and the record of deleted pages |
| `<page ID>.json` (one per page) | Yes | The page's encrypted content record |

Google can still see some information about these files:

- the file names, which are random page IDs rather than titles,
- a `type` label on each file (document, whiteboard or workspace) and its page ID, stored as Drive file properties,
- how many files there are, their sizes, and when they were created and changed,
- that the files were created by Mintype.

Google cannot see your titles or the content of your pages.

## Files you create

These are outside Mintype's protection once they are on your device:

- **Recovery key** (`recovery_key.txt`): unencrypted. With any copy of your encrypted key, it unlocks your notes.
- **Key file** (`mintype_encrypted_keys.json`): your encrypted key bundle. Useless without your password or recovery key, but it lets someone try to guess your password offline.
- **Markdown exports and single-page exports**: unencrypted copies of your notes.
- **Mintype JSON exports**: encrypted, like your synced notes.
