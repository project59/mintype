import { Dialog, DialogPanel, DialogTitle, Button, DialogBackdrop } from '@headlessui/react'
import { Link } from 'react-router-dom'

export default function ResetAppModal({ isDialogOpen, onClose, onConfirm }) {

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
                            Reset Mintype
                        </DialogTitle>
                        <div className='space-y-2'>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Whoa there! You're about to reset Mintype. This will clear all your notes, keys and settings. This action cannot be undone.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                We will keep you signed into your account. You can <Link className='text-indigo-500 underline' to="/settings/sync">sign out</Link> first if you want.
                            </p>
                        </div>

                        <div className="mt-4 flex justify-between">
                            <Button
                                className="btnSecondary"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="btnDestructive"
                                onClick={onConfirm}
                            >
                                Confirm
                            </Button>
                        </div>
                    </DialogPanel>

                </div>
            </div>
        </Dialog>
    )
}