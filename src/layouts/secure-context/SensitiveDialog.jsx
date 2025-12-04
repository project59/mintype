// components/PasswordPrompt.jsx
import { Button, Dialog, DialogBackdrop, DialogPanel, Input } from "@headlessui/react";
import { KeyRound } from "lucide-react";
import { useState } from "react";

export default function SensitiveDialog({ onSubmit }) {
    const [password, setPassword] = useState("");
    let [isOpen, setIsOpen] = useState(false)

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    // on pressing Enter key, submit the form
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            onSubmit(password, false);
        }
    };

    return (
        <>
            <div className='h-full w-full flex flex-col gap-3 items-center justify-center bg-white dark:bg-[#1f1f2d]'>
                <div className='dark:text-white text-gray-700'>
                    This page is sensitive.
                </div>

                <Button
                    onClick={open}
                    className="btnSecondary flex items-center gap-2"
                >
                    <KeyRound size={14} />
                    Enter Password
                </Button>
            </div>
            <Dialog className="relative z-50" open={isOpen} onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop !z-[60]" />
                <div className="dialogWrapper !z-[70]">
                    <DialogPanel transition className="dialogPanel">
                        <h2 className="textTitle">
                            {"Enter Password"}
                        </h2>
                        <Input
                            type="password"
                            className="baseInput"
                            autoFocus
                            value={password}
                            onKeyDown={handleKeyDown}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={"Password"}
                            autocomplete="off"
                        />
                        <button
                            className="btnPrimary w-full mb-2"
                            onClick={() => onSubmit(password, false)}
                        >
                            Unlock
                        </button>
                    </DialogPanel>
                </div>

            </Dialog>
        </>
    );
}
