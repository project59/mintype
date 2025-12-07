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
                    <div className="infoBox">
                        NOTE: Mintype is currently in beta. Data loss is possible, bugs and glitches are expected. Thank you for using Mintype 🎄
                    </div>
                    <input
                        type="password"
                        className="baseInput"
                        autoFocus
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

                </DialogPanel>


            </div>

        </Dialog>
    );
}
