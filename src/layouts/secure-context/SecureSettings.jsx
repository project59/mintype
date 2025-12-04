import { useContext, useState } from "react";
import { SecureContext } from "./SecureContext";
import SettingsSkeleton from "../settings/SettingsSkeleton";
import ResetAppModal from "./ResetAppModal";

export default function SecureSettings() {
    const { handleChangePassword, handleReset, handleExport } =
        useContext(SecureContext);
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [showResetDialog, setShowResetDialog] = useState(false);

    return (
        <SettingsSkeleton title="Security and Recovery">
            <div className="space-y-8">
                <p className="textRegular">
                    Mintype encrypts your notes locally on your device to keep them safe. <br /> No one else can access your notes without your password or recovery key.
                </p>
                <div className="w-full md:max-w-md space-y-2">
                    <h4 className="textTitle">Change Password</h4>
                    <input
                        className="baseInput"
                        placeholder="Old Password"
                        type="password"
                        value={oldPass}
                        onChange={(e) => setOldPass(e.target.value)}
                    />
                    <input
                        className="baseInput"
                        placeholder="New Password"
                        type="password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                    />
                    <button
                        className="btnSecondary"
                        onClick={() => handleChangePassword(oldPass, newPass)}
                    >
                        Change Password
                    </button>
                </div>

                <div className="space-y-2 max-w-md">
                    <h4 className="textTitle">Export Keys</h4>
                    <p className="textRegular">Import this file on a new device to unlock your encrypted notes on the new device. It is important that you keep this file safetly stored at all times, and do not use another one.</p>
                    <button className="btnPrimary" onClick={handleExport}>
                        Export Master Key File
                    </button>
                </div>

                <div className="space-y-2 max-w-md">
                    <h4 className="textTitle">Reset Mintype</h4>
                    <p className="textRegular">Clear your local keys and notes on this device. You can do this if you want to start a new setup, or import another key.</p>
                    <div className="bg-red-400/30 p-3 text-red-700 dark:text-red-200 rounded-lg text-sm">
                        <p className="font-semibold text-base text-red-900 dark:text-white">Warning</p>
                        This action will remove all your notes from this device. It will also clear any queued notes which have not been synced yet.
                        Make sure you have exported a local copy of your notes or synced them to Google Drive.
                        <br />
                        <br />
                        Make sure you have exported the master key file as well if you wish to recover your notes.
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