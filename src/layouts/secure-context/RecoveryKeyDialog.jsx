import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";

export default function RecoveryKeyDialog({ recoveryKey, onClose, showDialog }) {
    const downloadRecoveryKey = () => {
        const element = document.createElement("a");
        const file = new Blob([recoveryKey], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = "recovery_key.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    };

    return (
        <Dialog open={showDialog} onClose={onClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <h2 className="textTitle">Your Recovery Key</h2>
                    <p className="textRegular mb-4">
                        Please save this recovery key in a safe place. You can use it to recover your encrypted data if you forget your password.
                    </p>
                    <div className="p-4 bg-slate-400/20 text-black dark:text-white rounded-lg break-all">
                        <code>{recoveryKey}</code>
                    </div>

                    <div className="flex gap-2">
                        <button className="btnSecondary w-full" onClick={downloadRecoveryKey}>
                            Download Recovery Key
                        </button>
                        <button className="btnPrimary w-full" onClick={onClose}>
                            I have saved my recovery key
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}

