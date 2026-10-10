import { useContext, useState } from 'react';
import JSZip from 'jszip';
import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { ImportActions, ImportError } from '../importing/ImportDialogParts';
import { downloadBlob, extractImages, linkTo, safeFileName, toPortableMarkdown, toPortableWhiteboard, WHITEBOARD_EXTENSION } from './markdownExport';

const EXPORTED_TYPES = new Set(['document', 'whiteboard']);
const fileExtension = (type) => (type === 'whiteboard' ? WHITEBOARD_EXTENSION : '.md');

// Gives each page a readable, unique file name, so re-importing restores its title.
const assignFileNames = (pages) => {
    const used = new Set();
    return new Map(pages.map((page) => {
        const base = safeFileName(page.name);
        let name = base;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} ${n}`;
        used.add(name.toLowerCase());
        return [page.id, name];
    }));
};

const MarkdownExporter = ({ workspaceId, onExportComplete }) => {
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
            const workspaceMeta = await dbService.getMeta(workspaceId);
            const pages = (await dbService.getAllEntriesByRoot(workspaceId))
                .filter((page) => page.id !== workspaceId && !page.deleted && EXPORTED_TYPES.has(page.type));

            const fileNames = assignFileNames(pages);
            const pageLinks = new Map(pages.map((page) => [page.id, {
                title: page.name || 'Untitled',
                href: linkTo(`${fileNames.get(page.id)}${fileExtension(page.type)}`),
            }]));

            const zip = new JSZip();
            const images = new Map();
            let exportedCount = 0;
            setProgress({ current: 0, total: pages.length });

            for (const page of pages) {
                try {
                    const content = await dbService.getContent(page.id, masterKey);
                    const fileName = fileNames.get(page.id);
                    if (page.type === 'whiteboard') {
                        zip.file(`${fileName}${WHITEBOARD_EXTENSION}`, JSON.stringify(toPortableWhiteboard(content, pageLinks)));
                    } else {
                        const markdown = toPortableMarkdown(content.markdown || '', pageLinks);
                        zip.file(`${fileName}.md`, extractImages(markdown, images, fileName));
                    }
                    exportedCount++;
                } catch (pageError) {
                    console.error(`Error exporting page ${page.id}:`, pageError);
                }
                setProgress((current) => ({ ...current, current: current.current + 1 }));
            }

            images.forEach((path, dataUrl) => {
                zip.file(path, dataUrl.slice(dataUrl.indexOf(',') + 1), { base64: true });
            });

            const zipName = safeFileName(workspaceMeta?.name || 'workspace');
            downloadBlob(await zip.generateAsync({ type: 'blob' }), `${zipName}-export-Markdown.zip`);
            onExportComplete?.({ success: true, count: exportedCount });

            if (exportedCount < pages.length) {
                setError(`${pages.length - exportedCount} pages could not be exported.`);
            } else {
                setIsOpen(false);
            }
        } catch (err) {
            console.error('Export error:', err);
            setError(err.message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Button onClick={open} disabled={!workspaceId} className="btnPrimary">
                Markdown
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle className="textTitle">Markdown Export</DialogTitle>
                        <p className="textRegular">
                            Export the workspace's pages as Markdown (.md) files in a ZIP folder, with images in an 'images' folder. Columns are flattened, and links between pages point to their exported files.
                        </p>
                        <p className="infoBox">
                            Your page hierarchy will NOT be preserved during Markdown exports. Whiteboards are exported as JSON files (.whiteboard.json), which the Markdown importer can bring back into Mintype.
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

export default MarkdownExporter;
