import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useGoogleDriveAPI } from '../lib/driveService';
import { SecureContext } from '../layouts/secure-context/SecureContext';
import { useGoogleDrive } from './GoogleDriveContext';
import syncService from '../lib/syncService';
import dbService from '../lib/dbService';

const SyncContext = createContext(null);

const PULL_FRESHNESS_THRESHOLD = 600000; // 10 minutes

export const SyncProvider = ({
    children,
    autoSyncEnabled = true,
    syncInterval = 600000, // 10 minutes default
    maxRetriesPerHour = 12, // Safety limit
}) => {
    const { createFileInDrive, updateFileInDrive, deleteFileFromDrive, updateMetaInDrive } = useGoogleDriveAPI();
    const { canSync, needsSetup, syncRemoteState } = useGoogleDrive();
    const { masterKey } = useContext(SecureContext);
    const syncInProgressRef = useRef(false);
    const pullInProgressRef = useRef(false);
    const autoSyncTimerRef = useRef(null);
    const syncAttemptsRef = useRef([]);
    const mountedRef = useRef(true);
    const initialPullCompleteRef = useRef(false);

    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'error'
    const [pullStatus, setPullStatus] = useState('idle'); // 'idle' | 'pulling' | 'error'

    // Rate limiting: Track sync attempts in the last hour
    const canAttemptSync = useCallback(() => {
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        // Clean up old attempts
        syncAttemptsRef.current = syncAttemptsRef.current.filter(
            timestamp => timestamp > oneHourAgo
        );

        // Check if we're under the limit
        if (syncAttemptsRef.current.length >= maxRetriesPerHour) {
            console.warn(`Rate limit reached: ${syncAttemptsRef.current.length} syncs in the last hour`);
            return false;
        }

        return true;
    }, [maxRetriesPerHour]);

    // Record sync attempt
    const recordSyncAttempt = useCallback(() => {
        syncAttemptsRef.current.push(Date.now());
    }, []);

    const executeDriveOperation = useCallback(async (operation) => {
        try {
            switch (operation.operation) {
                case 'create':
                    await syncCreate(operation.fileId);
                    break;
                case 'update':
                    await syncUpdate(operation.fileId);
                    break;
                case 'delete':
                    await syncDelete(operation.fileId, operation.remoteFileId);
                    break;
            }
        } catch (error) {
            console.error(`Drive operation failed:`, error);
            throw error;
        }
    }, []);

    const syncCreate = useCallback(async (fileId) => {
        const fileContent = await dbService.getContent(fileId, masterKey);
        const fileMeta = await dbService.getMeta(fileId);
        if (!fileContent) {
            throw new Error(`File content for ${fileId} not found in local DB`);
        }

        const response = await createFileInDrive(fileMeta, fileContent);
        if (!response) {
            throw new Error(`Failed to create file ${fileId} on Drive`);
        }
        await dbService.updateMetaField({
            id: fileId,
            fieldName: 'remoteFileId',
            newValue: response.fileId
        });

        const driveFileId = response.fileId;
        console.log(`File ${fileId} created on Drive with ID: ${driveFileId}`);

        return response;
    }, [dbService, masterKey, createFileInDrive]);

    const syncUpdate = useCallback(async (fileId) => {
        const fileContent = await dbService.getContent(fileId, masterKey);
        const fileMeta = await dbService.getMeta(fileId);
        if (!fileContent) {
            throw new Error(`File content for ${fileId} not found in local DB`);
        }

        const fileExistsLocally = fileMeta?.remoteFileId;

        if (!fileExistsLocally) {
            console.log(`File ID for ${fileId} not found in LS, creating new file remotely`);
            const response = await createFileInDrive(fileMeta, fileContent);
            if (!response) {
                throw new Error(`Failed to create file ${fileId} on Drive`);
            }

            await dbService.updateMetaField({
                id: fileId,
                fieldName: 'remoteFileId',
                newValue: response.fileId
            });

            return response;
        } else {
            console.log(`File ID for ${fileId} found in LS, updating existing file remotely`);
            const response = await updateFileInDrive(fileMeta, fileContent);
            if (!response) {
                throw new Error(`Failed to update file ${fileId} on Drive`);
            }
            await dbService.updateMetaField({
                id: fileId,
                fieldName: 'remoteFileId',
                newValue: response.fileId
            });
            return response;
        }
    }, [dbService, masterKey, createFileInDrive, updateFileInDrive]);

    const syncDelete = useCallback(async (fileId, remoteFileId) => {
        console.log('File meta for deletion:', remoteFileId);

        if (remoteFileId) {
            console.log(`File ID for ${fileId} was found in LS, deleting file remotely`);
            const success = await deleteFileFromDrive(remoteFileId);
            if (!success) {
                throw new Error(`Failed to delete file ${fileId} from Drive`);
            }

            console.log(`File ${fileId} successfully deleted from Drive and localStorage`);
            return true;
        } else {
            console.log(`File ID for ${fileId} was not found in LS, no remote deletion needed`);
            return true;
        }
    }, [deleteFileFromDrive]);

    const pushMeta = useCallback(async () => {
        const allMetaObjects = await dbService.getAllEntries();
        const combinedMeta = {
            name: 'mintype-data',
            type: 'appdata',
            entries: [...allMetaObjects]
        };
        const response = await updateMetaInDrive(combinedMeta);
        if (response.fileId) {
            console.log(`Meta file updated on Drive with ID: ${response.fileId}`);
            localStorage.setItem('metadataModified', 'false');
        }
        return {
            success: !!response.fileId,
            response
        };
    }, [dbService, updateMetaInDrive]);

    const syncDriveQueue = useCallback(async () => {
        const operations = await syncService.getAllOperations("syncqueue");
        if (operations.length === 0) {
            console.log("No operations to sync with Drive");

            const localMetaChanged = localStorage.getItem('metadataModified') === 'true';
            if (localMetaChanged) {
                await pushMeta();
            }
            return { operationsProcessed: 0, failed: 0 };
        }

        const operationPromises = operations.map(async (operation) => {
            try {
                await executeDriveOperation(operation);
                await syncService.deleteOperation(operation.id);
                return { success: true, operation };
            } catch (error) {
                console.error(`Failed to execute operation ${operation.id}:`, error);
                return { success: false, operation, error: error.message };
            }
        });

        const results = await Promise.all(operationPromises);
        const failedOps = results.filter(result => !result.success);

        if (failedOps.length > 0) {
            console.warn(`${failedOps.length} operations failed to sync`);
        }

        console.log(`Drive sync queue processed: ${results.length} total, ${failedOps.length} failed`);
        await pushMeta();

        return {
            operationsProcessed: results.length,
            failed: failedOps.length
        };
    }, [syncService, executeDriveOperation, pushMeta]);

    // Check if pull is needed based on freshness threshold
    const isPullNeeded = useCallback(() => {
        const lastPullStr = localStorage.getItem('lastPullTime');
        if (!lastPullStr) {
            return true; // Never pulled, need to pull
        }
        
        const lastPull = parseInt(lastPullStr, 10);
        const now = Date.now();
        const timeSinceLastPull = now - lastPull;
        
        return timeSinceLastPull > PULL_FRESHNESS_THRESHOLD;
    }, []);

    // Pull remote state function
    const pullRemoteState = useCallback(async (isAutoPull = false) => {
        // Check if pull is possible
        if (!canSync && !needsSetup) {
            console.log('Pull skipped: Not signed in');
            return null;
        }

        // Prevent concurrent pulls
        if (pullInProgressRef.current) {
            console.log('Pull already in progress, skipping...');
            return null;
        }

        // Check if component is still mounted
        if (!mountedRef.current) {
            console.log('Pull skipped: Component unmounted');
            return null;
        }

        try {
            pullInProgressRef.current = true;
            setPullStatus('pulling');

            console.log('Starting remote state pull...');
            await syncRemoteState();

            // Update last pull time
            const now = Date.now();
            localStorage.setItem('lastPullTime', now.toString());

            // Mark pull as complete
            localStorage.setItem('pullComplete', 'true');
            initialPullCompleteRef.current = true;

            setPullStatus('idle');

            console.log('Remote state pull completed');
            return true;
        } catch (error) {
            console.error('Error pulling remote state:', error);
            setPullStatus('error');

            if (!isAutoPull) {
                toast.error('Pull failed. Will retry automatically.');
            }

            throw error;
        } finally {
            pullInProgressRef.current = false;
        }
    }, [canSync, needsSetup, syncRemoteState]);

    // Handle visibility change - pull if needed when window becomes visible
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible' && canSync && mountedRef.current) {
            console.log('Window became visible, checking pull freshness...');
            
            if (isPullNeeded()) {
                console.log('Pull needed due to staleness, pulling...');
                pullRemoteState(true).catch(error => {
                    console.error('Visibility-triggered pull failed:', error);
                });
            } else {
                console.log('Pull not needed, data is fresh');
            }
        }
    }, [canSync, isPullNeeded, pullRemoteState]);

    const syncFiles = useCallback(async (isAutoSync = false) => {
        // Check if sync is possible
        if (!canSync && !needsSetup) {
            console.log('Sync skipped: Not signed in');
            return null;
        }

        // Prevent concurrent syncs
        if (syncInProgressRef.current) {
            console.log('Sync already in progress, skipping...');
            return null;
        }

        // Rate limiting check
        if (isAutoSync && !canAttemptSync()) {
            console.warn('Sync skipped: Rate limit reached');
            setSyncStatus('error');
            return null;
        }

        // Check if component is still mounted (for cleanup safety)
        if (!mountedRef.current) {
            console.log('Sync skipped: Component unmounted');
            return null;
        }

        // CRITICAL: Wait for initial pull to complete before first push
        if (!initialPullCompleteRef.current && localStorage.getItem('pullComplete') !== 'true') {
            console.log('Sync skipped: Waiting for initial pull to complete');
            if (!isAutoSync) {
                toast.error('Awaiting initial sync from remote...');
            }
            return null;
        }

        try {
            syncInProgressRef.current = true;
            setSyncStatus('syncing');
            recordSyncAttempt();

            const result = await syncDriveQueue();

            // Update last sync time
            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem('lastSyncTime', now.toString());

            // Set next sync time
            const nextSyncTime = now + syncInterval;
            localStorage.setItem('nextSyncTime', nextSyncTime.toString());

            setSyncStatus('idle');

            if (!isAutoSync && result.operationsProcessed > 0) {
                toast.success(`Synced ${result.operationsProcessed} operations`);
            }

            return result;
        } catch (error) {
            console.error('Error syncing files:', error);
            setSyncStatus('error');

            if (!isAutoSync) {
                toast.error('Sync failed. Will retry automatically.');
            }

            throw error;
        } finally {
            syncInProgressRef.current = false;
        }
    }, [canSync, needsSetup, canAttemptSync, recordSyncAttempt, syncDriveQueue, syncInterval]);

    // Schedule next auto-sync
    const scheduleAutoSync = useCallback(() => {
        // Clear existing timer
        if (autoSyncTimerRef.current) {
            clearTimeout(autoSyncTimerRef.current);
        }

        if (!autoSyncEnabled || !canSync) {
            return;
        }

        // Calculate time until next sync
        const nextSyncTimeStr = localStorage.getItem('nextSyncTime');
        const now = Date.now();
        let timeUntilSync = syncInterval;

        if (nextSyncTimeStr) {
            const nextSyncTime = parseInt(nextSyncTimeStr, 10);
            const timeRemaining = nextSyncTime - now;

            // If next sync time is in the future and reasonable, use it
            if (timeRemaining > 0 && timeRemaining < syncInterval * 2) {
                timeUntilSync = timeRemaining;
            }
        }

        console.log(`Next auto-sync scheduled in ${Math.round(timeUntilSync / 1000)}s`);

        autoSyncTimerRef.current = setTimeout(() => {
            if (mountedRef.current && autoSyncEnabled) {
                console.log('Auto-sync triggered');
                syncFiles(true).then(() => {
                    // Schedule next sync after this one completes
                    scheduleAutoSync();
                });
            }
        }, timeUntilSync);
    }, [autoSyncEnabled, canSync, syncInterval, syncFiles]);

    // Initialize and manage auto-sync and visibility-based pulling
    useEffect(() => {
        mountedRef.current = true;

        // Load last sync time from localStorage
        const lastSyncStr = localStorage.getItem('lastSyncTime');
        if (lastSyncStr) {
            setLastSyncTime(parseInt(lastSyncStr, 10));
        }

        // Check if initial pull has been completed
        if (localStorage.getItem('pullComplete') === 'true') {
            initialPullCompleteRef.current = true;
        }

        // Set up visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start auto-sync if enabled
        if (autoSyncEnabled && canSync) {
            // If initial pull not complete, do it first
            if (!initialPullCompleteRef.current) {
                console.log('Performing initial pull...');
                pullRemoteState(false).then(() => {
                    // After initial pull, start sync timer
                    scheduleAutoSync();
                }).catch(error => {
                    console.error('Initial pull failed:', error);
                    // Still schedule timer, it'll handle the retry
                    scheduleAutoSync();
                });
            } else {
                // Initial pull already done, just check freshness and start sync timer
                if (isPullNeeded()) {
                    console.log('Data is stale, performing pull...');
                    pullRemoteState(true).catch(error => {
                        console.error('Freshness pull failed:', error);
                    });
                }
                scheduleAutoSync();
            }
        }

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (autoSyncTimerRef.current) {
                clearTimeout(autoSyncTimerRef.current);
            }
        };
    }, [autoSyncEnabled, canSync, pullRemoteState, scheduleAutoSync, handleVisibilityChange, isPullNeeded]);

    const value = {
        syncFiles: useCallback(() => syncFiles(false), [syncFiles]),
        pullRemoteState: useCallback(() => pullRemoteState(false), [pullRemoteState]),
        syncDriveQueue,
        pushMeta,
        syncCreate,
        syncUpdate,
        syncDelete,
        lastSyncTime,
        syncStatus,
        pullStatus,
        scheduleAutoSync,
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