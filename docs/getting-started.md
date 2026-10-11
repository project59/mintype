# Getting started

Mintype runs in any modern browser. Open the app, choose **Enter Workspace**, and you are taken through a short setup.

## Create your password

On a new device, choose **New Setup** and pick a password of at least 8 characters.

Your password unlocks the key that encrypts all of your notes. Mintype never stores your password and cannot reset it for you, so choose one you will remember. A long passphrase of several words is both easier to remember and harder to guess than a short, complicated password.

## Save your recovery key

After setup, Mintype shows a **recovery key**: a 64-character code. It is the only other way to unlock your notes if you forget your password.

- Download it and keep it somewhere safe and separate from this device, such as a password manager or a printed copy.
- Anyone who has your recovery key and a copy of your encrypted data can read your notes, so treat it like a password.
- You will not be able to see it again in the app.

## Save your key file

Next, Mintype offers a **key file** (`mintype_encrypted_keys.json`). It holds your encryption key in its encrypted form, locked by your password and by your recovery key. It lets you set up Mintype on another device without signing in to an account. The key file alone cannot unlock your notes; you still need your password or recovery key.

You can download the key file again at any time from **Settings → Security and Recovery → Export Key Bundle**.

## Unlocking and locking

Each time you open Mintype, or reload the page, you are asked for your password. You can unlock with your recovery key instead.

To lock the app while you step away, use the **lock** button at the top of the sidebar. Mintype does not lock itself automatically after a period of inactivity, so lock it yourself, or close the tab, on a shared device.

## Workspaces, pages and quick notes

- **Workspaces** are the top level: for example "Personal" and "Work".
- **Pages** live inside a workspace and can contain sub-pages. A page is either a [document or a whiteboard](documents-and-whiteboards.md).
- **Quick Notes** is a place for notes you want to jot down now and organise later.
- **Favourites** keeps the pages you use most at the top of the sidebar.
- **Trash** holds deleted pages until you delete them permanently or restore them.

Drag pages in the sidebar to reorder or nest them, or use a page's **⋯** menu to rename, move, or delete it.

## Sensitive pages

Mark a page as **sensitive** from the page's options menu (**⋯** at the top of the page) to ask for your password again before the page is shown. This helps if you leave Mintype open on a device someone else might use. Sensitive pages are also left out of search and cannot be shared.

A sensitive page is protected by the same encryption as every other page. The extra password prompt is a screen in the app, not a second layer of encryption. See [Limitations](limitations.md#sensitive-pages-are-a-screen-not-extra-encryption).

## Install Mintype as an app

Mintype can be installed like a native app (a "progressive web app"):

- **Android:** open Mintype in Chrome, then choose **Add to Home screen** or **Install app** from the menu.
- **iPhone and iPad:** open Mintype in Safari, tap **Share**, then **Add to Home Screen**.
- **Desktop:** in Chrome or Edge, use the install icon in the address bar.

On Android and desktop, the installed app shares storage with the browser, so your notes and setup carry over. On iPhone and iPad, a home-screen app keeps its own storage, so you set it up separately, for example by signing in to your Mintype account or importing your key file.

## Starting over

Resetting erases everything Mintype has stored in this browser and returns it to a brand-new state: your notes, workspaces and keys, changes that have not synced yet, your settings, and your sign-in on this device. Notes already in Google Drive, your Mintype account, and any files you have downloaded are not affected.

There are three ways to reset:

- If you can unlock Mintype, go to **Settings → Security and Recovery → Reset Mintype**.
- If you cannot unlock, for example because you have forgotten your password, choose **Reset this device** on the password screen.
- If Mintype will not load at all, go to `/reset` on the Mintype website, for example `https://mintype.app/reset`.

Each one opens a page that lists what will be erased and asks you to confirm. Close any other Mintype tabs first.

After a reset, choose **Returning User** to restore your existing key, by signing in to your Mintype account or importing your key file, and your synced notes download again. Notes that existed only on this device cannot be recovered.
