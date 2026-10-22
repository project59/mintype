import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isRestorePending } from './restorePending.js';

const SYNC_SETTINGS = '/settings/sync';

// After a returning user unlocks, their workspace is empty until Google Drive is connected, so
// they are taken to Sync settings first. Rendered inside SecureProvider, so it mounts on unlock.
export default function RestoreDriveRedirect() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const checkedRef = useRef(false);

    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;
        if (isRestorePending() && pathname !== SYNC_SETTINGS) navigate(SYNC_SETTINGS, { replace: true });
    }, [navigate, pathname]);

    return null;
}
