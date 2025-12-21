import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import StatusChip from '../components/common/StatusChip.jsx'
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import { setItem } from '../layouts/secure-context/dbUtils.js';
import { useState } from 'react';

const MintypeSetupLogin = ({ onComplete, onReset }) => {
    const { user, accessToken, signInWithGoogle, signOut } = useSupabaseAuth();
    const [keyError, setKeyError] = useState(false)

    const handleSignIn = async () => {
        toast.loading('Signing in...');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in failed:', error);
            toast.error('Sign in failed');
        }
    }

    // function to pull users keys from supabase after sign in
    const pullUserKeys = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/get-bundle`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // if the data does not have bundle tokens or they are null, show error
                if (!data.bundle_tokens || !data.bundle_tokens.salt || !data.bundle_tokens.iv || !data.bundle_tokens.ciphertext) {
                    toast.error('No keys found for this user. Please set up your keys first.');
                    setKeyError(true);
                    return;
                }

                // set the data to local storage or indexed db as needed
                await setItem("salt", new Uint8Array(atob(data.bundle_tokens.salt).split('').map(c => c.charCodeAt(0))));
                await setItem("master_key_enc", {
                    iv: new Uint8Array(atob(data.bundle_tokens.iv).split('').map(c => c.charCodeAt(0))),
                    ciphertext: new Uint8Array(atob(data.bundle_tokens.ciphertext).split('').map(c => c.charCodeAt(0)))
                });
                await setItem("recovery_key_enc", data.bundle_tokens.recoveryKeyEnc ? {
                    iv: new Uint8Array(atob(data.bundle_tokens.recoveryKeyEnc.iv).split('').map(c => c.charCodeAt(0))),
                    ciphertext: new Uint8Array(atob(data.bundle_tokens.recoveryKeyEnc.ciphertext).split('').map(c => c.charCodeAt(0)))
                } : null);
                await setItem("recovery_salt", data.bundle_tokens.recoverySalt ? new Uint8Array(atob(data.bundle_tokens.recoverySalt).split('').map(c => c.charCodeAt(0))) : null);
            } else {
                console.error('Failed to fetch bundle:', response.statusText);
            }
            toast.success('Setup Complete!');
            localStorage.setItem('bundleSaved', 'true'); // we dont need to pull again if it was successful
            onComplete && onComplete();

        } catch (error) {
            console.error('Error fetching bundle:', error);
        }
    };

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
                {user ? (
                    <div className="mt-2 flex flex-col gap-2">
                        {/* <StatusChip message={'Signed in as: ' + user.email} type={'success'} /> */}
                        <div className='flex gap-2'>
                            <button onClick={handleSignOut} className="btnDestructive w-fit">
                                Sign Out
                            </button>
                            {keyError ? (
                                <button className='btnPrimary' onClick={async () => {
                                    setKeyError(false);
                                    await handleSignOut();
                                    onReset && onReset();
                                }}>
                                    Start New Setup
                                </button>
                            ) : (
                                <button onClick={pullUserKeys} className="btnSecondary w-fit">
                                    Pull My Keys
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className='mt-4 flex flex-col gap-2'>
                        {/* <StatusChip message={'Not signed in'} type={'warning'} /> */}

                        <button onClick={handleSignIn} className="btnPrimary w-fit">
                            Sign in with Google
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default MintypeSetupLogin;