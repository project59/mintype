import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useContext, useEffect, useState } from 'react'
import { nanoid } from 'nanoid';
import { ChevronDownIcon } from 'lucide-react';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { newPageSchema } from '../../utils/constants';
import { createPageResolver, planMarkdownImport, readPageContent } from './markdownImport';
import { emptyImportResult, isZipFile, loadZipFiles, loadZipImage, resolveZipPath } from './importUtils';
import { ImportActions, ImportError, ImportFileInput } from './ImportDialogParts';

const NEW_WORKSPACE = 'new';
const IMAGE_URL = /^(https?:|data:image\/)/i;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function MarkdownImporter({ onImportComplete }) {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState(null);
    const [source, setSource] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const [target, setTarget] = useState(NEW_WORKSPACE);
    const [allRoots, setAllRoots] = useState([]);
    const { masterKey } = useContext(SecureContext);

    useEffect(() => {
        if (!isOpen) return;
        dbService.getAllRootMeta().then((roots) => setAllRoots(roots.filter((root) => !root.deleted)));
    }, [isOpen])

    function open() {
        setFile(null);
        setSource(null);
        setError(null);
        setTarget(NEW_WORKSPACE);
        setIsOpen(true)
    }

    function close() {
        if (!isImporting) setIsOpen(false)
    }

    const handleFileChange = async (selectedFile) => {
        setFile(null);
        setSource(null);
        setError(null);
        if (!selectedFile) return;
        if (!isZipFile(selectedFile)) return setError('Please select a ZIP file.');

        setFile(selectedFile);
        setIsReading(true);
        try {
            const files = await loadZipFiles(selectedFile);
            setSource({ files, plan: await planMarkdownImport(files, selectedFile.name) });
        } catch (readError) {
            console.error('Could not read ZIP:', readError);
            setError(readError.message);
        } finally {
            setIsReading(false);
        }
    };

    // A background from a Mintype export is a URL or a file in the workspace folder.
    const readBackground = async (files, workspace) => {
        const { background, root } = workspace;
        if (!background || IMAGE_URL.test(background)) return background;
        return loadZipImage(files, resolveZipPath(root, background), { compress: false });
    };

    // Pages get their IDs up front so links between them, even across workspaces, can point at
    // their new pages. A page whose parent failed to import goes to the top of its workspace.
    const handleImport = async () => {
        setIsImporting(true);
        setError(null);

        try {
            const { files, plan } = source;
            const resolvePage = createPageResolver(plan);
            const ids = new Map(plan.workspaces.flatMap((workspace) => workspace.pages.map((page) => [page.key, nanoid()])));
            const imported = new Set();
            const expectedNotesGeneration = dbService.getNotesGeneration();
            const results = { ...emptyImportResult(), total: plan.pageCount };
            setProgress({ current: 0, total: plan.pageCount });

            for (const workspace of plan.workspaces) {
                let rootId = target;
                if (target === NEW_WORKSPACE) {
                    rootId = await dbService.addRootEntry({
                        newContent: { name: workspace.name, ...(workspace.emoji && { emoji: workspace.emoji }) },
                        password: masterKey,
                    });
                    if (workspace.fromMintype) {
                        const background = await readBackground(files, workspace).catch(() => null);
                        await dbService.updateContentField({ id: rootId, fieldName: 'background', newValue: background, masterKey });
                    }
                }

                for (const page of workspace.pages) {
                    try {
                        const content = await readPageContent(page, workspace, {
                            files,
                            resolvePage,
                            idForPage: (linked) => ids.get(linked.key),
                            readImage: (path) => loadZipImage(files, path, { compress: !workspace.fromMintype }),
                        });
                        let parentId = imported.has(page.parentKey) ? ids.get(page.parentKey) : rootId;
                        if (page.quickNote) parentId = 'quickNote';
                        const meta = {
                            ...newPageSchema(page.type, null, page.name),
                            ...page.meta,
                            id: ids.get(page.key),
                            parentId: page.trashed ? rootId : parentId,
                            rootId,
                            deleted: page.trashed,
                        };
                        const didImport = await dbService.importPage({ meta, content, masterKey, expectedNotesGeneration });
                        if (!didImport) throw new Error('Notes were reset during the import.');
                        imported.add(page.key);
                        results.success++;
                    } catch (pageError) {
                        console.error(`Error importing ${page.path || page.name}:`, pageError);
                        results.failures.push({ name: page.name, error: pageError.message });
                    }
                    setProgress((current) => ({ ...current, current: current.current + 1 }));
                }
            }

            results.failed = results.failures.length;
            dbService.notifyUpdate();
            onImportComplete?.(results);
            if (results.success > 0) setIsOpen(false);
        } catch (importError) {
            console.error('Import error:', importError);
            setError(importError.message);
        } finally {
            setIsImporting(false);
        }
    };

    const plan = source?.plan;
    const targetName = target === NEW_WORKSPACE
        ? (plan?.workspaces.length > 1 ? 'New workspaces' : 'New workspace')
        : allRoots.find((root) => root.id === target)?.name;

    return (
        <>
            <Button onClick={open} className="btnPrimary">
                Markdown
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle className="textTitle">Markdown Import</DialogTitle>
                        <p className='textRegular'>
                            Upload a ZIP of Markdown (.md) files: a Mintype export, an Obsidian vault, or a Notion export in 'Markdown & CSV' format. Folders become sub-pages and images are kept.
                        </p>

                        <ImportFileInput file={file} onFileChange={handleFileChange} disabled={isImporting || isReading} />
                        {isReading && <p className="textRegular">Reading ZIP...</p>}
                        {plan && (
                            <p className="infoBox">
                                Found {plural(plan.pageCount, 'page')}
                                {plan.workspaces.length > 1 && ` in ${plural(plan.workspaces.length, 'workspace')}`}
                                {plan.workspaces.some((workspace) => workspace.fromMintype) && ', exported from Mintype'}.
                            </p>
                        )}

                        {plan && (
                            <div className="space-y-1">
                                <p className="textLabel">Import into</p>
                                <Menu>
                                    <MenuButton className="btnSecondary" disabled={isImporting}>
                                        {targetName}
                                        <ChevronDownIcon className="size-4 fill-white/60" />
                                    </MenuButton>
                                    <MenuItems transition anchor="bottom start" className="dropdownPanel mt-1">
                                        <MenuItem>
                                            <button className="dropdownItem text-left" onClick={() => setTarget(NEW_WORKSPACE)}>
                                                {plan.workspaces.length > 1 ? 'New workspaces' : 'New workspace'}
                                            </button>
                                        </MenuItem>
                                        {allRoots.map((root) => (
                                            <MenuItem key={root.id}>
                                                <button className="dropdownItem text-left" onClick={() => setTarget(root.id)}>
                                                    {root.name}
                                                </button>
                                            </MenuItem>
                                        ))}
                                    </MenuItems>
                                </Menu>
                            </div>
                        )}

                        {isImporting && progress.total > 0 && (
                            <p className="textRegular">Importing {progress.current} of {progress.total} pages...</p>
                        )}
                        <ImportError message={error} />
                        <ImportActions
                            onCancel={close}
                            onConfirm={handleImport}
                            canConfirm={!!plan}
                            isBusy={isImporting}
                        />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
