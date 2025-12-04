// components/SetupDialog.jsx
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SetupDialog({ onSetup }) {
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("select"); // "new" or "import"
    const [importFile, setImportFile] = useState(null);

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
                alert("Please enter a password");
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
                <DialogPanel transition className="dialogPanel !max-w-xl">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.svg" alt="logo" className="h-7" />
                        <h2 className="text-2xl md:text-3xl font-semibold">
                            {mode === "import" ? "Import Key" : mode === "new" ? "New Setup" : "Welcome to Mintype!"}
                        </h2>
                    </div>
                    {mode === "select" && (
                        <>
                            <div className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-400/20 w-fit textRegular">
                                Secure, private and powerful note taking 🌳
                            </div>
                            {/* <img src="/screenshots/thumbup.png" alt="logo" className="h-20" /> */}

                            {/* <p className="textTitle ml-1">
                                Let's get started...
                            </p> */}
                            <div className="flex gap-2 pt-12">
                                <div className="w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-500/20 p-2 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold">New User?</h4>
                                        <p className="textRegular">
                                            Start using Mintype from scratch.
                                        </p>
                                    </div>
                                    <button className="btnPrimary w-fit" onClick={() => setMode("new")}>
                                        New Setup
                                    </button>
                                </div>
                                <div className="w-full flex flex-col gap-4 justify-between bg-slate-50 dark:bg-slate-500/20 p-2 rounded-lg">
                                    <div>
                                        <h4 className="font-semibold">Setting up on a new device?</h4>
                                        <p className="textRegular">
                                            Import your existing keys and notes onto this device.
                                        </p>
                                    </div>
                                    <button
                                        className="btnSecondary w-fit"
                                        onClick={() => setMode("import")}
                                    >
                                        Import Key
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
                                    Complete Setup
                                </button>
                            </div>
                        </>
                    )}

                    {mode === "import" && (
                        <>
                            <p className="textRegular">
                                Import your master key JSON file to access your notes.
                            </p>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportFile}
                                className="w-full mb-3"
                            />
                            <div className="flex gap-2">
                                <button
                                    className="btnSecondary w-fit"
                                    onClick={() => setMode("select")}
                                >
                                    Back
                                </button>
                                <button
                                    className="btnPrimary w-fit"
                                    disabled={!importFile}
                                    onClick={() => onSetup(null, true, importFile)}
                                >
                                    Import Key
                                </button>
                            </div>
                        </>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}
