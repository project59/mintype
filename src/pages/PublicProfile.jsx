import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BadgeList from '../components/badges/BadgeList';
import PageHeaderWrapper from '../components/skeletons/PageHeaderWrapper';


export default function PublicProfile() {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getUserPublicProfile = async (userId) => {
        // try {
        //     const userRef = doc(db, "users_public", userId);
        //     const docSnap = await getDoc(userRef);

        //     if (!docSnap.exists()) {
        //         setProfile(null);
        //     } else {
        //         console.log(docSnap.data());
        //         setProfile(docSnap.data());
        //     }
        // } catch (err) {
        //     console.error("Error fetching public profile:", err);
        //     setError(err.message);
        // } finally {
        //     setLoading(false);
        // }
    };

    useEffect(() => {
        if (userId) {
            setLoading(true);
            getUserPublicProfile(userId);
        }
    }, [userId]);

    if (loading) return <div>Loading profile...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!profile) return <div>User not found</div>;

    const formattedDate = new Date(profile.createdAt).toLocaleString(
        'en-US',
        {
            year: 'numeric',
            month: 'short',
            // day: 'numeric',
        }
    );

    return (
        <div className='flex flex-col h-full'>
            <PageHeaderWrapper>
                <h1 className="text-5xl font-semibold text-black dark:text-white">{profile.displayName || "Anonymous User"}</h1>
                {profile.badges?.length > 0 ? (
                    <BadgeList badgeIds={profile.badges} />
                ) : (
                    <p>No badges yet</p>
                )}
            </PageHeaderWrapper>
            <div className="bg-slate-100 dark:bg-[#10101e] w-full flex-1 text-black dark:text-white">
                <div className="flex flex-col gap-1 p-4 md:p-6 w-full rounded-t-2xl bg-white dark:bg-[#1f1f2d] h-full">
                    <div>
                        {/* timestamp to date */}
                        Joined on {formattedDate}
                    </div>
                    This page is still under construction
                </div>
            </div>
        </div>
    );
}
