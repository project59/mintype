import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "lucide-react";
import toast from "react-hot-toast";
import dbService from "../../lib/dbService.js";
import JsonExporter from "../../components/exporting/JsonExporter.jsx";
import MarkdownExporter from "../../components/exporting/MarkdownExporter.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

export default function ExportPanel() {
    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceId, setWorkspaceId] = useState(null);

    useEffect(() => {
        dbService.getAllRootMeta().then((roots) => setWorkspaces(roots.filter((root) => !root.deleted)));
    }, []);

    const handleExportComplete = ({ count }) => {
        toast.success(`Exported ${count} pages`);
    };

    return (
        <SettingsSkeleton title="Export Notes">
            <div className="mb-4">
                <h2 className='text-lg font-medium'>Export from Mintype</h2>
                <p className='textRegular'>
                    Choose a workspace, then the format to export it in.
                </p>

                <div className="mt-4 space-y-4">
                    <div className="space-y-1">
                        <p className="textLabel">1. Workspace</p>
                        <Menu>
                            <MenuButton className="btnSecondary">
                                {workspaces.find((workspace) => workspace.id === workspaceId)?.name || 'Select workspace'}
                                <ChevronDownIcon className="size-4 fill-white/60" />
                            </MenuButton>
                            <MenuItems
                                transition
                                anchor="bottom start"
                                className="dropdownPanel mt-1"
                            >
                                {workspaces.map((workspace) => (
                                    <MenuItem key={workspace.id}>
                                        <button
                                            className="dropdownItem text-left"
                                            onClick={() => setWorkspaceId(workspace.id)}
                                        >
                                            {workspace.name}
                                        </button>
                                    </MenuItem>
                                ))}
                            </MenuItems>
                        </Menu>
                    </div>

                    <div className="space-y-1">
                        <p className="textLabel">2. Format</p>
                        <div className="flex gap-2">
                            <JsonExporter workspaceId={workspaceId} onExportComplete={handleExportComplete} />
                            <MarkdownExporter workspaceId={workspaceId} onExportComplete={handleExportComplete} />
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <h2 className='text-lg font-medium'>Which format should I use?</h2>
                <p className='textRegular'>
                    <strong>Mintype JSON</strong> is a full, encrypted backup of the workspace and its page hierarchy. Bring it back with the Mintype JSON importer, on any device unlocked with the same keys.
                    <br />
                    <strong>Markdown</strong> gives you readable files to use in other apps. Whiteboards are included as .whiteboard.json files, and the page hierarchy is not kept.
                </p>
            </div>
        </SettingsSkeleton>
    )
}
