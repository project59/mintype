import { useContext, useState } from "react";
import { SecureContext } from "./SecureContext";
import SettingsSkeleton from "../settings/SettingsSkeleton";
import ResetAppModal from "./ResetAppModal";
import { Key } from "lucide-react";

export default function SecureSettings() {
    const { handleChangePassword, handleReset, handleExport } =
        useContext(SecureContext);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [usingRec, setUsingRec] = useState(false)
    const [showResetDialog, setShowResetDialog] = useState(false);

    return (
        <SettingsSkeleton title="Security and Recovery">
            <div className="space-y-8">
                <p className="textRegular">
                    Mintype encrypts your notes locally on your device to keep them safe. <br /> No one else can access your notes without your password or recovery key.
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
                    <p className="textRegular">Clear your local keys and notes on this device. You can do this if you want to start a new setup, or import another key.</p>
                    <div className="infoBox">
                        <p className="textTitle">Warning</p>
                        This action will remove all your notes from this device. It will also clear any queued notes which have not been synced yet.
                        Make sure you have exported a local copy of your notes or synced them to Google Drive.
                        <br />
                        <br />
                        Make sure you have exported the key budle as well if you wish to recover your notes.
                        <br />
                        <br />
                        This action cannot be undone.
                    </div>

                    <button className="btnPrimary" onClick={() => setShowResetDialog(true)}>
                        Reset Mintype
                    </button>
                </div>
            </div>
            <ResetAppModal
                isDialogOpen={showResetDialog}
                onClose={() => setShowResetDialog(false)}
                onConfirm={handleReset}
            />
        </SettingsSkeleton>
    );
}