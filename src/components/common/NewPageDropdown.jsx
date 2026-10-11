import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import dbService from "../../lib/dbService.js";
import { FileText, PanelsTopLeft, Plus } from "lucide-react";
import { newPageSchema } from "../../utils/constants.js";
import { useContext } from "react";
import { SecureContext } from "../../layouts/secure-context/SecureContext.jsx";
export default function NewPageDropdown({ rootId, quickNote = false }) {
    const { masterKey } = useContext(SecureContext);
    return (
        <Menu>
            <MenuButton className="p-0.5 flex items-center justify-center rounded-lg border text-indigo-900 border-indigo-400/50 dark:text-white bg-indigo-400/20 dark:bg-indigo-500/40" title="Add New Page">
                <Plus size={12} />
            </MenuButton>

            <MenuItems
                transition
                anchor="bottom end"
                className="dropdownPanel mt-2"
            >
                <MenuItem>
                    <button
                        className="dropdownItem"
                        onClick={() => dbService.addEntry({
                            id: null, newContent: newPageSchema('document'), parentId: quickNote ? 'quickNote' : rootId, rootId: rootId, masterKey
                        })}
                        title="Add new page"
                    >
                        <FileText className="text-blue-400" size={14} />
                        New Page
                    </button>
                </MenuItem>
                <MenuItem>
                    <button
                        className="dropdownItem"
                        onClick={() => dbService.addEntry({
                            id: null, newContent: newPageSchema('whiteboard'), parentId: quickNote ? 'quickNote' : rootId, rootId: rootId, masterKey
                        })}
                        title="Add new page"
                    >
                        <PanelsTopLeft className="text-indigo-400" size={14} />
                        New Whiteboard
                    </button>
                </MenuItem>
            </MenuItems>
        </Menu>
    )
}