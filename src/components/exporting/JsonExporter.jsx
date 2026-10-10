import { useContext, useState } from 'react';
import JSZip from 'jszip';
import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { encryptDataWithMasterKey } from '../../layouts/secure-context/secureUtils';
import { MINTYPE_DATA_FILE, MINTYPE_EXPORT_VERSION } from '../importing/JSONImporter';
import { ImportActions, ImportError } from '../importing/ImportDialogParts';
import { downloadBlob } from './markdownExport';

const JsonExporter = ({ workspaceId, onExportComplete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    const open = () => {
        setError(null);
        setIsOpen(true);
    };
    const close = () => {
        if (!isExporting) setIsOpen(false);
    };

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const zip = new JSZip();
            const workspaceMeta = await dbService.getMeta(workspaceId);
            // Includes the workspace entry itself, whose rootId is its own ID.
            const entries = await dbService.getAllEntriesByRoot(workspaceId);
            setProgress({ current: 0, total: entries.length });

            // Content is copied as stored, still encrypted; entries without content are left out
            // since they cannot be opened or imported.
            const exportedEntries = [];
            for (const entry of entries) {
                const record = await dbService.getEncryptedContent(entry.id);
                if (record) {
                    zip.file(`${entry.id}.json`, JSON.stringify(record));
                    exportedEntries.push({ ...entry, remoteFileId: null, syncedModified: undefined });
                }
                setProgress((current) => ({ ...current, current: current.current + 1 }));
            }

            // Page names and structure are encrypted too, the same way as the Drive metadata file.
            const envelope = await encryptDataWithMasterKey(masterKey, JSON.stringify({ entries: exportedEntries }));
            zip.file(MINTYPE_DATA_FILE, JSON.stringify({
                name: 'mintype-appdata',
                version: MINTYPE_EXPORT_VERSION,
                encrypted: true,
                created: Date.now(),
                ...envelope,
            }));

            const fileName = (workspaceMeta.name || 'workspace').replace(/[\\/:*?"<>|]/g, '_');
            downloadBlob(await zip.generateAsync({ type: 'blob' }), `${fileName}-export-JSON.zip`);
            onExportComplete?.({ success: true, count: exportedEntries.length - 1 });
            setIsOpen(false);
        } catch (err) {
            console.error('Export error:', err);
            setError(err.message || 'An error occurred during export');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Button onClick={open} disabled={!workspaceId} className="btnPrimary">
                Mintype JSON
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle className="textTitle">JSON (Mintype) Export</DialogTitle>
                        <p className="textRegular">
                            Export the workspace as a ZIP backup, with its full page structure, for quick import into Mintype.
                        </p>
                        <p className="infoBox">
                            The backup stays encrypted, so it can only be imported while Mintype is unlocked with the same keys.
                        </p>

                        {isExporting && progress.total > 0 && (
                            <p className="textRegular">Exporting {progress.current} of {progress.total} pages...</p>
                        )}
                        <ImportError message={error} />
                        <ImportActions
                            onCancel={close}
                            onConfirm={handleExport}
                            canConfirm={!!workspaceId}
                            isBusy={isExporting}
                            label="Export"
                            busyLabel="Exporting..."
                        />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default JsonExporter;
