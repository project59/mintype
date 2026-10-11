// components/PasswordPrompt.jsx
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";

export default function PasswordPrompt({ onSubmit }) {
    const [password, setPassword] = useState("");
    const [useRecovery, setUseRecovery] = useState(false);

    // on pressing Enter key, submit the form
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            onSubmit(password, useRecovery);
        }
    };

    return (
        <Dialog open={true} onClose={() => { }}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel className="dialogPanel">
                    <h2 className="textTitle">
                        {useRecovery ? "Enter Recovery Key" : "Enter Password"}
                    </h2>
                    <input
                        type="password"
                        className="baseInput"
                        tabIndex={4}
                        data-autofocus
                        value={password}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={useRecovery ? "Recovery Key" : "Password"}
                    />

                    <div className="flex justify-between items-end">
                        <button
                        tabIndex={2}
                            className="textLabel !text-xs ml-1"
                            onClick={() => setUseRecovery(!useRecovery)}
                        >
                            {useRecovery ? "Use Password 🔑" : "Use Recovery Key 🗝️"}
                        </button>
                        <button
                        tabIndex={1}
                            className="btnPrimary w-fit"
                            onClick={() => onSubmit(password, useRecovery)}
                        >
                            Unlock
                        </button>
                    </div>

                    {/* A full page load, so this page's database connections don't hold up the reset. */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        Forgot both your password and recovery key, or can't unlock? <a tabIndex={3} href="/reset" className="underline">Reset</a>
                    </p>

                </DialogPanel>
            </div>
        </Dialog>
    );
}
