import { useContext, useState } from 'react';
import JSZip from 'jszip';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { ImportError } from '../importing/ImportDialogParts';
import { safeFileName } from './archiveFormat';
import { buildMarkdownExport, downloadBlob } from './markdownExport';

const isPage = (entry) => entry.type === 'document' || entry.type === 'whiteboard';

// Exports the given workspaces as one unencrypted ZIP, each workspace in its own folder.
export default function MarkdownExporter({ workspaceIds, includeTrash, onExportComplete }) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const entriesByWorkspace = await Promise.all(workspaceIds.map((id) => dbService.getAllEntriesByRoot(id)));
            const pageEntries = entriesByWorkspace.map((entries, index) => entries.filter((entry) => (
                entry.id !== workspaceIds[index] && isPage(entry) && (includeTrash || !entry.deleted)
            )));
            const total = pageEntries.reduce((sum, entries) => sum + entries.length, 0);
            setProgress({ current: 0, total });

            const workspaces = [];
            const failures = [];
            for (const [index, id] of workspaceIds.entries()) {
                const meta = entriesByWorkspace[index].find((entry) => entry.id === id);
                const content = await dbService.getContent(id, masterKey).catch(() => null);
                const pages = [];
                for (const entry of pageEntries[index]) {
                    try {
                        pages.push({ meta: entry, content: await dbService.getContent(entry.id, masterKey) });
                    } catch (pageError) {
                        console.error(`Error exporting page ${entry.id}:`, pageError);
                        failures.push(entry.name || 'Untitled');
                    }
                    setProgress((current) => ({ ...current, current: current.current + 1 }));
                }
                workspaces.push({ meta, content, pages });
            }

            const zip = new JSZip();
            const count = buildMarkdownExport(zip, workspaces, { includeTrash });
            const fileName = workspaces.length === 1
                ? `${safeFileName(workspaces[0].meta.name)}-markdown.zip`
                : `mintype-export-${new Date().toISOString().slice(0, 10)}.zip`;
            downloadBlob(await zip.generateAsync({ type: 'blob' }), fileName);
            onExportComplete?.({ count });

            if (failures.length > 0) {
                setError(`${failures.length} pages could not be exported: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? ', ...' : ''}`);
            }
        } catch (err) {
            console.error('Export error:', err);
            setError(err.message || 'An error occurred during export');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-2">
            <button className="btnPrimary" onClick={handleExport} disabled={workspaceIds.length === 0 || isExporting}>
                {isExporting ? 'Exporting...' : 'Export ZIP'}
            </button>
            {isExporting && progress.total > 0 && (
                <p className="textRegular">Exporting {progress.current} of {progress.total} pages...</p>
            )}
            <ImportError message={error} />
        </div>
    );
}
