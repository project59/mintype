import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";

export default function RecoveryKeyDialog({ recoveryKey, onClose, showDialog, onHandleExport }) {
    const [downloaded, setDownloaded] = useState(false)
    const [mode, setMode] = useState('recovery')
    const downloadRecoveryKey = () => {
        const element = document.createElement("a");
        const file = new Blob([recoveryKey], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = "recovery_key.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();

        setDownloaded(true)
    };

    return (
        <Dialog open={showDialog} onClose={onClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <h2 className="textTitle">{mode === 'recovery' ? '🔑 Your Recovery Key' : '🔑 Key File'}</h2>
                    {mode === 'recovery' && (
                        <>
                            <p className="textRegular mb-4">
                                Please save this recovery key in a safe place. You can use it to recover your encrypted notes if you forget your password.
                            </p>
                            <p className="textRegular mb-4">
                                You will not be able to view this key again!
                            </p>
                            <div className="p-4 bg-slate-400/20 text-black dark:text-white rounded-lg break-all">
                                <code>{recoveryKey}</code>
                            </div>
                            <div className="flex gap-2">
                                <button className="btnSecondary w-full" onClick={downloadRecoveryKey}>
                                    Download Recovery Key
                                </button>
                                <button className="btnPrimary w-full" disabled={!downloaded} onClick={() => setMode('bundle')}>
                                    Continue
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'bundle' && (
                        <>
                            <p className="textRegular mb-4">
                                This key file can be imported during a new setup to access your encrypted data.
                            </p>
                            <img className="dark:hidden" src="/svgs/keyfile.svg" alt="keyfile" />
                            <img className="hidden dark:block" src="/svgs/keyfile-dark.svg" alt="keyfile" />
                            <div className="flex gap-2">
                                <button className="btnSecondary w-full" onClick={onHandleExport}>
                                    Download Key File
                                </button>
                                <button className="btnPrimary w-full" disabled={!downloaded} onClick={onClose}>
                                    Continue
                                </button>
                            </div>
                        </>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}

