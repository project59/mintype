// components/SetupDialog.jsx
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";
import toast from "react-hot-toast";
import MintypeSetupLogin from "../../drivesync/MintypeSetupLogin";
import { BadgePlus, Import, Upload, X } from "lucide-react";
import { useSupabaseAuth } from "../auth/SupabaseAuthProvider";

export default function SetupDialog({ onSetup }) {
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("select"); // "new" or "import"
    const [importFile, setImportFile] = useState(null);
    const { user } = useSupabaseAuth();

    // if user, set the mode to import
    if (user && mode === "select") {
        setMode("import");
    }

    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                setImportFile(data);
                toast.success("File uploaded successfully");
            } catch {
                toast.error("Invalid file format");
            }
        };
        reader.readAsText(file);
    };

    const handleOnSetup = () => {
        if (mode === "new") {
            // make sure there is a password
            if (password === "") {
                toast.error("Please enter a password");
                return;
            }

            onSetup(password);
        } else if (mode === "import") {
            onSetup(importFile);
        }
    };

    return (
        <Dialog open={true} onClose={() => { }}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel !max-w-lg">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.svg" alt="logo" className="h-7" />
                        <h2 className="text-2xl md:text-3xl font-semibold">
                            {mode === "import" ? "Import Notes" : mode === "new" ? "Set Password" : "Welcome to Mintype!"}
                        </h2>
                    </div>
                    {mode === "select" && (
                        <>
                            <div className="px-2 py-1 rounded-full bg-indigo-100 dark:bg-slate-400/20 w-fit textRegular">
                                Secure, private and powerful note taking
                            </div>
                            <div className="flex gap-2 pt-12">
                                <div className="w-full flex flex-col justify-between bg-emerald-50 dark:bg-slate-500/20 p-2 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold">New User?</h4>
                                        <p className="textRegular">
                                            Create a new Mintype setup and encryption keys
                                        </p>
                                    </div>
                                    <button className="btnPrimary w-fit" onClick={() => setMode("new")}>
                                        New Setup <BadgePlus size={14} className="inline-block ml-1" />
                                    </button>
                                </div>
                                <div className="w-full flex flex-col gap-4 justify-between bg-yellow-100 dark:bg-slate-500/20 p-2 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold">Returning User?</h4>
                                        <p className="textRegular">
                                            Import your existing keys and notes onto this device
                                        </p>
                                    </div>
                                    <button
                                        className="btnPrimary w-fit"
                                        onClick={() => setMode("import")}
                                    >
                                        Import Notes <Import size={14} className="inline-block ml-1" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    {mode === "new" && (
                        <>
                            <p className="textRegular">
                                Create a password to protect your notes. We will secure all your notes with this password. Don't worry, you can change it later.
                            </p>
                            <input
                                type="password"
                                className="baseInput"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                            <div className="flex gap-2">
                                <button
                                    className="btnSecondary w-fit"
                                    onClick={() => setMode("select")}
                                >
                                    Back
                                </button>
                                <button className="btnPrimary w-fit mb-2" onClick={handleOnSetup}>
                                    Confirm
                                </button>
                            </div>
                        </>
                    )}

                    {mode === "import" && (
                        <>
                            <div className="flex gap-2 items-center">

                                <h3 className="textTitle">
                                    Choose Import Method
                                </h3>
                            </div>
                            <div className={`w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-500/20 p-3 rounded-xl border border-slate-400/20 ${importFile ? "opacity-50 pointer-events-none" : ""}`}>
                                <h3 className="textTitle">Sign In</h3>
                                <p className="textRegular">
                                    Sign in to your Mintype account and we will fetch your encrypted keys
                                </p>
                                <MintypeSetupLogin onComplete={() => setMode("success")} onReset={() => setMode("select")} />
                            </div>
                            <div className={`w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-500/20 p-3 rounded-xl border border-slate-400/20 ${user ? "opacity-50 pointer-events-none" : ""}`}>
                                <h3 className="textTitle">Offline Users</h3>
                                <p className="textRegular">
                                    Import your master key JSON file to access your notes
                                </p>

                                <div className="flex gap-2 mt-4">
                                    <label className="w-full flex-1">
                                        <div className="w-full h-9 rounded-3xl bg-slate-200 dark:bg-slate-800/60 justify-between items-center inline-flex">
                                            <h2 className="text-gray-900/50 text-sm font-normal leading-snug pl-4">
                                                {importFile ? "File Loaded!" : "Choose Key File"}
                                            </h2>
                                            <input type="file"
                                                accept=".json" hidden onChange={handleImportFile} />
                                            <div className="flex w-12 h-full px-2 flex-col bg-indigo-500 rounded-r-3xl shadow text-white text-xs font-semibold leading-4 
                                       items-center justify-center cursor-pointer focus:outline-none">
                                                <Upload size={14} />
                                            </div>
                                        </div>
                                    </label>
                                    {importFile && (
                                        <button title="Remove File" className="btnSecondary" onClick={() => setImportFile(null)}>
                                            <X size={14} />
                                        </button>
                                    )}

                                </div>
                            </div>
                            <div className="flex justify-between">

                                <button
                                    className="btnSecondary w-fit"
                                    onClick={() => setMode("select")}
                                >
                                    Back
                                </button>
                                <button
                                    title="Import File"
                                    className={`btnPrimary w-fit ${!importFile ? "invisible" : ""}`}
                                    disabled={!importFile}
                                    onClick={() => onSetup(null, true, importFile)}
                                >
                                    Import Key
                                </button>
                            </div>
                        </>
                    )}

                    {/* mode = success */}
                    {mode === "success" && (
                        <div className="flex flex-col gap-4">
                            <p className="textRegular">
                                Setup complete! Your key has been setup to protect your notes. You can now create and access your notes.
                            </p>
                            <button
                                className="btnPrimary w-fit"
                                onClick={() => {
                                    window.location.reload();
                                }}
                            >
                                Continue
                            </button>
                        </div>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}
