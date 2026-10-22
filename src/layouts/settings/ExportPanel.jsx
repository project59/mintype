import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import dbService from "../../lib/dbService.js";
import MarkdownExporter from "../../components/exporting/MarkdownExporter.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

const ALL_WORKSPACES = 'all';

export default function ExportPanel() {
    const [workspaces, setWorkspaces] = useState([]);
    const [selection, setSelection] = useState(null);
    const [includeTrash, setIncludeTrash] = useState(false);

    useEffect(() => {
        dbService.getAllRootMeta().then((roots) => setWorkspaces(roots.filter((root) => !root.deleted)));
    }, []);

    const workspaceIds = selection === ALL_WORKSPACES
        ? workspaces.map((workspace) => workspace.id)
        : workspaces.filter((workspace) => workspace.id === selection).map((workspace) => workspace.id);
    const selectionLabel = selection === ALL_WORKSPACES
        ? 'All workspaces'
        : workspaces.find((workspace) => workspace.id === selection)?.name || 'Select workspace';

    const handleExportComplete = ({ count }) => {
        toast.success(`Exported ${count} pages`);
    };

    return (
        <SettingsSkeleton title="Export Notes">
            <div className="mb-4 max-w-xl">
                <h2 className='text-lg font-medium'>Export from Mintype</h2>
                <p className='textRegular'>
                    Export your workspaces as a ZIP of Markdown files, with their full page structure. The Markdown importer brings it back into Mintype, and apps like Obsidian can open it as a folder of notes.
                </p>

                <div className="mt-4 space-y-4">
                    <div className="space-y-1">
                        <p className="textLabel">1. Workspace</p>
                        <Menu>
                            <MenuButton className="btnAction">
                                {selectionLabel}
                                <ChevronDownIcon className="size-4 fill-white/60" />
                            </MenuButton>
                            <MenuItems
                                transition
                                anchor="bottom start"
                                className="dropdownPanel mt-1"
                            >
                                {workspaces.length > 1 && (
                                    <MenuItem>
                                        <button className="dropdownItem text-left" onClick={() => setSelection(ALL_WORKSPACES)}>
                                            All workspaces
                                        </button>
                                    </MenuItem>
                                )}
                                {workspaces.map((workspace) => (
                                    <MenuItem key={workspace.id}>
                                        <button
                                            className="dropdownItem text-left"
                                            onClick={() => setSelection(workspace.id)}
                                        >
                                            {workspace.name}
                                        </button>
                                    </MenuItem>
                                ))}
                            </MenuItems>
                        </Menu>
                    </div>

                    <div className="space-y-1">
                        <p className="textLabel">2. Options</p>
                        <label className="flex items-center gap-2 textRegular">
                            <input type="checkbox" checked={includeTrash} onChange={(event) => setIncludeTrash(event.target.checked)} />
                            Include pages in the trash
                        </label>
                    </div>

                    <p className="infoBox">
                        The export is <strong>not encrypted</strong>: anyone with the ZIP can read your notes. Store it as carefully as any other private document.
                    </p>

                    <MarkdownExporter workspaceIds={workspaceIds} includeTrash={includeTrash} onExportComplete={handleExportComplete} />
                </div>
            </div>
            <div className="mb-4 max-w-xl">
                <h2 className='text-lg font-medium'>What is in the export?</h2>
                <p className='textRegular'>
                    Each workspace is a folder. Pages are Markdown (.md) files, and a page's sub-pages sit in a folder of the same name next to it. Quick notes go in a 'Quick notes' folder, images in 'attachments', and whiteboards are .whiteboard.json files. Titles, emoji, order and favorites are kept in a small .mintype folder. See <Link className="text-indigo-400 underline" to={'/docs/import-export'}>Import, export and backups</Link> for details.
                </p>
            </div>
        </SettingsSkeleton>
    )
}
