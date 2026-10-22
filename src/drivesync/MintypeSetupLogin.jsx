import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useOnlineStatus } from '../layouts/root/OnlineStatusContext.jsx';
import { fetchAccountBundle, storeBundleLocally } from '../lib/keyBundle.js';
import { useEffect, useRef, useState } from 'react';
import { setRestorePending } from './restorePending.js';

const MintypeSetupLogin = ({ onComplete, onReset }) => {
    const { user, accessToken, signInWithGoogle, signOut } = useSupabaseAuth();
    const [keyError, setKeyError] = useState(false)
    const [pulling, setPulling] = useState(false)
    const autoPulledRef = useRef(false)

    const handleSignIn = async () => {
        toast.loading('Signing in...');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in failed:', error);
            toast.error('Sign in failed');
        }
    }

    // Pulls the user's encrypted keys from their account after sign in.
    const pullUserKeys = async () => {
        if (pulling) return;
        setPulling(true);
        try {
            const bundle = await fetchAccountBundle(accessToken);
            if (!bundle) {
                setKeyError(true);
                return;
            }
            await storeBundleLocally(bundle);
            setRestorePending(true);
            onComplete && onComplete();
        } catch (error) {
            console.error('Error fetching bundle:', error);
            toast.error('Could not get your keys. Please try again.');
        } finally {
            setPulling(false);
        }
    };

    // Signing in returns here through a redirect, so the keys are fetched without another click.
    useEffect(() => {
        if (!user || !accessToken || autoPulledRef.current) return;
        autoPulledRef.current = true;
        pullUserKeys();
        // Runs once per sign in; pullUserKeys reads the current token.
    }, [user, accessToken]);

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
                        <p className="textRegular">Signed in as {user.email}.</p>
                        {keyError && (
                            <p className="textRegular text-red-500">
                                This account has no Mintype keys yet. Set Mintype up on the device you already use and sign in there first, or start a new setup here.
                            </p>
                        )}
                        <div className='flex flex-wrap gap-2'>
                            {keyError ? (
                                <button className='btnPrimary' onClick={async () => {
                                    setKeyError(false);
                                    await handleSignOut();
                                    onReset && onReset();
                                }}>
                                    Start New Setup
                                </button>
                            ) : (
                                <button onClick={pullUserKeys} disabled={pulling} className="btnPrimary w-fit gap-2">
                                    {pulling && <Loader2 className="animate-spin" size={14} />}
                                    {pulling ? 'Getting your keys...' : 'Get my keys'}
                                </button>
                            )}
                            <button onClick={handleSignOut} disabled={pulling} className="btnSecondary w-fit">
                                Use a different account
                            </button>
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