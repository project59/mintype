import GoogleDriveNotesApp from "../../drivesync/GoogleDriveClient.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

export default function SyncSettings() {
    return (
        <SettingsSkeleton title="Accounts and Sync">
            <GoogleDriveNotesApp />
        </SettingsSkeleton >
    )
}