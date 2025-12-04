import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useEffect, useState } from 'react'
import dbService from '../../lib/dbService';
import { ChevronDownIcon } from 'lucide-react';

export default function MoveToWorkspaceDialog({ pageId, isDialogOpen, onClose }) {
    const [newRootId, setNewRootId] = useState('');
    const [allRoots, setAllRoots] = useState([]);
    const handleMovePage = async () => {
        await dbService.movePagesToWorkspace(pageId, newRootId, newRootId);
        onClose();
    }

    // on open, we want to show fetch all roots to display in a dropdown
    useEffect(() => {
        const fetchRoots = async () => {
            const roots = await dbService.getAllRootMeta();
            setAllRoots(roots);
        }
        fetchRoots();
    }, [isDialogOpen])

    return (
        <>
            <Dialog open={isDialogOpen} className="relative z-50 focus:outline-none" onClose={onClose}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle as="h3" className="text-lg font-medium text-black dark:text-white">
                            Move this Page
                        </DialogTitle>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            You can move this page and its sub-pages to another workspace.
                        </p>
                        {/* headless UI dropdown of roots */}
                        <Menu>
                            <MenuButton className="btnSecondary">
                                {newRootId ? allRoots.find((root) => root.id === newRootId).name : 'Select workspace'}
                                <ChevronDownIcon className="size-4 fill-white/60" />
                            </MenuButton>

                            <MenuItems
                                transition
                                anchor="bottom start"
                                className="dropdownPanel"
                            >
                                {allRoots.map((root) => (
                                    <MenuItem key={root.id}>
                                        <button
                                            className="dropdownItem"
                                            onClick={() => setNewRootId(root.id)}
                                        >
                                            {root.name}
                                        </button>
                                    </MenuItem>
                                ))}
                            </MenuItems>
                        </Menu>


                        <div className="mt-4 flex justify-between">
                            <Button
                                className="btnSecondary"
                                onClick={onClose}
                            >
                                Close
                            </Button>
                            <Button
                                className="btnPrimary"
                                onClick={handleMovePage}
                            >
                                Move
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
