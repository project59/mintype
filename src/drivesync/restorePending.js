// Set when a returning user restores their keys from their account during setup, and cleared once
// Google Drive is configured. Until then the unlock prompt says which password to use and Sync
// settings explain that connecting Drive brings their notes over.
const STORAGE_KEY = 'mintypeRestorePending';

export const isRestorePending = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

export const setRestorePending = (pending) => {
    try {
        if (pending) localStorage.setItem(STORAGE_KEY, 'true');
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Without storage the extra guidance is simply not shown.
    }
};
