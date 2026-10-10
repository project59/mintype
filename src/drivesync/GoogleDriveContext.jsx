import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useSyncReadiness } from '../lib/useSyncReadiness.js';
import { useSupabaseAuth } from '../layouts/auth/SupabaseAuthProvider.jsx';
import { SecureContext } from '../layouts/secure-context/SecureContext.jsx';
import { TokenService } from '../lib/tokenService.js';
import { OAuthHandler } from '../lib/oauthHandler.js';
import { encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';
import { driveErrorStatus, isRetryableDriveError, toDriveError } from '../lib/driveErrors.js';

const MAX_REQUEST_ATTEMPTS = 5;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryDelay = (attempt) => Math.min(30000, 1000 * 2 ** (attempt - 1)) + Math.random() * 500;

const GoogleDriveContext = createContext();

export const useGoogleDrive = () => {
    const context = useContext(GoogleDriveContext);
    if (!context) {
        throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
    }
    return context;
};

export const GoogleDriveProvider = ({ children }) => {
    const { accessToken } = useSupabaseAuth();
    const { masterKey } = useContext(SecureContext);
    const syncReadiness = useSyncReadiness();

    const [status, setStatus] = useState('Pending');
    const [tokenService, setTokenService] = useState(null);
    const [oauthHandler, setOauthHandler] = useState(null);

    const {
        hasAuth,
        setGapiInitialized,
        setDriveAuthorized,
        setDriveConfigured,
    } = syncReadiness;

    const API_KEY = import.meta.env.VITE_API_KEY;
    const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

    // Initialize services when master key is available
    useEffect(() => {
        if (masterKey) {
            setTokenService(new TokenService(masterKey));
            setOauthHandler(new OAuthHandler(import.meta.env.VITE_BACKEND_URL));
        }
    }, [masterKey]);

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
    const setGapiToken = useCallback(async (forceRefresh = false) => {
        if (!tokenService || !window.gapi?.client) {
            throw new Error('Google Drive is not ready yet');
        }
        const accessToken = await tokenService.getValidAccessToken(apiFetch, { forceRefresh });
        window.gapi.client.setToken({ access_token: accessToken });
        return accessToken;
    }, [tokenService, apiFetch]);

    // Generic wrapper for Drive API calls: refreshes the token once on 401 and backs off on rate
    // limits and server errors. Errors are rethrown as Error objects carrying `status`.
    const makeAuthenticatedRequest = useCallback(async (requestFn) => {
        let forceRefresh = false;
        for (let attempt = 1; ; attempt++) {
            await setGapiToken(forceRefresh);
            try {
                return await requestFn();
            } catch (error) {
                if (driveErrorStatus(error) === 401) {
                    if (!forceRefresh) {
                        forceRefresh = true;
                        continue;
                    }
                    setDriveAuthorized(false);
                    throw new Error('Authorization expired. Please re-authorize Drive access.');
                }
                forceRefresh = false;
                if (attempt < MAX_REQUEST_ATTEMPTS && isRetryableDriveError(error)) {
                    await sleep(retryDelay(attempt));
                    continue;
                }
                throw toDriveError(error);
            }
        }
    }, [setGapiToken, setDriveAuthorized]);

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

            // Find or create folder. The oldest match is used so every device settles on the same
            // folder if setup ever raced.
            const folderList = await window.gapi.client.drive.files.list({
                q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: "files(id, name)",
                orderBy: "createdTime",
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
                orderBy: "createdTime",
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
                    tombstones: {},
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
                if (!fileResponse.id) {
                    throw new Error(fileResponse.error?.message || 'Could not create the Mintype meta file');
                }

                fileId = fileResponse.id;
                setStatus("Created new meta file");
            }

            localStorage.setItem("mintypeFileId", fileId);
            setDriveConfigured(true);
            setStatus("Drive setup complete");

            return folderId;
        });
    }, [makeAuthenticatedRequest, masterKey, tokenService, apiFetch, setDriveConfigured]);

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
        signOutDrive,
        ensureAppFolder,
        makeAuthenticatedRequest,
    };

    return (
        <GoogleDriveContext.Provider value={value}>
            {children}
        </GoogleDriveContext.Provider>
    );
};
