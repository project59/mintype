import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useContext, useEffect, useState } from 'react'
import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { ChevronDownIcon } from 'lucide-react';
import { createImportedMeta, dirOf, embedZipImages, emptyImportResult, isZipFile, isZipMetadataPath, parseWhiteboardFile, rewritePageLinks } from './importUtils';
import { WHITEBOARD_EXTENSION } from '../exporting/markdownExport';
import { ImportActions, ImportError, ImportFileInput } from './ImportDialogParts';

const PAGE_FILE = new RegExp(`(\\.md|${WHITEBOARD_EXTENSION.replace(/\./g, '\\.')})$`, 'i');

export default function MarkdownImporter({ onImportComplete }) {
    let [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    function open() {
        setFile(null);
        setError(null);
        setIsOpen(true)
    }

    function close() {
        if (!isImporting) setIsOpen(false)
    }

    const handleFileChange = (selectedFile) => {
        setFile(isZipFile(selectedFile) ? selectedFile : null);
        setError(selectedFile && !isZipFile(selectedFile) ? 'Please select a ZIP file.' : null);
    };

    // Obsidian and other tools put YAML front matter above the content.
    const stripFrontMatter = (markdown) => markdown.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, '');

    // Every Markdown file, and every whiteboard exported as JSON, becomes a page at the top of the
    // chosen workspace. IDs are assigned up front so links between the imported files can point at
    // their new pages.
    const handleImport = async () => {
        setIsImporting(true);
        setError(null);
        setProgress({ current: 0, total: 0 });

        try {
            const zip = await JSZip.loadAsync(file);
            const paths = Object.keys(zip.files)
                .filter((path) => PAGE_FILE.test(path) && !zip.files[path].dir && !isZipMetadataPath(path))
                .sort((a, b) => a.localeCompare(b));
            if (paths.length === 0) {
                throw new Error('No Markdown or whiteboard files found in the zip archive');
            }

            const pageIds = new Map(paths.map((path) => [path, nanoid()]));
            const expectedNotesGeneration = dbService.getNotesGeneration();
            const results = { ...emptyImportResult(), total: paths.length };
            setProgress({ current: 0, total: paths.length });

            for (const [index, path] of paths.entries()) {
                const name = path.split('/').pop().replace(PAGE_FILE, '');
                const type = path.toLowerCase().endsWith(WHITEBOARD_EXTENSION) ? 'whiteboard' : 'document';
                try {
                    const baseDir = dirOf(path);
                    const text = await zip.file(path).async('string');
                    const linkPages = (markdown) => rewritePageLinks(markdown, baseDir, (target) => pageIds.get(target));
                    let content;
                    if (type === 'whiteboard') {
                        content = parseWhiteboardFile(text, linkPages);
                    } else {
                        const markdown = await embedZipImages(stripFrontMatter(text), zip, baseDir);
                        content = { type, markdown: linkPages(markdown) };
                    }

                    const meta = createImportedMeta({
                        id: pageIds.get(path),
                        name,
                        parentId: newRootId,
                        rootId: newRootId,
                        type,
                    });
                    const didImport = await dbService.importPage({
                        meta,
                        content,
                        masterKey,
                        expectedNotesGeneration,
                    });
                    if (!didImport) throw new Error('Notes were reset during the import.');
                    results.success++;
                } catch (pageError) {
                    console.error(`Error importing ${path}:`, pageError);
                    results.failures.push({ name, error: pageError.message });
                }
                setProgress({ current: index + 1, total: paths.length });
            }

            results.failed = results.failures.length;
            dbService.notifyUpdate();
            onImportComplete?.(results);
            if (results.success > 0) setIsOpen(false);
        } catch (error) {
            console.error('Import error:', error);
            setError(error.message);
        } finally {
            setIsImporting(false);
        }
    };

    const [newRootId, setNewRootId] = useState(null);
    const [allRoots, setAllRoots] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        dbService.getAllRootMeta().then((roots) => setAllRoots(roots.filter((root) => !root.deleted)));
    }, [isOpen])

    return (
        <>
            <Button
                onClick={open}
                className="btnPrimary"
            >
                Markdown
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle className="textTitle">Markdown Import</DialogTitle>
                        <p className='textRegular'>
                            Put your Markdown (.md) and whiteboard (.whiteboard.json) files in a ZIP folder, then upload it.
                        </p>

                        <Menu>
                            <MenuButton className="btnSecondary" disabled={isImporting}>
                                {allRoots.find((root) => root.id === newRootId)?.name || 'Select workspace'}
                                <ChevronDownIcon className="size-4 fill-white/60" />
                            </MenuButton>

                            <MenuItems
                                transition
                                anchor="bottom start"
                                className="dropdownPanel mt-1"
                            >
                                {allRoots.map((root) => (
                                    <MenuItem key={root.id}>
                                        <button
                                            className="dropdownItem text-left"
                                            onClick={() => setNewRootId(root.id)}
                                        >
                                            {root.name}
                                        </button>
                                    </MenuItem>
                                ))}
                            </MenuItems>
                        </Menu>
                        <ImportFileInput file={file} onFileChange={handleFileChange} disabled={isImporting} />

                        {isImporting && progress.total > 0 && (
                            <p className="textRegular">Importing {progress.current} of {progress.total} files...</p>
                        )}
                        <ImportError message={error} />
                        <ImportActions
                            onCancel={close}
                            onConfirm={handleImport}
                            canConfirm={!!file && !!newRootId}
                            isBusy={isImporting}
                        />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
