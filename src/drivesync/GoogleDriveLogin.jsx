import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import StatusChip from '../components/common/StatusChip.jsx'
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import { useContext, useEffect, useState } from 'react';
import { SecureContext } from '../layouts/secure-context/SecureContext.jsx';
import dbService from '../lib/dbService.js';
import { buildLocalBundle, fetchAccountBundle, storeBundleLocally, uploadAccountBundle } from '../lib/keyBundle.js';
import { useSync } from './SyncProvider.jsx';

const GoogleDriveLogin = () => {
    const { user, accessToken, signInWithGoogle, signOut } = useSupabaseAuth();
    const { handleLockApp, accountKeyStatus, syncAccountKey } = useContext(SecureContext);
    const { keyMismatch } = useSync();

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

    const keyConflict = accountKeyStatus === 'conflict';
    // When the account holds a different key: whether this device has no notes that switching to
    // the account's key would make unreadable.
    const [canRestore, setCanRestore] = useState(false);
    const [confirmReplace, setConfirmReplace] = useState(false);

    useEffect(() => {
        if (keyConflict) dbService.getAllEntries().then((entries) => setCanRestore(entries.length === 0));
    }, [keyConflict]);

    // Sync found Drive data this device's key can't read: check whether the account's key could.
    useEffect(() => {
        if (keyMismatch) syncAccountKey(true);
    }, [keyMismatch, syncAccountKey]);

    const restoreAccountKey = async () => {
        try {
            if ((await dbService.getAllEntries()).length > 0) {
                setCanRestore(false);
                return;
            }
            const bundle = await fetchAccountBundle(accessToken);
            if (!bundle) {
                toast.error('No key is saved to this account anymore.');
                return;
            }
            await storeBundleLocally(bundle);
            await dbService.clearNotes();
            await dbService.clearSyncQueue();
            toast.success("Account key restored. Unlock with your account's password.");
            handleLockApp();
        } catch (error) {
            console.error('Failed to restore account key:', error);
            toast.error('Could not restore the account key.');
        }
    };

    const replaceAccountKey = async () => {
        try {
            const refusal = await uploadAccountBundle(accessToken, await buildLocalBundle(), { replace: true });
            setConfirmReplace(false);
            await syncAccountKey(true);
            if (refusal) toast.error('Your account changed meanwhile. Please check the key status again.');
            else toast.success("This device's key is now saved to your account.");
        } catch (error) {
            console.error('Failed to replace account key:', error);
            toast.error('Could not save the key to your account.');
        }
    };

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
                        {keyMismatch && accountKeyStatus && !keyConflict && (
                            <div className="mt-2 flex max-w-md flex-col gap-2">
                                <StatusChip message={'Google Drive notes use an older key'} type={'warning'} />
                                <p className="textRegular">
                                    Your account's saved key is the same as this device's, so it cannot read the notes on Google Drive either. They can only be opened with the key backup file downloaded when that key was set up: reset Mintype, choose Returning User and import that file.
                                </p>
                            </div>
                        )}
                        {keyConflict && (
                            <div className="mt-2 flex max-w-md flex-col gap-2">
                                <StatusChip message={'Your account has a different encryption key'} type={'warning'} />
                                <p className="textRegular">
                                    Notes synced from your other devices are encrypted with the key saved to your account. This device was set up with a different key, so it cannot read them, and its key was not saved to your account.
                                </p>
                                {canRestore ? (
                                    <button onClick={restoreAccountKey} className="btnPrimary w-fit">
                                        Use My Account's Key
                                    </button>
                                ) : (
                                    <p className="textRegular">
                                        To use your account's key here, export this device's notes, reset Mintype, choose Returning User to pull your keys, then import the notes.
                                    </p>
                                )}
                                {confirmReplace ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="textRegular">
                                            Notes encrypted with your account's current key, on Google Drive and on your other devices, will not be readable by devices set up from now on. Only continue if that key's password, recovery key and key backup are lost.
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setConfirmReplace(false)} className="btnSecondary w-fit">
                                                Cancel
                                            </button>
                                            <button onClick={replaceAccountKey} className="btnDestructive w-fit">
                                                Replace Account Key
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmReplace(true)} className="btnSecondary w-fit">
                                        Replace Account Key With This Device's
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className='mt-4 flex flex-col gap-2'>
                        <StatusChip message={'Not signed in'} type={'warning'} />
                        <div className="textRegular max-w-md">
                            Mintype uses web browser storage to save your notes. This means that manual or automatic clearing of browser data will erase your notes!
                            <br /><br />
                            Setup sync to Google Drive to keep them stored safely and accessible on all your devices.
                        </div>
                        <button onClick={handleSignIn} className="btnPrimary w-fit">
                            Sign in with Google
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default GoogleDriveLogin;