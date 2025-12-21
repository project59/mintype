import { useContext, useState } from 'react';
import JSZip from 'jszip';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

const JsonExporter = ({ onExportComplete, workspaceId }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const open = () => setIsOpen(true);
    const close = () => {
        if (!isExporting) {
            setIsOpen(false);
            setError(null);
            setProgress({ current: 0, total: 0 });
        }
    };
    const { masterKey } = useContext(SecureContext);

    const exportWorkspaceToJSON = async () => {
        setIsExporting(true);
        setError(null);
        setProgress({ current: 0, total: 0 });

        try {
            const zip = new JSZip();

            // Get workspace meta entry
            const workspaceMeta = await dbService.getMeta(workspaceId);

            // Get all workspace page meta entries
            const allWorkspaceMetas = await dbService.getAllEntriesByRoot(workspaceId);

            // Remove the workspace entry itself
            const allPages = allWorkspaceMetas.filter(page => page.id !== workspaceId);

            // Set total count for progress tracking
            const totalItems = allPages.length + 1; // +1 for workspace itself
            setProgress({ current: 0, total: totalItems });

            // Create the main data file
            zip.file("mintype-data.json", JSON.stringify({
                name: "mintype-appdata",
                created: Date.now(),
                entries: [workspaceMeta, ...allPages]
            }));

            // Get the workspace content
            const workspaceContent = await dbService.getContent(workspaceId, masterKey);
            zip.file(`${workspaceId}.json`, JSON.stringify(workspaceContent));

            // Update progress for workspace
            setProgress({ current: 1, total: totalItems });

            // Export all pages with progress tracking
            let completedPages = 1;
            for (const page of allPages) {
                try {
                    const pageContent = await dbService.getContent(page.id, masterKey);
                    zip.file(`${page.id}.json`, JSON.stringify(pageContent));
                    completedPages++;
                    setProgress({ current: completedPages, total: totalItems });
                } catch (pageError) {
                    console.error(`Error exporting page ${page.id}:`, pageError);
                    // Continue with other pages even if one fails
                }
            }

            // Generate and download the ZIP file
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${workspaceMeta.name}-export-JSON.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (onExportComplete) {
                onExportComplete({ success: true, count: allPages.length });
            }

            // Close dialog after successful export
            setTimeout(() => {
                setIsOpen(false);
                setProgress({ current: 0, total: 0 });
            }, 500);

        } catch (err) {
            console.error('Export error:', err);
            setError(err.message || 'An error occurred during export');

            if (onExportComplete) {
                onExportComplete({ success: false, error: err.message });
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Button
                onClick={open}
                className="btnPrimary"
            >
                Export to JSON
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle className="textTitle flex justify-between items-center">
                            JSON (Mintype) Export
                            <div className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                                beta
                            </div>
                        </DialogTitle>
                        <p className='textRegular'>
                            Export your pages as JSON files, packaged in a ZIP. This is ideal for backing up your workspace or transferring data between Mintype instances.
                        </p>
                        <p className='infoBox'>
                            JSON exports save your full page structure, hierarchy and workspace data for quick import into Mintype.
                        </p>
                        <button
                            className="btnPrimary ml-auto"
                            onClick={exportWorkspaceToJSON}
                            disabled={isExporting}
                        >
                            {isExporting ? 'Exporting...' : 'Export to JSON'}
                        </button>

                        {isExporting && (
                            <div className="mt-4">
                                <div className="textRegular mb-2">
                                    Exporting {progress.current} of {progress.total} pages...
                                </div>
                                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-4 bg-blue-500 transition-all duration-300"
                                        style={{
                                            width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-red-500 mt-4">
                                Error: {error}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default JsonExporter;