import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useGoogleDriveAPI } from '../lib/driveService';
import { SecureContext } from '../layouts/secure-context/SecureContext';
import { useGoogleDrive } from './GoogleDriveContext';
import { runSyncCycle } from '../lib/syncEngine';
import { reportSyncProgress } from '../lib/syncProgress';
import { DRIVE_KEY_MISMATCH } from '../lib/driveErrors';
import dbService from '../lib/dbService';

const SyncContext = createContext(null);

const SYNC_LOCK = 'mintype-drive-sync';
const SYNCED_FOLDER_KEY = 'mintypeSyncedFolderId';
const MAX_RETRY_INTERVAL = 5 * 60 * 1000;

// One sync at a time across tabs; a tab that finds another tab syncing skips this round.
function withSyncLock(run) {
    if (!navigator.locks?.request) return run();
    return navigator.locks.request(SYNC_LOCK, { ifAvailable: true }, (lock) => (lock ? run() : null));
}

// A different Drive folder (e.g. another Google account) holds none of this device's files, so
// every page is uploaded to it afresh. The remote cache belongs to one metadata file.
async function prepareDriveTarget(cache) {
    const folderId = localStorage.getItem('mintypeFolderId');
    const syncedFolderId = localStorage.getItem(SYNCED_FOLDER_KEY);
    if (syncedFolderId && syncedFolderId !== folderId) await dbService.resetSyncState();
    localStorage.setItem(SYNCED_FOLDER_KEY, folderId);

    const fileId = localStorage.getItem('mintypeFileId');
    if (cache.fileId !== fileId) {
        cache.fileId = fileId;
        cache.version = undefined;
        cache.meta = undefined;
    }
}

export const SyncProvider = ({
    children,
    autoSyncEnabled = true,
    syncInterval = 30000,
}) => {
    const drive = useGoogleDriveAPI();
    const { canSync } = useGoogleDrive();
    const { masterKey } = useContext(SecureContext);

    const driveRef = useRef(drive);
    driveRef.current = drive;
    const masterKeyRef = useRef(masterKey);
    masterKeyRef.current = masterKey;
    const canSyncRef = useRef(canSync);
    canSyncRef.current = canSync;
    const mountedRef = useRef(true);
    const remoteCacheRef = useRef({});
    const activeSyncRef = useRef(null);

    const [lastSyncTime, setLastSyncTime] = useState(() => Number(localStorage.getItem('lastSyncTime')) || null);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error'
    const [pullStatus, setPullStatus] = useState('idle'); // 'idle' | 'pulling'
    // Sync stays paused while the Drive data needs a different key; nothing is pushed over it.
    const [keyMismatch, setKeyMismatch] = useState(false);
    const keyMismatchRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Resolves to null when sync cannot run now (offline, not set up, or another tab is syncing).
    const runSync = useCallback((force = false) => {
        if (!canSyncRef.current || !masterKeyRef.current || !navigator.onLine) return Promise.resolve(null);
        if (activeSyncRef.current) return activeSyncRef.current;

        const cycleMasterKey = masterKeyRef.current;
        const isCancelled = () => !mountedRef.current || masterKeyRef.current !== cycleMasterKey;
        const cycle = withSyncLock(async () => {
            await prepareDriveTarget(remoteCacheRef.current);
            return runSyncCycle({
                drive: driveRef.current,
                masterKey: cycleMasterKey,
                cache: remoteCacheRef.current,
                force,
                isCancelled,
                onPhase: (phase) => {
                    setPullStatus(phase === 'pull' ? 'pulling' : 'idle');
                    if (phase === 'push') setSyncStatus('syncing');
                },
                onProgress: reportSyncProgress,
            });
        }).then((result) => {
            if (result) {
                keyMismatchRef.current = false;
                setKeyMismatch(false);
            }
            if (result && !result.skipped) {
                const now = Date.now();
                localStorage.setItem('lastSyncTime', String(now));
                setLastSyncTime(now);
            }
            setSyncStatus(result?.failed ? 'error' : 'idle');
            return result;
        }, (error) => {
            setSyncStatus('error');
            if (error.code === DRIVE_KEY_MISMATCH && !keyMismatchRef.current) {
                keyMismatchRef.current = true;
                setKeyMismatch(true);
                toast.error('Sync paused: your Google Drive notes use a different encryption key. See Settings › Accounts and Sync.', { duration: 8000 });
            }
            throw error;
        }).finally(() => {
            setPullStatus('idle');
            activeSyncRef.current = null;
        });

        activeSyncRef.current = cycle;
        return cycle;
    }, []);

    // Syncs now and then every `syncInterval`, backing off after failures. Idle cycles cost one
    // small request, and a failure never stops the loop.
    useEffect(() => {
        if (!autoSyncEnabled || !canSync) return;

        let timer = null;
        let stopped = false;
        let failures = 0;
        const tick = async () => {
            try {
                await runSync();
                failures = 0;
            } catch (error) {
                failures++;
                console.error('Auto-sync failed:', error);
            }
            if (!stopped) timer = setTimeout(tick, Math.min(syncInterval * 2 ** failures, MAX_RETRY_INTERVAL));
        };
        const syncWhenVisible = () => {
            if (document.visibilityState !== 'visible') return;
            runSync().catch((error) => console.error('Sync failed:', error));
        };

        tick();
        document.addEventListener('visibilitychange', syncWhenVisible);
        window.addEventListener('online', syncWhenVisible);
        return () => {
            stopped = true;
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', syncWhenVisible);
            window.removeEventListener('online', syncWhenVisible);
        };
    }, [autoSyncEnabled, canSync, syncInterval, runSync]);

    const syncNow = useCallback(async () => {
        try {
            const result = await runSync(true);
            if (!result) {
                toast.error(navigator.onLine ? 'Sync is busy or not set up. Try again shortly.' : 'You are offline');
            } else if (result.failed) {
                toast.error(`${result.failed} changes could not be synced. They will be retried automatically.`);
            } else {
                toast.success('Sync completed');
            }
        } catch (error) {
            console.error('Sync failed:', error);
            toast.error(`Sync failed: ${error.message}`);
        }
    }, [runSync]);

    const value = {
        syncNow,
        lastSyncTime,
        syncStatus,
        pullStatus,
        keyMismatch,
    };

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
