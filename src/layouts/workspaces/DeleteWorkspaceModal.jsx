import { Dialog, DialogPanel, DialogTitle, Button, DialogBackdrop } from '@headlessui/react'
import dbService from '../../lib/dbService.js';
import { useNavigate } from 'react-router-dom';

export default function DeleteWorkspaceModal({ workspaceId, isDialogOpen, onClose }) {
    const navigate = useNavigate();
    const handleDeleteWorkspace = async () => {
        try {
            await dbService.deleteEntry({ id: workspaceId });
            navigate("/workspace");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={isDialogOpen} as="div" className="relative z-20 focus:outline-none" onClose={onClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle as="h3" className="text-base/7 font-medium text-black dark:text-white">
                            Delete Workspace
                        </DialogTitle>
                        <p>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Are you sure you want to delete this workspace? All pages within this workspace will also be deleted.
                                They will also be permanently deleted from your Google Drive.
                            </span>
                        </p>

                        <div className="mt-4 flex justify-between">
                            <Button
                                className="btnSecondary"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="btnDestructive"
                                onClick={handleDeleteWorkspace}
                            >
                                Delete
                            </Button>
                        </div>
                    </DialogPanel>

                </div>
            </div>
        </Dialog>
    )
}