import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import { useGoogleDrive } from './GoogleDriveContext.jsx';
import StatusChip from '../components/common/StatusChip.jsx'
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import ProgressBar from './ProgressBar.jsx';

const GoogleDriveNotesApp = () => {
    const { user, signInWithGoogle, signOut } = useSupabaseAuth();
    const {
        hasAuth,
        gapiInitialized,
        driveAuthorized,
        driveConfigured,
        canSync,
        needsSetup,
        authorizeDriveAccess,
        ensureAppFolder,
        syncRemoteState,
    } = useGoogleDrive();

    const handleSignIn = async () => {
        toast.loading('Signing in...');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in failed:', error);
            toast.error('Sign in failed');
        }
    }

    const handleSignOut = async () => {
        toast.success('Signing out...');
        try {
            await signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
            toast.error('Sign out failed');
        }
    }

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
            {/* Authentication Section */}
            <section className="flex flex-col gap-2">
                <h2 className="textTitle">Mintype Account</h2>
                <div className="textRegular">
                    Sign in to Mintype to allow syncing your notes to Google Drive.
                </div>
                {user ? (
                    <div className="mt-2 flex flex-col gap-2">
                        <StatusChip message={'Signed in as: ' + user.email} type={'success'} />
                        <div className='flex gap-2'>
                            <Link to={'/settings/profile'} className="btnSecondary w-fit">
                                My Profile
                            </Link>
                            <button onClick={handleSignOut} className="btnDestructive w-fit">
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className='mt-4 flex flex-col gap-2'>
                        <StatusChip message={'Not signed in'} type={'warning'} />
                        <button onClick={handleSignIn} className="btnPrimary w-fit">
                            Sign in with Google
                        </button>
                    </div>
                )}
            </section>

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

export default GoogleDriveNotesApp;