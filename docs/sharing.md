# Sharing with QuickShare

QuickShare turns a document or whiteboard into a read-only link that anyone can open, with or without Mintype. The page is encrypted before it leaves your device, and the key needed to read it exists only in the link.

## Sharing a page

1. Open the page and choose **Quick Share** from the page's options menu (**⋯** at the top of the page).
2. Choose **Generate**, then copy the link.
3. Send the link to the people you want to read the page.

You need to be signed in to a Mintype account to create links. Pages marked **sensitive** cannot be shared; unmark them first if you want to share them.

## What the link shares

- **A snapshot.** The link shows the page as it was when you created the link. Later edits are not included; create a new link to share them.
- **The page's name, emoji and content,** including images.
- **Titles of linked pages.** Links and mentions that point to your other pages are turned into plain text showing those pages' titles. The pages themselves are not shared.

Each link works for **24 hours**. A shared page can be up to 50 MB.

## Who can read a shared page

**Anyone who has the full link can read the page.** That includes anyone the link is forwarded to. Only share links with people you trust, and over a channel you trust.

The link looks like this:

```text
https://mintype.app/quickshare/<share id>#k=<key>
```

The part after `#` is the decryption key. Browsers never send this part of a link to a server, so Mintype's server receives only the share ID and never the key. The server stores the encrypted page and hands it to anyone who asks for that share ID, but without the key it is unreadable.

Messaging apps and browsers may still store the complete link, for example in your chat history or browsing history. Anyone with access to those can open the page while the link is valid.

## Saving a shared page

If the person opening the link has Mintype set up on their device, they can choose **Save to workspace**. They unlock with their own password, and a copy of the page is saved to their workspace, encrypted with their own key. The copy is independent: later changes by either person are not shared.

## How it works

For the technical details, see [Encryption in detail](encryption.md#quickshare). In short:

1. Your device creates a new, random 256-bit key for this share only.
2. It compresses the page and encrypts it with that key (AES-GCM).
3. It asks Mintype's server for an upload slot, then uploads the encrypted file directly to storage.
4. The key is added to the link after the `#`.
5. The recipient's browser downloads the encrypted file and decrypts it with the key from the link.

The key never leaves the two devices, except inside the link you choose to send.
