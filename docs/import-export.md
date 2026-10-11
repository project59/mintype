# Import, export and backups

Your notes belong to you. Mintype can bring notes in from other apps and export them in open formats at any time, with or without sync.

## Importing

Go to **Settings → Import** and choose a format. Imported pages are added to the workspace you pick and get new IDs, so they never clash with pages you already have.

| Format | What to upload |
| --- | --- |
| Notion | A ZIP exported from Notion. In Notion's export settings, choose **HTML**, **Include subpages** and **Create folders for subpages**. |
| Markdown | A ZIP of `.md` files. It can also contain `.whiteboard.json` files from a Mintype Markdown export. |
| Mintype JSON | A workspace backup from Mintype's JSON export. It only imports on a device unlocked with the same keys it was exported with. |

Imported pages are encrypted on your device as they are saved, and are queued to sync like any other new page.

## Exporting a workspace

Go to **Settings → Export**, pick a workspace, and choose a format:

| Format | Encrypted? | Best for |
| --- | --- | --- |
| Mintype JSON | Yes | A full backup that keeps your page hierarchy. It can only be restored into Mintype with the same keys. |
| Markdown | **No** | Readable files to use in other apps. Images go in an `images` folder, columns become ordinary blocks, and the page hierarchy is not kept. Whiteboards are included as `.whiteboard.json` files. |

## Exporting a single page

A page's options menu (**⋯** at the top of the page) can export just that page as Markdown or JSON. Both files are **not encrypted**: they contain the page's readable content.

## Keeping your own backups

For a backup you control, without relying on Google Drive:

1. Export each workspace as **Mintype JSON** from **Settings → Export**.
2. Keep a copy of your **key file** from **Settings → Security and Recovery → Export Key Bundle**.
3. Keep your **recovery key** somewhere safe.

To restore on a new device, choose **Returning User → Configure**, import your key file, unlock with your password, then import the JSON backups from **Settings → Import**.

## Handling unencrypted exports

Markdown exports and single-page exports are ordinary files. Once you download them, Mintype's encryption no longer protects them, so store them as carefully as any other private document. Delete them when you no longer need them.
