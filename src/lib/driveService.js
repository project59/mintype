import { useContext, useMemo } from 'react';
import { useGoogleDrive } from '../drivesync/GoogleDriveContext.jsx';
import { SecureContext } from '../layouts/secure-context/SecureContext.jsx';
import { decryptDataWithMasterKey, encryptDataWithMasterKey } from '../layouts/secure-context/secureUtils.js';
import { DRIVE_KEY_MISMATCH, isDriveNotFound } from './driveErrors.js';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const META_FILE_NAME = 'mintype-data.json';

function requireStoredId(key) {
    const id = localStorage.getItem(key);
    if (!id) throw new Error('Google Drive is not configured');
    return id;
}

// Drive files hold the same `{ iv, ciphertext }` record that IndexedDB stores, so page content is
// uploaded and downloaded without being decrypted. Every call throws on failure.
export const useGoogleDriveAPI = () => {
    const { makeAuthenticatedRequest } = useGoogleDrive();
    const { masterKey } = useContext(SecureContext);

    return useMemo(() => {
        const request = (options) => makeAuthenticatedRequest(() => window.gapi.client.request(options));

        const upload = (path, method, metadata, record) => request({
            path,
            method,
            params: { uploadType: 'multipart', fields: 'id,version' },
            headers: { 'Content-Type': 'multipart/related; boundary="foo_bar_baz"' },
            body: createMultipartBody(metadata, {
                mimeType: 'application/json',
                body: JSON.stringify({ ciphertext: record.ciphertext, iv: record.iv }),
            }),
        });

        const downloadFile = async (fileId) => {
            const response = await request({ path: `${DRIVE_FILES_URL}/${fileId}`, method: 'GET', params: { alt: 'media' } });
            const { iv, ciphertext } = JSON.parse(response.body);
            return { iv, ciphertext };
        };

        return {
            // Drive increments a file's version on every change, so this cheaply tells whether the
            // metadata file changed since it was last read.
            async getMetaVersion() {
                const response = await request({
                    path: `${DRIVE_FILES_URL}/${requireStoredId('mintypeFileId')}`,
                    method: 'GET',
                    params: { fields: 'version' },
                });
                return response.result.version;
            },

            async readMeta() {
                const { iv, ciphertext } = await downloadFile(requireStoredId('mintypeFileId'));
                try {
                    return await decryptDataWithMasterKey(masterKey, iv, ciphertext);
                } catch {
                    throw Object.assign(
                        new Error("Your Google Drive notes are encrypted with a different key than this device's."),
                        { code: DRIVE_KEY_MISMATCH },
                    );
                }
            },

            async writeMeta(meta) {
                const record = await encryptDataWithMasterKey(masterKey, JSON.stringify(meta));
                const response = await upload(
                    `${DRIVE_UPLOAD_URL}/${requireStoredId('mintypeFileId')}`,
                    'PATCH',
                    { name: META_FILE_NAME },
                    record,
                );
                return response.result.version;
            },

            downloadFile,

            async createFile(entry, record) {
                const response = await upload(DRIVE_UPLOAD_URL, 'POST', {
                    // Named by ID because names change and the name is only updated on upload.
                    name: `${entry.id}.json`,
                    parents: [requireStoredId('mintypeFolderId')],
                    properties: { localId: entry.id, type: entry.type },
                }, record);
                return response.result.id;
            },

            async updateFile(fileId, entry, record) {
                await upload(`${DRIVE_UPLOAD_URL}/${fileId}`, 'PATCH', { name: `${entry.id}.json` }, record);
            },

            // A file that is already gone counts as deleted.
            async deleteFile(fileId) {
                try {
                    await request({ path: `${DRIVE_FILES_URL}/${fileId}`, method: 'DELETE' });
                } catch (error) {
                    if (!isDriveNotFound(error)) throw error;
                }
            },
        };
    }, [makeAuthenticatedRequest, masterKey]);
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
