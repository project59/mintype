import { useGoogleDrive } from './GoogleDriveContext.jsx';
import StatusChip from '../components/common/StatusChip.jsx'
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import ProgressBar from './ProgressBar.jsx';

const GoogleDriveAuthorize = () => {
    const {
        hasAuth,
        gapiInitialized,
        driveAuthorized,
        driveConfigured,
        canSync,
        needsSetup,
        authorizeDriveAccess,
        ensureAppFolder,
    } = useGoogleDrive();


    const isOnline = useOnlineStatus();

    if (!isOnline) {
        return (
            <div className="flex flex-col gap-2 text-gray-400">
                <h2 className="textTitle">Offline</h2>
                <div className="textRegular">
                    You are offline. Please check your internet connection and try again.
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 text-gray-400">
            {/* Only show sync settings if user is signed in */}
            {hasAuth && (
                <>
                    {/* Google Drive Sync Section */}
                    <section className="flex flex-col gap-3">
                        <h2 className="textTitle">Google Drive Sync</h2>

                        {/* Loading Google API */}
                        {!gapiInitialized && (
                            <StatusChip message={'Loading Google Drive API...'} type={'info'} />
                        )}

                        {/* Step 1: Authorize Drive */}
                        {gapiInitialized && !driveAuthorized && (
                            <div className="flex flex-col gap-2">
                                <StatusChip message={'Drive access not authorized'} type={'warning'} />
                                <p className="textRegular max-w-md">
                                    Authorize Mintype to access your Google Drive. We can only access files created by Mintype, not your entire Google Drive. <br /><br /> This will open a new window.
                                </p>
                                <button className="btnPrimary w-fit" onClick={authorizeDriveAccess}>
                                    Authorize Drive Access
                                </button>
                            </div>
                        )}

                        {/* Step 2: Configure Drive (create folder/file) */}
                        {driveAuthorized && !driveConfigured && (
                            <div className="flex flex-col gap-2">
                                <StatusChip message={'Configure Google Drive'} type={'warning'} />
                                <p className="textRegular max-w-md">
                                    One more step 👉 This will create or find a Mintype folder and metadata file in your Google Drive to complete setup
                                </p>
                                <button className="btnPrimary w-fit" onClick={ensureAppFolder}>
                                    Configure Google Drive
                                </button>
                            </div>
                        )}

                        {/* Step 3: Ready to sync or needs key */}
                        {driveAuthorized && driveConfigured && (
                            <div className="flex flex-col gap-3">
                                <StatusChip message={'Drive configured'} type={'success'} />

                                {canSync ? (
                                    <div className="flex flex-col gap-2">
                                        <StatusChip message={'Automatic sync enabled'} type={'success'} />
                                        <ProgressBar />
                                        <p className="textRegular max-w-md">
                                            Auto-sync runs every 30 seconds. We will keep your notes up to date in the background.
                                            Click the cloud icon in the top right to see the current sync status.
                                        </p>
                                    </div>
                                ) : (
                                    <StatusChip message={'Setup incomplete'} type={'warning'} />
                                )}
                            </div>
                        )}

                        {/* Debug info in development */}
                        {import.meta.env.DEV && (
                            <details className="text-xs text-gray-600 mt-4">
                                <summary className="cursor-pointer">Debug Info</summary>
                                <pre className="mt-2 p-2 bg-gray-800 rounded">
                                    {JSON.stringify(
                                        {
                                            hasAuth,
                                            gapiInitialized,
                                            driveAuthorized,
                                            driveConfigured,
                                            canSync,
                                            needsSetup,
                                        },
                                        null,
                                        2
                                    )}
                                </pre>
                            </details>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default GoogleDriveAuthorize;