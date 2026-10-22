import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { CheckCheck, Copy, Download } from "lucide-react";
import { useRef, useState } from "react";

// Shown once, right after setup. It can't be dismissed: the key is never shown again, so the user
// confirms they saved it before continuing.
export default function RecoveryKeyDialog({ recoveryKey, onClose, showDialog, onDownloadKeyFile }) {
    const [saved, setSaved] = useState(false)
    const [copied, setCopied] = useState(false)
    const [copyFailed, setCopyFailed] = useState(false)
    const keyRef = useRef(null)

    const downloadRecoveryKey = () => {
        const element = document.createElement("a");
        const file = new Blob([recoveryKey], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = "mintype_recovery_key.txt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        element.remove();
    };

    const copyRecoveryKey = async () => {
        try {
            await navigator.clipboard.writeText(recoveryKey);
            setCopyFailed(false);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Select the key so it can be copied by hand.
            window.getSelection()?.selectAllChildren(keyRef.current);
            setCopyFailed(true);
        }
    };

    return (
        <Dialog open={showDialog} onClose={() => { }}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <h2 className="textTitle">🔑 Save your recovery key</h2>
                    <p className="textRegular">
                        If you forget your password, this key is the only way to unlock your notes. Keep it somewhere safe, it won't be shown again.
                    </p>
                    <div className="p-4 bg-slate-400/20 text-black dark:text-white rounded-lg break-all select-all">
                        <code ref={keyRef}>{recoveryKey}</code>
                    </div>
                    {copyFailed && (
                        <p className="text-xs text-red-500">Couldn't copy automatically. The key is selected, so copy it yourself, or download it.</p>
                    )}
                    <div className="flex gap-2">
                        <button className="btnSecondary w-full gap-2" onClick={copyRecoveryKey}>
                            {copied ? <><CheckCheck size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                        <button className="btnSecondary w-full gap-2" onClick={downloadRecoveryKey}>
                            <Download size={14} /> Download
                        </button>
                    </div>
                    <label className="flex items-center gap-2 textRegular cursor-pointer">
                        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
                        I've saved my recovery key somewhere safe
                    </label>
                    <button className="btnPrimary w-full" disabled={!saved} onClick={onClose}>
                        Continue
                    </button>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
