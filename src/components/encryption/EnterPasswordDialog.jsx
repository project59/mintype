import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Input } from '@headlessui/react'
import { useState } from 'react'
import { KeyRound } from 'lucide-react';

export default function EnterPasswordDialog({ handleSubmit, showPasswordDialog }) {
    let [isOpen, setIsOpen] = useState(false)
    const [password, setPassword] = useState("");

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    const handleDecrypt = () => {
        handleSubmit(password);
        close();
    }
    if (!showPasswordDialog) return null;
    return (
        <>
        <div className='h-full w-full flex flex-col gap-3 items-center justify-center bg-white dark:bg-[#1f1f2d] rounded-t-xl'>
            <div className='dark:text-white text-gray-700'>
                This page is encrypted.
            </div>

            <Button
                onClick={open}
                className="btnSecondary flex items-center gap-2"
                >
                <KeyRound size={14} />
                Enter Password
            </Button>
                </div>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle as="h3" className="text-lg font-medium text-black">
                            Unlock this page
                        </DialogTitle>
                        <p className="mt-2 text-sm text-gray-500">
                            This is an encrypted page. Please enter the password to view this page.
                        </p>
                        <Input type="password" name='password' autoFocus placeholder="Password" className="mt-4 baseInput text-black" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <div className="mt-4 flex justify-between">
                            <Button
                                className="btnSecondary"
                                onClick={close}
                            >
                                Close
                            </Button>
                            <Button
                                className="btnPrimary"
                                onClick={handleDecrypt}
                            >
                                Unlock
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
