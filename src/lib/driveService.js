import { useContext } from 'react';
import { useGoogleDrive } from '../drivesync/GoogleDriveContext.jsx';
import { SecureContext } from '../layouts/secure-context/SecureContext.jsx';
import { encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';

export const useGoogleDriveAPI = () => {
    const { makeAuthenticatedRequest, setStatus } = useGoogleDrive();
    const {masterKey} = useContext(SecureContext);

    const createFileInDrive = async (fileMeta, fileContent) => {
        return await makeAuthenticatedRequest(async () => {
            try {
                const mintypeFolderId = localStorage.getItem('mintypeFolderId')
                if (!mintypeFolderId) {
                    setStatus('Failed to access Mintype folder');
                    return null;
                }

                if (!masterKey) return;
                const { ciphertext, iv } = await encryptDataWithMasterKey(masterKey, JSON.stringify(fileContent));
                const fileData = JSON.stringify({ ciphertext, iv });

                const fileMetadata = {
                    name: `${fileMeta.id}.json`, // we will use ID, not name, to avoid duplicates and also because names can change, 
                    // but the name wont be reflected until the page itself is synced, which might confuse users
                    parents: [mintypeFolderId],
                    properties: {
                        localId: fileMeta.id,
                        type: fileMeta.type
                    }
                };

                const media = {
                    mimeType: 'application/json',
                    body: fileData,
                };

                const fileResponse = await window.gapi.client.request({
                    path: 'https://www.googleapis.com/upload/drive/v3/files',
                    method: 'POST',
                    params: {
                        uploadType: 'multipart',
                        fields: 'id, name, properties'
                    },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
                    },
                    body: createMultipartBody(fileMetadata, media)
                });

                return {
                    fileId: fileResponse.result.id,
                    created: fileContent.created
                };
            } catch (error) {
                console.error('Error creating file in Drive:', error);
                setStatus(`Error creating ${fileMeta.type}: ${error.message}`);
                return null;
            }
        });
    };

    const updateFileInDrive = async (fileMeta, fileContent) => {
        if (!fileMeta.remoteFileId) {
            console.warn('No remoteFileId found for file, cannot update:', fileMeta);
            setStatus(`Cannot update ${fileMeta.type}: No remoteFileId found.`);
            return null;
        }
        return await makeAuthenticatedRequest(async () => {
            try {
                if (!masterKey) return;
                const { ciphertext, iv } = await encryptDataWithMasterKey(masterKey, JSON.stringify(fileContent));
                const fileData = JSON.stringify({ ciphertext, iv });

                const fileMetadata = {
                    name: `${fileMeta.id}.json`,
                };
                const media = {
                    mimeType: 'application/json',
                    body: fileData,
                };

                const fileResponse = await window.gapi.client.request({
                    path: `https://www.googleapis.com/upload/drive/v3/files/${fileMeta.remoteFileId}`,
                    method: 'PATCH',
                    params: {
                        uploadType: 'multipart',
                        fields: 'id, name, properties'
                    },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
                    },
                    body: createMultipartBody(fileMetadata, media)
                });

                return {
                    fileId: fileResponse.result.id,
                    updated: new Date().toISOString()
                };
            } catch (error) {
                console.error('Error updating file in Drive:', error);
                setStatus(`Error updating ${fileMeta.type}: ${error.message}`);
                return null;
            }
        });
    };

    const updateMetaInDrive = async (fileContent) => {
        return await makeAuthenticatedRequest(async () => {
            try {
                const mintypeFileId = localStorage.getItem('mintypeFileId');
                if (!masterKey) return;
                const { ciphertext, iv } = await encryptDataWithMasterKey(masterKey, JSON.stringify(fileContent));
                const fileData = JSON.stringify({ ciphertext, iv });
                const fileMetadata = {
                    name: `mintype-data.json`,
                };

                const media = {
                    mimeType: 'application/json',
                    body: fileData,
                };

                const fileResponse = await window.gapi.client.request({
                    path: `https://www.googleapis.com/upload/drive/v3/files/${mintypeFileId}`,
                    method: 'PATCH',
                    params: {
                        uploadType: 'multipart',
                        fields: 'id, name, properties'
                    },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="foo_bar_baz"'
                    },
                    body: createMultipartBody(fileMetadata, media)
                });
                return {
                    fileId: fileResponse.result.id,
                    updated: new Date().toISOString()
                };
            } catch (error) {
                console.error('Error updating file in Drive:', error);
                setStatus(`Error updating mintype data file: ${error.message}`);
                return null;
            }
        });
    };

    const deleteFileFromDrive = async (remoteFileId, moveToTrash = false) => {
        return await makeAuthenticatedRequest(async () => {
            try {
                if (moveToTrash) {
                    await window.gapi.client.request({
                        path: `https://www.googleapis.com/drive/v3/files/${remoteFileId}`,
                        method: 'PATCH',
                        body: JSON.stringify({ trashed: true })
                    });
                } else {
                    await window.gapi.client.request({
                        path: `https://www.googleapis.com/drive/v3/files/${remoteFileId}`,
                        method: 'DELETE'
                    });
                }
                return true;
            } catch (error) {
                const action = moveToTrash ? 'moving to trash' : 'deleting';
                console.error(`Error ${action} file:`, error);
                setStatus(`Error ${action} file: ${error.message}`);
                return false;
            }
        });
    };

    return {
        createFileInDrive,
        updateFileInDrive,
        deleteFileFromDrive,
        updateMetaInDrive
    };
};

// Helper function to create multipart body for file upload
const createMultipartBody = (metadata, media) => {
    const delimiter = 'foo_bar_baz';
    const close_delim = `\r\n--${delimiter}--`;

    let body = `--${delimiter}\r\n`;
    body += 'Content-Type: application/json\r\n\r\n';
    body += JSON.stringify(metadata) + '\r\n';
    body += `--${delimiter}\r\n`;
    body += `Content-Type: ${media.mimeType}\r\n\r\n`;
    body += media.body;
    body += close_delim;

    return body;
};
