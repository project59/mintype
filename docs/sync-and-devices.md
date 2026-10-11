# Sync and devices

Mintype works entirely on your device. Sync is optional: turn it on to keep your notes on more than one device, or as an extra copy of your notes.

## How sync works

Mintype syncs through **your own Google Drive**. Your notes are encrypted on your device before they are uploaded, so Google stores only encrypted files. Mintype does not keep a copy of your notes on its own servers.

Sync needs two things, both set up in **Settings → Accounts and Sync**:

1. **A Mintype account.** You sign in with Google. The account stores an encrypted copy of your keys, so your other devices can use the same key. See [Encryption in detail](encryption.md#your-mintype-account-copy).
2. **Google Drive access.** Mintype creates a `Mintype` folder in your Drive and keeps your encrypted notes there. It asks for access only to the files it creates, not to the rest of your Drive. Google's permission screen shows exactly what is requested.

## When sync runs

Once it is set up, Mintype syncs:

- every 30 seconds while the app is open,
- when you switch back to the Mintype tab or app, and
- when your device comes back online.

Only one tab syncs at a time, so having Mintype open in several tabs is fine.

## Working offline

Everything works without an internet connection. Changes are queued on your device and uploaded the next time sync runs.

## When the same page changes on two devices

Mintype does not ask you to choose between versions. The most recent change wins:

- For a page's **content**, the version saved most recently replaces the other.
- For a page's **details** (its name, emoji, position, favourite or sensitive setting), the most recent change wins, separately from the content.

If you edit the same page on two devices while one is offline, the edits from the device that saved last are kept and the others are lost. Let a device sync before you switch to another one if you have made important changes.

## Deleting pages

When you permanently delete a page, the deletion is recorded and synced, so the page is removed from Drive and from your other devices too. A page is never deleted just because it is missing from Drive.

## Adding another device

On the new device, open Mintype and choose **Returning User → Configure**. Then either:

- **Sign in** to your Mintype account to fetch your encrypted keys, or
- **Import your key file** (`mintype_encrypted_keys.json`) if you do not use an account.

Then unlock with your usual password, and turn on Google Drive sync in **Settings → Accounts and Sync** to download your notes.

Your password never leaves your device. The new device receives your keys only in their encrypted form and unlocks them locally.

## Changing your password

Change your password in **Settings → Security and Recovery**. If you are signed in, the change is saved to your account, and your other devices ask for the new password the next time they are unlocked.

## Signing out

Signing out of your Mintype account stops sync on that device. Your notes stay on the device and remain encrypted.

## If something goes wrong

- **"Your Google Drive notes are encrypted with a different key"**: the notes in Drive were set up with a different key from this device's. This happens if you created a new setup instead of restoring your existing one. [Reset this device](getting-started.md#starting-over) and choose **Returning User** to restore your original key.
- **Sync keeps failing:** check that you are online and still signed in. Mintype retries automatically and waits longer between attempts after repeated failures.
