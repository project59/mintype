import { useContext, useState } from "react";
import { SecureContext } from "./SecureContext";
import SettingsSkeleton from "../settings/SettingsSkeleton";
import { Key } from "lucide-react";
import { Link } from "react-router-dom";

export default function SecureSettings() {
    const { handleChangePassword, handleExport } =
        useContext(SecureContext);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [usingRec, setUsingRec] = useState(false)

    return (
        <SettingsSkeleton title="Security and Recovery">
            <div className="space-y-8">
                <p className="textRegular">
                    Mintype encrypts your notes locally on your device to keep them safe. <br /> No one else can access your notes without your password or recovery key.
                    {" "}<Link to="/docs/security-overview" className="underline text-indigo-500">Learn how it works</Link>.
                </p>
                <div className="w-full md:max-w-md space-y-2">
                    <h4 className="textTitle">Change Password</h4>
                    <div className="flex gap-2">
                        <input
                            className="baseInput dark:!bg-slate-600/20"
                            placeholder={usingRec ? 'Recovery Key' : 'Old Password'}
                            type="password"
                            value={oldPass}
                            onChange={(e) => setOldPass(e.target.value)}
                        />
                        <button title="Switch Key Type" className="btnPrimary" onClick={() => setUsingRec(!usingRec)}>
                            <Key size={16} />
                        </button>
                    </div>
                    <input
                        className="baseInput dark:!bg-slate-600/20"
                        placeholder="New Password"
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                    />
                    <button
                        className="btnSecondary"
                        onClick={() => handleChangePassword(oldPass, newPass, usingRec)}
                    >
                        Change Password
                    </button>
                </div>

                <div className="space-y-2 max-w-md">
                    <h4 className="textTitle">Export Key Bundle</h4>
                    <p className="textRegular">This file contains your encrypted master key and recovery key. It can be imported during setup to unlock the app and your notes.</p>
                    <p className="infoBox">
                        If you sign into Mintype, we will safetly store an encrypted copy of this file for easy sign in on a new device.
                    </p>
                    <button className="btnPrimary" onClick={handleExport}>
                        Export Master Key File
                    </button>
                </div>

                <div className="space-y-2 max-w-md">
                    <h4 className="textTitle">Reset Mintype</h4>
                    <p className="textRegular">Erase everything Mintype has stored on this device and start again as a new or returning user. Use this to start a new setup, switch to another key, or fix a device where Mintype has stopped working.</p>
                    <div className="infoBox">
                        <p className="textTitle">Warning</p>
                        This removes all notes, keys and settings from this device, including changes that have not synced to Google Drive yet, and signs this device out.
                        Export your notes and your key bundle, or let sync finish, before you reset.
                        <br />
                        <br />
                        This action cannot be undone.
                    </div>

                    {/* A full page load, so the app's open database connections don't hold up the reset. */}
                    <a href="/reset" className="btnPrimary w-fit">
                        Reset Mintype
                    </a>
                </div>
            </div>
        </SettingsSkeleton>
    );
}