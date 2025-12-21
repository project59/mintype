import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useContext, useEffect, useState } from 'react'
import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { ChevronDownIcon } from 'lucide-react';

export default function MarkdownImporter({ parentId, rootId, onImportComplete }) {
    let [isOpen, setIsOpen] = useState(false)
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    // Convert markdown to HTML
    const markdownToHtml = (markdown) => {
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        return marked.parse(markdown);
    };

    // Extract base64 from image file in zip
    const extractImageData = async (zip, imagePath) => {
        try {
            // Normalize path (remove leading ./ or /)
            const normalizedPath = imagePath.replace(/^\.?\//, '');

            // Try to find the image file
            let imageFile = zip.file(normalizedPath);

            // If not found, try different path variations
            if (!imageFile) {
                const fileName = normalizedPath.split('/').pop();
                const allFiles = Object.keys(zip.files);
                const matchingFile = allFiles.find(f => f.endsWith(fileName));
                if (matchingFile) {
                    imageFile = zip.file(matchingFile);
                }
            }

            if (!imageFile) {
                console.warn(`Image not found: ${imagePath}`);
                return null;
            }

            const blob = await imageFile.async('blob');
            const base64 = await blobToBase64(blob);

            return {
                base64,
                fileName: normalizedPath.split('/').pop(),
                mimeType: blob.type || 'image/png'
            };
        } catch (error) {
            console.error(`Error extracting image ${imagePath}:`, error);
            return null;
        }
    };

    // Convert blob to base64
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Parse HTML into blocks
    // Parse HTML into blocks
    const parseHtmlToBlocks = async (html, zip, markdownFilePath) => {
        const blocks = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;

        // Get the directory of the markdown file for relative image paths
        const baseDir = markdownFilePath.split('/').slice(0, -1).join('/');

        let textBuffer = []; // Buffer to accumulate text elements

        // Helper function to flush text buffer into a block
        const flushTextBuffer = () => {
            if (textBuffer.length > 0) {
                const combinedHtml = textBuffer.join('');
                blocks.push({
                    id: nanoid(),
                    type: 'text',
                    data: {
                        text: combinedHtml
                    }
                });
                textBuffer = [];
            }
        };

        for (let i = 0; i < body.children.length; i++) {
            const element = body.children[i];
            const tagName = element.tagName.toLowerCase();

            // Handle code blocks
            if (tagName === 'pre') {
                const codeElement = element.querySelector('code');
                if (codeElement) {
                    // Flush any accumulated text before adding code block
                    flushTextBuffer();

                    const language = codeElement.className.match(/language-(\w+)/)?.[1] || 'javascript';
                    const code = codeElement.textContent;

                    blocks.push({
                        id: nanoid(),
                        type: 'code',
                        data: {
                            language: language,
                            code: code
                        }
                    });
                    continue;
                }
            }

            // Handle images
            if (tagName === 'img' || (tagName === 'p' && element.querySelector('img'))) {
                // Flush any accumulated text before adding image block
                flushTextBuffer();

                const img = tagName === 'img' ? element : element.querySelector('img');
                const src = img.getAttribute('src');

                if (src) {
                    // Resolve relative paths
                    const imagePath = src.startsWith('http') ? src :
                        (baseDir ? `${baseDir}/${src}` : src);

                    const imageData = await extractImageData(zip, imagePath);

                    if (imageData) {
                        blocks.push({
                            id: nanoid(),
                            type: 'image',
                            data: {
                                imageSource: imageData.base64,
                                sourceType: 'file',
                                fileName: imageData.fileName,
                                width: 720,
                                justify: 'center'
                            }
                        });
                        continue;
                    }
                }
            }

            // Handle text content (paragraphs, headers, lists, tables, etc.)
            if (element.textContent.trim() !== '') {
                // Add to text buffer instead of creating immediate block
                textBuffer.push(element.outerHTML);
            }
        }

        // Flush any remaining text in the buffer
        flushTextBuffer();

        // If no blocks were created, add a default empty text block
        if (blocks.length === 0) {
            blocks.push({
                id: nanoid(),
                type: 'text',
                data: {
                    text: '<p><br></p>'
                }
            });
        }

        return blocks;
    };
    // Create page metadata
    const createMetadata = (id, name, parentId, rootId) => {
        return {
            id,
            name,
            type: 'document',
            parentId,
            rootId,
            emoji: null,
            created: Date.now(),
            lastModified: Date.now(),
            lastMetaModified: Date.now(),
            isFavorite: false,
            order: 1000000,
            deleted: false,
            sensitive: false,
            remoteFileId: null,
            wikiId: null,
        };
    };

    // Create page content
    const createPageContent = (blocks) => {
        return {
            type: 'document',
            elements: [{
                id: nanoid(),
                type: 'dynamic',
                x: 5000,
                y: 5000,
                width: 600,
                bgColor: "#ffffff",
                rotation: 0,
                zIndex: 0,
                content: blocks,
                locked: false
            }],
            comments: [],
            preferences: {
                panX: 120,
                panY: 120,
                zoom: 1,
                bgColor: { r: 255, g: 255, b: 255 },
                lockScrollY: false,
                lockScrollX: false,
                gridType: "none",
                gridSize: 20,
                gridColor: { r: 0, g: 0, b: 0 },
            },
        };
    };

    // Save page to IndexedDB
    const savePageToIndexedDB = async (page, masterKey) => {
        // Save metadata
        await dbService.addMetaEntry({
            id: page.id,
            newContent: page.metadata,
            masterKey: masterKey,
            addToQueue: true
        });

        // Save content
        await dbService.addContentEntry({
            id: page.id,
            newContent: page.content,
            masterKey: masterKey,
            addToQueue: true
        });
    };

    // Process a single markdown file
    const processMarkdownFile = async (zip, file, filePath) => {
        try {
            const content = await file.async('string');

            // Convert markdown to HTML
            const html = markdownToHtml(content);

            // Parse HTML into blocks
            const blocks = await parseHtmlToBlocks(html, zip, filePath);

            // Extract file name without extension
            const fileName = file.name.split('/').pop().replace(/\.md$/, '');

            // Create page
            const pageId = nanoid();
            const metadata = createMetadata(pageId, fileName, newRootId, newRootId);
            const pageContent = createPageContent(blocks);

            const page = {
                id: pageId,
                metadata,
                content: pageContent
            };

            // Save to IndexedDB
            await savePageToIndexedDB(page, masterKey);

            return { success: true, fileName };
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
            return { success: false, fileName: file.name, error: error.message };
        }
    };

    // Handle file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);
        setProgress({ current: 0, total: 0 });

        try {
            // Load zip file
            const zip = await JSZip.loadAsync(file);

            // Find all markdown files
            const markdownFiles = [];
            zip.forEach((relativePath, zipEntry) => {
                if (relativePath.endsWith('.md') && !zipEntry.dir) {
                    markdownFiles.push({ path: relativePath, file: zipEntry });
                }
            });

            if (markdownFiles.length === 0) {
                throw new Error('No markdown files found in the zip archive');
            }

            setProgress({ current: 0, total: markdownFiles.length });

            // Process each markdown file
            const results = [];
            for (let i = 0; i < markdownFiles.length; i++) {
                const { path, file } = markdownFiles[i];
                const result = await processMarkdownFile(zip, file, path);
                results.push(result);
                setProgress({ current: i + 1, total: markdownFiles.length });
            }

            // Check for errors
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                console.warn('Some files failed to import:', failures);
            }

            const successCount = results.filter(r => r.success).length;

            if (onImportComplete) {
                onImportComplete({
                    total: markdownFiles.length,
                    success: successCount,
                    failed: failures.length,
                    failures
                });
            }

        } catch (error) {
            console.error('Import error:', error);
            setError(error.message);
        } finally {
            setIsImporting(false);
            event.target.value = ''; // Reset file input
        }
    };

    const [newRootId, setNewRootId] = useState(null);
    const [allRoots, setAllRoots] = useState([]);

    useEffect(() => {
        const fetchRoots = async () => {
            const roots = await dbService.getAllRootMeta();
            setAllRoots(roots);
        }
        fetchRoots();
    }, [])

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
                        <DialogTitle className="textTitle flex justify-between items-center">
                            Markdown Import
                            <div href="https://github.com/project59/mintype" className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                                beta
                            </div>
                        </DialogTitle>
                        <p className='textRegular'>
                            Please select a workspace to import into
                        </p>
                        <Menu>
                            <MenuButton className="btnSecondary">
                                {newRootId ? allRoots.find((root) => root.id === newRootId).name : 'Select workspace'}
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
                        <div className="markdown-importer">
                            {newRootId && (
                                <div className="">
                                    <label htmlFor="markdown-upload" className="btnPrimary cursor-pointer">
                                        {isImporting ? 'Importing...' : 'Import Markdown Zip'}
                                    </label>
                                    <input
                                        id="markdown-upload"
                                        type="file"
                                        accept=".zip"
                                        onChange={handleFileUpload}
                                        disabled={isImporting}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            )}

                            {isImporting && (
                                <div className="">
                                    <div className="progress-text">
                                        Importing {progress.current} of {progress.total} files...
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{
                                                width: `${(progress.current / progress.total) * 100}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="import-error">
                                    Error: {error}
                                </div>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
