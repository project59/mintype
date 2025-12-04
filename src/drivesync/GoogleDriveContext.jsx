import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import dbService from '../lib/dbService.js';
import toast from 'react-hot-toast';
import { useSyncReadiness } from '../lib/useSyncReadiness.js';
import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import { SecureContext } from '../layouts/secure-context/SecureContext.jsx';
import { TokenService } from '../lib/tokenService.js';
import { OAuthHandler } from '../lib/oauthHandler.js';
import { decryptDataWithMasterKey, encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';

const GoogleDriveContext = createContext();

export const useGoogleDrive = () => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
};

export const GoogleDriveProvider = ({ children }) => {
    const { user, accessToken } = useSupabaseAuth();
    const { masterKey } = useContext(SecureContext);
    const syncReadiness = useSyncReadiness();

    const [status, setStatus] = useState('Pending');
    const [tokenService, setTokenService] = useState(null);
    const [oauthHandler, setOauthHandler] = useState(null);

    const {
        hasAuth,
        canSync,
        gapiInitialized,
        setGapiInitialized,
        driveAuthorized,
        setDriveAuthorized,
        setDriveConfigured,
    } = syncReadiness;

    const API_KEY = import.meta.env.VITE_API_KEY;
    const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
    const SYNC_INTERVAL = 5 * 60 * 1000;
    const STORAGE_KEY = 'lastSyncTime';

    // Initialize services when master key is available
    useEffect(() => {
        if (masterKey) {
            setTokenService(new TokenService(masterKey));
            setOauthHandler(new OAuthHandler(import.meta.env.VITE_BACKEND_URL));
        }
    }, [masterKey]);

    // Startup Sync
    // useEffect(() => {
    //     if (!canSync) return;
    //     if (import.meta.env.DEV) return;
    //     console.log('STARTUP PULL')
    //     syncRemoteState();
    // }, [canSync]);

    // Check if we have valid tokens on mount
    useEffect(() => {
        const checkExistingTokens = async () => {
            if (!tokenService) return;

            try {
                const tokens = await tokenService.getTokens();
                if (tokens) {
                    setDriveAuthorized(true);
                    console.log('Found existing Drive tokens');
                }
            } catch (error) {
                console.error('Error checking existing tokens:', error);
            }
        };

        checkExistingTokens();
    }, [tokenService, setDriveAuthorized]);

    // Utility: Make authenticated API calls to your backend
    const apiFetch = useCallback(async (url, options = {}) => {
        if (!accessToken) {
            throw new Error('No access token available');
        }

        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };

        return fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });
    }, [accessToken]);

    // Initialize Google API Client
    useEffect(() => {
        if (!hasAuth) return;

        const initializeGapi = async () => {
            try {
                const loadClient = () =>
                    new Promise((resolve, reject) => {
                        window.gapi.load("client", {
                            callback: resolve,
                            onerror: reject,
                            timeout: 5000,
                            ontimeout: () => reject(new Error("gapi.client load timed out")),
                        });
                    });

                const initClient = async () => {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                };

                if (!window.gapi) {
                    const script = document.createElement("script");
                    script.src = "https://apis.google.com/js/api.js";
                    script.onload = async () => {
                        await loadClient();
                        await initClient();
                        setGapiInitialized(true);
                    };
                    script.onerror = () => {
                        console.error('Failed to load Google API script');
                        setStatus('Failed to load Google Drive API');
                    };
                    document.head.appendChild(script);
                } else {
                    await loadClient();
                    await initClient();
                    setGapiInitialized(true);
                }
            } catch (error) {
                console.error('Failed to initialize Google API:', error);
                setStatus(`Initialization failed: ${error.message}`);
            }
        };

        initializeGapi();
    }, [hasAuth, setGapiInitialized, API_KEY]);

    // Set access token on gapi client when needed
    const setGapiToken = useCallback(async () => {
        if (!tokenService || !window.gapi?.client) return;

        try {
            const accessToken = await tokenService.getValidAccessToken(apiFetch);
            window.gapi.client.setToken({ access_token: accessToken });
            return accessToken;
        } catch (error) {
            console.error('Failed to set gapi token:', error);
            throw error;
        }
    }, [tokenService, apiFetch]);

    // Generic wrapper for Drive API calls
    const makeAuthenticatedRequest = useCallback(async (requestFn) => {
        // if (!canSync) {
        //     throw new Error("System not ready for sync operations");
        // }

        try {
            // Ensure we have a valid token set on gapi
            await setGapiToken();
            return await requestFn();
        } catch (err) {
            console.error("Drive API error:", err);

            // If it's an auth error, try to refresh and retry once
            if (err.status === 401 || err.status === 403) {
                console.log('Auth error, attempting token refresh...');
                try {
                    await setGapiToken();
                    return await requestFn();
                } catch (retryErr) {
                    console.error("Retry failed:", retryErr);
                    setDriveAuthorized(false);
                    throw new Error('Authorization expired. Please re-authorize Drive access.');
                }
            }

            throw err;
        }
    }, [canSync, setGapiToken, setDriveAuthorized]);

    // Authorize Drive Access
    const authorizeDriveAccess = useCallback(async () => {
        if (!hasAuth) {
            toast.error("Please sign in first");
            return;
        }

        if (!tokenService || !oauthHandler) {
            toast.error("Token service not initialized");
            return;
        }

        try {
            setStatus("Authorizing Drive access...");
            console.log('Starting authorization flow...');

            const tokens = await oauthHandler.authorize(apiFetch);
            console.log('Tokens received, storing...');

            // Store tokens securely
            await tokenService.storeTokens(tokens);
            console.log('Tokens stored successfully');

            setDriveAuthorized(true);
            setStatus("Drive authorized successfully");
            toast.success("Google Drive connected!");

        } catch (err) {
            console.error("Failed to authorize Drive:", err);
            setStatus("Authorization failed");
            toast.error(err.message || "Authorization failed");
        }
    }, [hasAuth, tokenService, oauthHandler, apiFetch, setDriveAuthorized]);

    // Setup: Create/find Mintype folder and meta file
    const ensureAppFolder = useCallback(async () => {
        return await makeAuthenticatedRequest(async () => {
            setStatus("Checking Google Drive setup...");

            const FOLDER_NAME = "Mintype";
            const FILE_NAME = "mintype-data.json";
            const FILE_MIME = "application/json";

            // Find or create folder
            const folderList = await window.gapi.client.drive.files.list({
                q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: "files(id, name)",
            });

            let folderId;
            if (folderList.result.files.length > 0) {
                folderId = folderList.result.files[0].id;
            } else {
                setStatus("Creating Mintype folder...");
                const folderResponse = await window.gapi.client.drive.files.create({
                    resource: {
                        name: FOLDER_NAME,
                        mimeType: "application/vnd.google-apps.folder",
                    },
                    fields: "id",
                });
                folderId = folderResponse.result.id;
            }

            localStorage.setItem("mintypeFolderId", folderId);

            // Find or create meta file
            const fileList = await window.gapi.client.drive.files.list({
                q: `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
                fields: "files(id, name)",
            });

            let fileId;
            if (fileList.result.files.length > 0) {
                fileId = fileList.result.files[0].id;
                setStatus("App folder and meta file found");
            } else {
                setStatus("Creating Mintype meta file...");

                const fileContent = {
                    name: "mintype-appdata",
                    created: Date.now(),
                    entries: [],
                };

                const { ciphertext, iv } = await encryptDataWithMasterKey(masterKey, JSON.stringify(fileContent));
                const encryptedPayload = JSON.stringify({ ciphertext, iv });
                const blob = new Blob([encryptedPayload], { type: FILE_MIME });

                const form = new FormData();
                const metadata = {
                    name: FILE_NAME,
                    mimeType: FILE_MIME,
                    parents: [folderId],
                };

                form.append(
                    "metadata",
                    new Blob([JSON.stringify(metadata)], { type: "application/json" })
                );
                form.append("file", blob);

                const accessToken = await tokenService.getValidAccessToken(apiFetch);
                const fileResponse = await fetch(
                    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
                    {
                        method: "POST",
                        headers: new Headers({
                            Authorization: `Bearer ${accessToken}`,
                        }),
                        body: form,
                    }
                ).then((r) => r.json());

                fileId = fileResponse.id;
                setStatus("Created new meta file");
            }

            localStorage.setItem("mintypeFileId", fileId);
            setDriveConfigured(true);
            setStatus("Drive setup complete");

            return folderId;
        });
    }, [makeAuthenticatedRequest, masterKey, tokenService, apiFetch, setDriveConfigured]);

    // Get file content from Drive
    const getFileContent = useCallback(async (fileId) => {
        if (!masterKey) {
            throw new Error('Master key not available');
        }

        return await makeAuthenticatedRequest(async () => {
            const response = await window.gapi.client.request({
                path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
                method: "GET",
                params: { alt: "media" },
            });
            const file = JSON.parse(response.body);
            const decoded = await decryptDataWithMasterKey(masterKey, file.iv, file.ciphertext);
            return decoded;
        });
    }, [masterKey, makeAuthenticatedRequest]);

    // List all files from meta file
    const listAllDriveFiles = useCallback(async () => {
        const fileId = localStorage.getItem("mintypeFileId");
        if (!fileId) {
            throw new Error('Drive not configured');
        }

        const files = await getFileContent(fileId);
        return files?.entries || [];
    }, [getFileContent]);

    // Update local metadata from Drive
    const updateDriveFileState = useCallback((files) => {
        files.forEach(async (file) => {
            const localMeta = await dbService.getMeta(file.id);
            if (!localMeta) {
                dbService.updateMetaEntry(file.id, file);
                return;
            }

            if (localMeta.lastMetaModified >= file.lastMetaModified) {
                return;
            } else {
                dbService.updateMetaEntry(file.id, file);
            }
        });
    }, []);

    // Pull new files from Drive
    const pullNewFilesFromDrive = useCallback(async (driveFiles) => {
        const allFiles = await dbService.getAllEntries();
        const allFileIds = allFiles.map(file => file.id);
        const newFiles = driveFiles.filter(file => !allFileIds.includes(file.id));

        if (newFiles.length === 0) {
            console.log('No new files to download');
            return { success: true, newCount: 0 };
        }

        // initialize
        syncProgress.total = newFiles.length;
        syncProgress.completed = 0;
        emitProgress();

        const filePromises = newFiles.map(async (file) => {
            try {
                syncProgress.current = file.name;
                emitProgress();

                const fileContent = await getFileContent(file.remoteFileId);
                if (fileContent) {
                    await dbService.addEntry({
                        id: file.id,
                        preloadedData: fileContent,
                        addToQueue: false,
                        masterKey: masterKey
                    });

                    syncProgress.completed++;
                    emitProgress();

                    return { success: true, file: fileContent };
                } else {
                    console.warn(`Failed to get content for file: ${file.name}`);
                    return { success: false, file: file, error: 'No content returned' };
                }
            } catch (fileError) {
                syncProgress.completed++;
                emitProgress();

                console.error(`Error processing file ${file.name}:`, fileError);
                return { success: false, file: file, error: fileError.message };
            }
        });

        const results = await Promise.all(filePromises);
        const successfulDownloads = results.filter(result => result.success).length;
        const failedDownloads = results.filter(result => !result.success);

        if (failedDownloads.length > 0) {
            console.warn(`${failedDownloads.length} files failed to download`);
        }

        setStatus(`Successfully downloaded ${successfulDownloads} new files`);
        return { success: true, newCount: successfulDownloads, failures: failedDownloads.length || 0 };
    }, [getFileContent]);

    // Pull updated files from Drive
    const pullUpdatedFilesFromDrive = useCallback(async (driveFiles) => {
        const allFiles = await dbService.getAllEntries();
        if (allFiles.length === 0) {
            console.log('No local files to compare for updates');
            return { success: true, updatedCount: 0 };
        }

        const updatedFiles = driveFiles.filter(file => {
            const localFile = allFiles.find(localFile => localFile.id === file.id);
            return localFile && localFile.lastModified < file.lastModified;
        });

        if (updatedFiles.length === 0) {
            return { success: true, updatedCount: 0 };
        }

        for (const file of updatedFiles) {
            console.log('Updating file:', file.id);
            try {
                const fileContent = await getFileContent(file.remoteFileId);
                if (fileContent) {
                    await dbService.addEntry({
                        id: file.id,
                        preloadedData: fileContent,
                        addToQueue: false,
                        masterKey: masterKey
                    });
                    console.log(`Updated: ${file.name}`);
                }
            } catch (error) {
                console.error(`Error updating ${file.name}:`, error);
            }
        }

        return { success: true, updatedCount: updatedFiles.length };
    }, [getFileContent]);

    // Handle files that exist locally but not remotely
    const handleOrphanedLocalFiles = useCallback(async (remoteMetaIds) => {
        const localFiles = await dbService.getAllEntries();
        const orphanedFiles = localFiles.filter(file => !remoteMetaIds.includes(file.id));

        console.log(`Orphaned local files:`, orphanedFiles);

        for (const file of orphanedFiles) {
            if (file.remoteFileId) {
                // File had been pushed, so it was deleted remotely
                await dbService.deleteEntry({ id: file.id, addToQueue: false });
                console.log(`Deleted locally: ${file.id} (removed from remote)`);
            }
            // Files created locally will be handled by sync-up logic
        }
    }, []);

    // Main sync orchestration
    const syncRemoteState = useCallback(async () => {
        if (!canSync) {
            if (!user) {
                setStatus("Please sign in first");
            } else if (!masterKey) {
                setStatus("Master key not available");
            } else if (!gapiInitialized) {
                setStatus("Google Drive API not initialized");
            } else if (!driveAuthorized) {
                setStatus("Please authorize Drive access first");
            } else if (!syncReadiness.driveConfigured) {
                setStatus("Please configure Drive first");
            }
            return;
        }

        console.log("Syncing with Drive...");

        // Reset timer
        const next = Date.now() + SYNC_INTERVAL;
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        localStorage.setItem('nextSyncTime', next.toString());

        try {
            setStatus("Starting sync...");

            const driveFiles = await listAllDriveFiles();

            if (!driveFiles) {
                console.log('Not initialized yet');
                return;
            }

            setStatus(`Checking ${driveFiles.length} files...`);
            console.log('Mintype.json files:', driveFiles);

            // Handle deletions
            await handleOrphanedLocalFiles(driveFiles.map(file => file.id));

            // Pull updates and new files
            const pulledUpdated = await pullUpdatedFilesFromDrive(driveFiles);
            const pulledNew = await pullNewFilesFromDrive(driveFiles);

            // Update metadata if both operations succeeded
            if (pulledUpdated?.success && pulledNew?.success) {
                updateDriveFileState(driveFiles);
            }

            toast.success("Sync completed");
            dbService.notifyUpdate();
            localStorage.setItem('pullComplete', 'true');
            setStatus("Sync completed successfully");
        } catch (err) {
            console.error("Sync failed:", err);
            setStatus(`Sync failed: ${err.message}`);
            toast.error("Sync failed: " + err.message);
        }
    }, [
        canSync,
        user,
        masterKey,
        gapiInitialized,
        driveAuthorized,
        syncReadiness.driveConfigured,
        listAllDriveFiles,
        handleOrphanedLocalFiles,
        pullUpdatedFilesFromDrive,
        pullNewFilesFromDrive,
        updateDriveFileState
    ]);

    // Sign out from Drive
    const signOutDrive = useCallback(async () => {
        try {
            if (tokenService) {
                await tokenService.clearTokens();
            }
            setDriveAuthorized(false);
            setStatus("Signed out of Drive");
            toast.success("Signed out from Google Drive");
        } catch (error) {
            console.error('Failed to sign out from Drive:', error);
            toast.error('Failed to sign out from Drive');
        }
    }, [tokenService, setDriveAuthorized]);

    const value = {
        // Expose sync readiness state
        ...syncReadiness,

        // Drive-specific state
        status,
        setStatus,

        // Actions
        authorizeDriveAccess,
        syncRemoteState,
        signOutDrive,
        ensureAppFolder,
        listAllDriveFiles,
        getFileContent,
        makeAuthenticatedRequest,
    };

    return (
        <GoogleDriveContext.Provider value={value}>
            {children}
        </GoogleDriveContext.Provider>
    );
};


const syncProgress = {
    total: 0,
    completed: 0,
    current: null,
    listeners: new Set()
};

const emitProgress = () => {
    syncProgress.listeners.forEach(callback => callback({
        total: syncProgress.total,
        completed: syncProgress.completed,
        current: syncProgress.current,
        percentage: syncProgress.total ? Math.round((syncProgress.completed / syncProgress.total) * 100) : 0
    }));
};

export const useSyncProgress = (callback) => {
    useEffect(() => {
        syncProgress.listeners.add(callback);
        return () => syncProgress.listeners.delete(callback);
    }, [callback]);
};