import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AvatarPicker({ isDialogOpen, onClose }) {
    const totalAvatars = 12; // we have 12 available for now
    const [isUpdating, setIsUpdating] = useState(false);
    const { accessToken } = useSupabaseAuth();

    const handleSelect = async (index) => {
        setIsUpdating(true);

        try {
            const avatarUrl = `https://github.com/project59/mintype-avatars/blob/main/${index + 1}.png?raw=true`;

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/set-avatar-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ avatarUrl })
            });

            if (!response.ok) {
                console.error('Failed to update avatar');
                return;
            }

            const data = await response.json();
            if (data.success) {
                toast.success('Avatar updated successfully!');
                onClose();
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} className="relative z-50 focus:outline-none" onClose={onClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel
                    transition
                    className="dialogPanel"
                >
                    <DialogTitle as="h3" className="textTitle">
                        Change Avatar
                    </DialogTitle>
                    <p className="textRegular">
                        Please choose a new avatar
                    </p>

                    {/* create buttons, mapping from 1-totalAvatars */}
                    <div className="mt-4 grid grid-cols-6 gap-2">
                        {[...Array(totalAvatars)].map((_, index) => (
                            <button
                                onClick={() => handleSelect(index)}
                                key={index}
                                className="w-14 hover:border rounded-full"
                            >
                                <img src={`https://github.com/project59/mintype-avatars/blob/main/${index + 1}.png?raw=true`} alt="" />
                            </button>
                        ))}
                    </div>

                    {isUpdating && (
                        <div>
                            <p className="textRegular">Updating...</p>
                        </div>
                    )}

                </DialogPanel>
            </div>
        </Dialog>
    )
}