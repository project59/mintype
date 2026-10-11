# Limitations

No app can protect against everything. This page lists what Mintype does **not** protect against, so you can decide whether it fits your needs. Where something is planned to change, it says so.

## Mintype's server handles your Drive tokens

Completing Google Drive authorisation and refreshing access requires Mintype's Google app credentials, which are kept on the server. So the server receives your Drive access and refresh tokens when you authorise Drive, and the refresh token each time access is renewed (roughly hourly while you sync).

Those tokens give access to the files Mintype created in your Drive, which are all encrypted. They cannot be used to read your notes, they are only for sync functionality. You can revoke Mintype's access at any time from your [Google account's third-party access page](https://myaccount.google.com/connections).

## Titles and structure are not encrypted on your device

On your device, page and workspace **titles, emoji, hierarchy, timestamps and flags** are stored unencrypted. Someone with access to your device's files or browser profile can read them without your password. The content of your pages stays encrypted.

In Google Drive, titles and structure are encrypted.

## Sensitive pages are a screen, not extra encryption

Marking a page as sensitive shows a password prompt before the page is displayed. The page is encrypted the same way as every other page. The prompt stops someone casually opening the page on an unlocked device; it does not protect against someone who can inspect the browser while Mintype is unlocked.

## While Mintype is unlocked, your notes are readable

Once you unlock, your master key is held in memory until you lock the app, reload, or close the tab. Mintype does **not** lock automatically after a period of inactivity.

While Mintype is unlocked, anything that can control your browser can read your notes: someone using your device, malware on it, or a browser extension with access to the page. Use a trusted device and trusted extensions, and lock Mintype when you step away.

## Weak passwords can be guessed offline

Your master key, wrapped with your password, is stored on your device, in your key file, and in your Mintype account if you sign in. Anyone who obtains a copy can try passwords on their own computer, with no limit on attempts.

Mintype uses 800,000 rounds of PBKDF2 to make each guess slow, but a short or common password can still be found. Use a long, unique passphrase. Mintype requires at least 8 characters.

## Changing your password does not change your key

Changing your password re-wraps your existing master key with the new password. Your notes are not re-encrypted. Any old copy of your wrapped key, such as an old key file, still opens with your old password, and your recovery key keeps working.

If you think your password or recovery key has been exposed, changing your password is not enough on its own. There is currently no in-app way to replace your master key. To start fresh, export your notes as Markdown, reset Mintype, create a new setup, and import them again. Note that Markdown exports do not keep your page hierarchy.

## Some information is visible to Google and Mintype's servers

Encryption hides the content of your notes, not everything about them. Google can see how many pages you have, their sizes, whether each is a document or whiteboard, and when they change. Mintype's servers know your email address, when you sign in, and when you create share links. See [What is stored where](data-storage.md).

## Share links are only as private as the link

Anyone with a complete QuickShare link can read that page until the link expires after 24 hours. There is currently no way to revoke a link early, and the expiry is enforced by the server.

## Unencrypted copies you create

Markdown exports, single-page exports and your recovery key file are ordinary, unencrypted files once they are on your device. Mintype cannot protect them.

## Forgotten passwords cannot be reset

If you lose both your password and your recovery key, your notes cannot be recovered by anyone, including Mintype. This is the cost of no one else holding your key. You can [reset the device](getting-started.md#starting-over) to start again, but the notes are lost.

## No independent audit

Mintype has not had an independent security audit. The encryption uses standard algorithms from the browser's Web Crypto API rather than custom cryptography, and the code is available for review.

## Reporting a security issue

If you find a vulnerability, please report it privately through the repository's [GitHub security advisories](https://github.com/project59/mintype/security/advisories/new) rather than in a public issue.
