import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useSupabaseAuth } from '../auth/SupabaseAuthProvider';

export default function DisplayNameDialog({ isDialogOpen, onClose }) {
    const { accessToken } = useSupabaseAuth();
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const validateDisplayName = (name) => {
        const trimmed = name.trim();

        if (trimmed.length === 0) {
            return 'Display name cannot be empty';
        }

        if (trimmed.length > 20) {
            return 'Display name must be 20 characters or less';
        }

        // Only alphanumeric and underscores (no spaces)
        const alphanumericRegex = /^[a-zA-Z0-9_]+$/;
        if (!alphanumericRegex.test(trimmed)) {
            return 'Display name can only contain letters, numbers, and underscores';
        }

        return null;
    };

    const handleUpdate = async () => {
        setError('');

        const validationError = validateDisplayName(displayName);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsUpdating(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/set-display-name`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ displayName: displayName.trim() })
            });

            if (!response.ok) {
                setError('Failed to update display name');
                return;
            }

            const data = await response.json();
            if (data.success) {
                console.log('Display name updated successfully!');
                setDisplayName('');
                onClose();
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Error updating display name:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleInputChange = (e) => {
        setDisplayName(e.target.value);
        setError('');
    };

    return (
        <Dialog open={isDialogOpen} className="relative z-50 focus:outline-none" onClose={onClose}>
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <DialogTitle as="h3" className="textTitle">
                        Change Display Name
                    </DialogTitle>

                    <p className="textRegular mt-2">
                        Enter a new display name (letters, numbers, and spaces only)
                    </p>

                    <div className="mt-4">
                        <input
                            type="text"
                            value={displayName}
                            onChange={handleInputChange}
                            placeholder="Enter display name"
                            maxLength={20}
                            className="baseInput"
                            disabled={isUpdating}
                        />

                        {error && (
                            <p className="mt-2 text-sm text-red-600">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={onClose}
                            className="btnSecondary"
                            disabled={isUpdating}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdate}
                            className="btnPrimary"
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}