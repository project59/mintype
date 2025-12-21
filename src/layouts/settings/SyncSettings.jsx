import GoogleDriveAuthorize from "../../drivesync/GoogleDriveAuthorize.jsx";
import GoogleDriveLogin from "../../drivesync/GoogleDriveLogin.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

export default function SyncSettings() {
    return (
        <SettingsSkeleton title="Accounts and Sync">
            <GoogleDriveLogin />
            <GoogleDriveAuthorize />
        </SettingsSkeleton >
    )
}