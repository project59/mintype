import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import StatusChip from '../components/common/StatusChip.jsx'
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import { getItem } from '../layouts/secure-context/dbUtils.js';
import { useEffect } from 'react';

const GoogleDriveLogin = () => {
    const { user, accessToken, signInWithGoogle, signOut } = useSupabaseAuth();

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

    const saveBundleToSupabase = async () => {
        console.log('Saving bundle to Supabase...');
        const salt = await getItem("salt");
        const { iv, ciphertext } = await getItem("master_key_enc");
        const recoveryKeyEnc = await getItem("recovery_key_enc");
        const recoverySalt = await getItem("recovery_salt");

        if (!salt || !iv || !ciphertext) {
            console.error('Missing encryption data, cannot save bundle.');
            return;
        }
        const bundle_tokens = {
            version: 1,
            iterations: 800000,
            salt: btoa(String.fromCharCode(...salt)),
            iv: btoa(String.fromCharCode(...iv)),
            ciphertext: btoa(String.fromCharCode(...ciphertext)),
            recoveryKeyEnc: recoveryKeyEnc
                ? {
                    iv: btoa(String.fromCharCode(...recoveryKeyEnc.iv)),
                    ciphertext: btoa(String.fromCharCode(...recoveryKeyEnc.ciphertext))
                }
                : null,
            recoverySalt: recoverySalt
                ? btoa(String.fromCharCode(...recoverySalt))
                : null,
            created: new Date().toISOString(),
        };
        console.log('Bundle to be saved:', bundle_tokens);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/set-bundle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ bundle_tokens })
            });

            if (!response.ok) {
                console.error('Failed to save bundle:', response.statusText);
            } else {
                console.log('Bundle saved successfully.');
                localStorage.setItem('bundleSaved', 'true');
            }
        } catch (error) {
            console.error('Error saving bundle:', error);
        }
    };

    useEffect(() => {
        const bundleSaved = localStorage.getItem('bundleSaved');
        if (user && accessToken && bundleSaved === 'false') {
            saveBundleToSupabase();
        }
    }, [user, accessToken]);

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