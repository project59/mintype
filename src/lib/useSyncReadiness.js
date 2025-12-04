import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
/**
 * Central manager for all sync prerequisites
 * Provides a single, reliable state for when sync operations can proceed
 */
export function useSyncReadiness() {
    const { user, accessToken } = useSupabaseAuth();

    const [gapiInitialized, setGapiInitialized] = useState(false);
    const [driveAuthorized, setDriveAuthorized] = useState(false);
    const [driveConfigured, setDriveConfigured] = useState(false); // folder + file exist
    const [initializationError, setInitializationError] = useState(null);

    // Computed states for different levels of readiness
    const hasAuth = Boolean(user && accessToken);
    // Can perform setup operations (authorize, configure)
    const canSetup = hasAuth && gapiInitialized && driveAuthorized;

    // Can perform full sync operations
    const canSync = hasAuth && gapiInitialized && driveAuthorized && driveConfigured;

    const needsSetup = hasAuth && (!driveConfigured);

    // Check if Drive is already configured (has folder + file IDs)
    useEffect(() => {
        const folderId = localStorage.getItem('mintypeFolderId');
        const fileId = localStorage.getItem('mintypeFileId');
        setDriveConfigured(Boolean(folderId && fileId));
    }, []);

    return {
        // Auth state
        user,
        accessToken,
        hasAuth,

        // Google Drive state
        gapiInitialized,
        setGapiInitialized,
        driveAuthorized,
        setDriveAuthorized,
        driveConfigured,
        setDriveConfigured,

        // Readiness states
        canSetup,
        canSync,
        needsSetup,

        // Error handling
        initializationError,
        setInitializationError,
    };
}