# Import, export and backups

Your notes belong to you. Mintype exports them as ordinary Markdown files at any time, with or without sync, and imports the same format back, as well as notes from Obsidian and Notion.

## Exporting

Go to **Settings → Export**, pick a workspace (or **All workspaces**), and select **Export ZIP**. Tick **Include pages in the trash** to export those too.

Exports are **not encrypted**: see [Handling exports](#handling-exports) below.

The ZIP keeps your whole workspace: every page, the page tree, quick notes and, if you chose it, the trash. Each workspace is a folder laid out like this:

```text
My Workspace/
  Projects.md
  Projects/                    sub-pages of "Projects"
    Roadmap.md
    Sketch.whiteboard.json
  Quick notes/
    Groceries.md
  attachments/                 images used by your pages
    image-3f9a1c2e.png
  .trash/                      only with "Include pages in the trash"
  .mintype/workspace.json      titles, order, emoji and other page settings
```

- **Pages** are Markdown (`.md`) files named after their titles. A page's sub-pages are in a folder of the same name next to it. Notion exports use this layout too, and Obsidian shows it as a note next to a folder.
- **Whiteboards** have no Markdown form, so they are saved as `.whiteboard.json` files holding the whiteboard as Mintype stores it.
- **Images** are saved as files in `attachments/`, and pages link to them with relative paths.
- **Links between pages** become relative links to the exported files. Page mentions become Obsidian-style wikilinks, such as `[[Projects/Roadmap|Roadmap]]`.
- **Mintype blocks** such as callouts, sections and columns stay in Mintype's Markdown syntax (`:::callout`, `:::columns`), so they come back unchanged when you import the ZIP. Other apps show these marker lines as plain text, and the content between them stays readable.
- **`.mintype/workspace.json`** records what files cannot: each page's exact title, its place among its siblings, emoji, favourite and sensitive flags, page width, dates, and the workspace's name and cover. Obsidian hides folders that start with a dot.

## Importing

Go to **Settings → Import** and choose a format. Imported pages always get new IDs, so they never clash with pages you already have. By default each imported workspace becomes a new workspace. You can add the pages to an existing workspace instead.

| Format | What to upload |
| --- | --- |
| Markdown | A ZIP of Markdown files: a Mintype export, an Obsidian vault, or a Notion export in **Markdown & CSV** format. |
| Notion | A ZIP exported from Notion in **HTML** format, with **Include subpages** and **Create folders for subpages**. You can pick which pages to import. |

The Markdown importer:

- Restores a Mintype export exactly as it was exported: page tree, order, quick notes, trash, emoji and page settings.
- Turns folders into pages. A note next to a folder of the same name, or inside it with the same name (Obsidian's folder notes), is that folder's page. A folder without one becomes an empty page holding its files.
- Turns wikilinks (`[[Page]]`) into page mentions, and links to other imported files into links to their new pages, including Obsidian's links by file name.
- Embeds images from the ZIP, including Obsidian's `![[image.png|300]]`.
- Skips `.obsidian` and other hidden folders. Pages in a `.trash` folder arrive in the trash.
- Removes YAML front matter and the title heading Notion adds at the top of each page.

Imported pages are encrypted on your device as they are saved, and are queued to sync like any other new page. Images from other apps are downscaled and re-encoded, as pasted images are. Images from a Mintype export are kept as they are.

## Exporting a single page

A page's options menu (**⋯** at the top of the page) can export just that page: a document as a Markdown file, a whiteboard as a `.whiteboard.json` file. These files are **not encrypted**. A single page's links and mentions still point at your Mintype pages, and its images stay inside the file.

## Keeping your own backups

For a backup you control, without relying on Google Drive, export **All workspaces** from **Settings → Export**, with the trash if you want it. To restore on another device, set Mintype up there and import the ZIP with the **Markdown** importer.

The export does not depend on your keys, so it can be restored into any Mintype setup. It is not encrypted, though, so store it as carefully as any other private document.

## Handling exports

Exports are ordinary, unencrypted files. Once you download them, Mintype's encryption no longer protects them, so store them as carefully as any other private document. Delete them when you no longer need them. Pages marked sensitive are included, with their flag kept in `.mintype/workspace.json`.

The code that writes and reads exports is in [`markdownExport.js`](../src/components/exporting/markdownExport.js) and [`markdownImport.js`](../src/components/importing/markdownImport.js).
