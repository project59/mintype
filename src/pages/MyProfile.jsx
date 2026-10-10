import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider';
import PageHeaderWrapper from '../components/skeletons/PageHeaderWrapper';
import PageSectionWrapper from '../components/skeletons/PageSectionWrapper';
import { Edit } from 'lucide-react';
import AvatarPicker from '../layouts/profile/AvatarPicker';
import DisplayNameDialog from '../layouts/profile/DisplayNameDialog';

export default function MyProfile() {
    const [profileData, setProfileData] = useState(null);
    const [privateData, setPrivateData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSupportId, setShowSupportId] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showDisplayName, setDisplayName] = useState(false);
    const { supabase, user } = useSupabaseAuth();

    useEffect(() => {
        async function fetchUserData() {
            try {
                setLoading(true);
                setError(null);

                if (!user) {
                    setError('User not logged in');
                    setLoading(false);
                    return;
                }

                // Fetch Public Profile Data
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                // Fetch Private User Data
                const { data: user_private, error: privateError } = await supabase
                    .from('user_private')
                    .select('email, support_id')
                    .eq('id', user.id)
                    .single();

                if (privateError) throw privateError;

                setProfileData(profile);
                setPrivateData(user_private);

            } catch (err) {
                console.error('Fetch error:', err.message);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, []);

    //function to refresh public profile ONLY after an avatar or name update
    const refreshPublicProfile = async () => {
        try {
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            setProfileData(profile);
        } catch (err) {
            console.error('Fetch error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const renderElement = () => {
        if (loading) return <div>Loading profile...</div>;
        if (error) return <div className='infoBox w-fit'>{error}</div>;
        if (!profileData || !privateData) return <div>No profile data found.</div>;

        return (
            <div className='flex flex-col gap-4'>
                <div className='flex flex-col md:flex-row gap-4'>
                    <div className='flex flex-col md:w-1/2 bg-slate-300/10 dark:bg-slate-500/10 p-3 rounded-lg'>
                        <h3 className='textTitle'>Details</h3>
                        <p className='textRegular text-gray-500 mb-4'>This info is visible to others</p>

                        <div className='flex flex-col gap-6 w-1/2'>
                            <div className='relative w-fit'>
                                <img
                                    className='w-20 h-20 rounded-full object-cover'
                                    src={profileData.avatar_url || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2F0fGVufDB8fDB8fHww'}
                                    alt="Profile"
                                />
                                <button onClick={() => setShowAvatarPicker(true)} className='btnChip absolute -bottom-1 -right-1'>
                                    <Edit size={14} />
                                </button>
                            </div>

                            <div className='space-y-1'>
                                <p className='textLabel'>Display Name</p>
                                <div onClick={() => setDisplayName(true)} className='flex gap-2 items-center'>
                                    <p className='textRegular'>{profileData.display_name}</p>
                                    <button className='btnChip'><Edit size={14} /></button>
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <p className='textLabel'>Joined</p>
                                <p className='textRegular'>{new Date(profileData.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                </div>


                <div className='flex flex-col md:flex-row gap-4'>
                    <div className='md:w-1/2 flex flex-col bg-slate-300/10 dark:bg-slate-500/10 p-3 rounded-lg'>
                        <h3 className='textTitle'>Account</h3>
                        <p className='textRegular text-gray-500 mb-4'>Private information</p>

                        <div className='flex flex-col gap-3'>
                            <div className='space-y-1'>
                                <p className='textLabel'>Email</p>
                                <p className='textRegular'>{privateData.email}</p>
                            </div>

                            <div className='space-y-1'>
                                <p className='textLabel'>Support ID</p>
                                {showSupportId ? (
                                    <div className='space-y-1'>
                                        <div className='textRegular'>
                                            {privateData.support_id}
                                        </div>
                                        <div className='infoBox max-w-md'>
                                            Use this ID when contacting Mintype support with questions or to report an issue.
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowSupportId(true)}
                                        className='btnChip'
                                    >
                                        Reveal ID
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                <AvatarPicker isDialogOpen={showAvatarPicker} onClose={() => { refreshPublicProfile(); setShowAvatarPicker(false) }} />
                <DisplayNameDialog isDialogOpen={showDisplayName} onClose={() => { refreshPublicProfile(); setDisplayName(false) }} />
            </div>
        )
    }

    return (
        <div className='flex flex-col h-full text-black dark:text-white'>
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">My Profile</h1>
            </PageHeaderWrapper>
            <PageSectionWrapper>
                {renderElement()}
            </PageSectionWrapper>
        </div>
    );
}
