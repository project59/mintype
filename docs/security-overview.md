# How Mintype protects your notes

This page is a plain-language summary. The other pages in this section go into more detail and link to the code.

## The short version

- Your notes are **encrypted on your device** with a key that only your password or recovery key can unlock.
- Your password **never leaves your device** and is never stored, not even on your device.
- Notes are **encrypted before they are saved or synced.** Google Drive stores only encrypted files.
- Mintype's servers **never receive your notes or your keys in a readable form.**
- **Only you can read your notes.** That also means no one can recover them if you lose both your password and your recovery key.

## Your encryption key

When you set up Mintype, your device creates a random **encryption key**. Every page you write is encrypted with this key before it is stored.

The key itself is kept locked twice over: once with your **password**, and once with your **recovery key**. Either one can unlock it. Without one of them, the stored key is useless.

When you unlock Mintype, the key is kept only in the app's memory, and it is gone as soon as you lock the app, reload, or close the tab.

## What other people can see

| Who | What they can see | What they cannot see |
| --- | --- | --- |
| Someone with your unlocked device | Everything, while Mintype is unlocked | — |
| Someone with your locked device | Page titles, emoji and how pages are organised | The content of your pages |
| Google (if you use sync) | That you use Mintype, how many pages you have, their sizes, and when they change | Page titles or content |
| Mintype's servers (if you sign in) | Your email address (for auth), and an encrypted copy of your key | Your password, your key, or your notes |
| Someone with a QuickShare link | The shared page | Your other pages |

The full list is in [What is stored where](data-storage.md).

## What you can check yourself

The Mintype app is open source. You can read the code that encrypts your notes, and you can watch what your browser sends with its developer tools. [Check it yourself](verify.md) shows how.

Mintype's server code is **not published yet.** The app is designed so that the server only ever receives encrypted data, and you can confirm what the app sends to it. But you cannot see what the server does with the requests it receives. [Limitations](limitations.md) covers this and the other things Mintype does not protect against.

## What you should do

- **Choose a strong password.** A long passphrase is best. Your encrypted key could be copied from your device or account, and a weak password can be guessed offline.
- **Keep your recovery key safe** and away from your device. It is the only spare.
- **Lock Mintype** when you step away from a shared device. It does not lock itself automatically.
- **Treat exports and share links as private.** Markdown exports are unencrypted, and anyone with a QuickShare link can read that page.
