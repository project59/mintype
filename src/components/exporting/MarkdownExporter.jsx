import { useContext, useState } from 'react';
import JSZip from 'jszip';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

const MarkdownExporter = ({ pageIds, onExportComplete }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    const { masterKey } = useContext(SecureContext);

    // Initialize Turndown for HTML to Markdown conversion
    const initTurndown = () => {
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: '_',
            strongDelimiter: '**',
            linkStyle: 'inlined'
        });
        turndownService.use(gfm);
        return turndownService;
    };

    // Extract base64 images from HTML and store them
    const extractImagesFromHtml = (html, imageMap) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img');

        images.forEach((img, index) => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('data:')) {
                const imageId = `image_${Date.now()}_${index}.png`;
                imageMap.set(imageId, src);
                img.setAttribute('src', imageId);
            }
        });

        return doc.body.innerHTML;
    };

    // Strip HTML to plain text
    const stripHtml = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    };

    // Build todo hierarchy
    const buildTodoHierarchy = (todos) => {
        const todoMap = new Map();
        const rootTodos = [];

        // Create map of all todos
        todos.forEach(todo => {
            todoMap.set(todo.id, { ...todo, children: [] });
        });

        // Build hierarchy
        todos.forEach(todo => {
            if (todo.parentId && todoMap.has(todo.parentId)) {
                todoMap.get(todo.parentId).children.push(todoMap.get(todo.id));
            } else {
                rootTodos.push(todoMap.get(todo.id));
            }
        });

        // Sort by order
        const sortTodos = (todoList) => {
            todoList.sort((a, b) => a.order - b.order);
            todoList.forEach(todo => {
                if (todo.children.length > 0) {
                    sortTodos(todo.children);
                }
            });
        };

        sortTodos(rootTodos);
        return rootTodos;
    };

    // Convert todo to markdown recursively
    const todoToMarkdown = (todo, indent = 0) => {
        const checkbox = todo.completed ? '[x]' : '[ ]';
        const indentation = '  '.repeat(indent);
        const description = todo.description ? ` (${todo.description})` : '';
        let markdown = `${indentation}- ${checkbox} ${todo.title}${description}\n`;

        if (todo.children && todo.children.length > 0) {
            todo.children.forEach(child => {
                markdown += todoToMarkdown(child, indent + 1);
            });
        }

        return markdown;
    };

    // Convert a single block to markdown
    const convertBlockToMarkdown = async (block, turndownService, imageMap, imageCounter) => {
        let markdown = '';

        switch (block.type) {
            case 'text':
                if (block.data.text) {
                    // Extract any images from the HTML first
                    const processedHtml = extractImagesFromHtml(block.data.text, imageMap);
                    markdown = turndownService.turndown(processedHtml);
                }
                break;

            case 'image':
                if (block.data.imageSource) {
                    if (block.data.sourceType === 'file') {
                        // Data URL - extract and save
                        const imageId = `image_${imageCounter.count++}_${block.data.fileName || 'image.png'}`;
                        imageMap.set(imageId, block.data.imageSource);
                        markdown = `![${block.data.fileName || 'image'}](${imageId})`;
                    } else {
                        // External URL
                        markdown = `![image](${block.data.imageSource})`;
                    }
                }
                break;

            case 'code':
                const language = block.data.language || '';
                const code = block.data.code || '';
                markdown = `\`\`\`${language}\n${code}\n\`\`\``;
                break;

            case 'video':
                if (block.data.videoUrl) {
                    markdown = `[Video](${block.data.videoUrl})`;
                }
                break;

            case 'callout':
                const emoji = block.data.emoji || '💡';
                const content = block.data.content || '';
                const type = block.data.type || 'info'
                const processedCallout = extractImagesFromHtml(content, imageMap);
                const calloutText = turndownService.turndown(processedCallout);
                markdown = `> ${emoji} **${type.toUpperCase()}**\n> \n> ${calloutText.replace(/\n/g, '\n> ')}`;
                break;

            case 'pageEmbed':
                if (block.data.pageId) {
                    markdown = `[Embedded Page](https://mintype.app/${block.data.pageId})`;
                }
                break;

            case 'todo':
                if (block.data.title) {
                    markdown += `### ${block.data.title}\n\n`;
                }

                if (block.data.todos && block.data.todos.length > 0) {
                    const hierarchy = buildTodoHierarchy(block.data.todos);
                    hierarchy.forEach(todo => {
                        markdown += todoToMarkdown(todo);
                    });
                }
                break;

            case 'table':
                if (block.data.columns && block.data.rows) {
                    // Create header row
                    const headers = block.data.columns.map(col => col.name);
                    markdown += `| ${headers.join(' | ')} |\n`;

                    // Create separator row
                    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;

                    // Create data rows
                    block.data.rows.forEach(row => {
                        const cells = block.data.columns.map(col => {
                            const cellValue = row.cells[col.id];
                            if (cellValue === null || cellValue === undefined) {
                                return '';
                            }

                            // If it's HTML, strip it and extract images
                            if (typeof cellValue === 'string' && cellValue.includes('<')) {
                                const processedCell = extractImagesFromHtml(cellValue, imageMap);
                                return stripHtml(processedCell).trim();
                            }

                            return String(cellValue);
                        });
                        markdown += `| ${cells.join(' | ')} |\n`;
                    });
                }
                break;

            case 'collapse':
                if (block.data.title) {
                    markdown += `### ${block.data.title}\n\n`;
                }

                if (block.data.content && block.data.content.length > 0) {
                    for (const childBlock of block.data.content) {
                        const childMarkdown = await convertBlockToMarkdown(
                            childBlock,
                            turndownService,
                            imageMap,
                            imageCounter
                        );
                        markdown += childMarkdown + '\n\n';
                    }
                }
                break;

            case 'columns':
                if (block.data.columns && block.data.columns.length > 0) {
                    for (let i = 0; i < block.data.columns.length; i++) {
                        const column = block.data.columns[i];
                        markdown += `#### Column ${i + 1}\n\n`;

                        if (column.content && column.content.length > 0) {
                            for (const childBlock of column.content) {
                                const childMarkdown = await convertBlockToMarkdown(
                                    childBlock,
                                    turndownService,
                                    imageMap,
                                    imageCounter
                                );
                                markdown += childMarkdown + '\n\n';
                            }
                        }
                    }
                }
                break;
            // NOTE: the whiteboard block type is currently ignored in markdown export
            default:
                console.warn(`Unknown block type: ${block.type}`);
                break;
        }

        return markdown;
    };

    // Convert blocks array to markdown
    const convertBlocksToMarkdown = async (blocks) => {
        const turndownService = initTurndown();
        const imageMap = new Map();
        const imageCounter = { count: 0 };
        let markdown = '';

        for (const block of blocks) {
            const blockMarkdown = await convertBlockToMarkdown(
                block,
                turndownService,
                imageMap,
                imageCounter
            );
            markdown += blockMarkdown + '\n\n';
        }

        return { markdown: markdown.trim(), imageMap };
    };

    // Convert page content to markdown
    const convertPageToMarkdown = async (pageContent) => {
        const blocks = [];

        // Extract blocks from all elements
        if (pageContent.elements) {
            pageContent.elements.forEach(element => {
                if (element.type === 'dynamic' && element.content) {
                    blocks.push(...element.content);
                }
            });
        }

        return await convertBlocksToMarkdown(blocks);
    };

    // Export pages to zip
    const exportPages = async (pages) => {
        const zip = new JSZip();
        const imageFolder = zip.folder('images');

        setProgress({ current: 0, total: pages.length });

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            try {
                // Convert page content to markdown
                const { markdown, imageMap } = await convertPageToMarkdown(page.content);

                // Create filename with page name and ID
                const safeName = page.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${safeName}_${page.id}.md`;

                // Add markdown file to zip
                zip.file(fileName, markdown);

                // Add images to zip
                imageMap.forEach((dataUrl, imageName) => {
                    // Extract base64 data from data URL
                    const base64Data = dataUrl.split(',')[1];
                    imageFolder.file(imageName, base64Data, { base64: true });
                });

                setProgress({ current: i + 1, total: pages.length });
            } catch (error) {
                console.error(`Error converting page ${page.id}:`, error);
            }
        }

        return zip;
    };

    // Handle export
    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const pages = [];

            // Fetch all pages
            for (const pageId of pageIds) {
                const metadata = await dbService.getMeta(pageId);
                const content = await dbService.getContent(pageId, masterKey);

                pages.push({
                    id: pageId,
                    metadata,
                    content
                });
            }

            // Create zip
            const zip = await exportPages(pages);

            // Generate and download zip file
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (onExportComplete) {
                onExportComplete({ success: true, count: pages.length });
            }

        } catch (error) {
            console.error('Export error:', error);
            setError(error.message);
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
                Export to Markdown
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle className="textTitle flex justify-between items-center">
                            Markdown Export
                            <div href="https://github.com/project59/mintype" className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                                beta
                            </div>
                        </DialogTitle>
                        <p className='textRegular'>
                            Export your pages as Markdown files, packaged in a ZIP. Each page will be converted to .md files, with images extracted and included in an 'images' folder within the ZIP file.
                        </p>
                        <p className='infoBox'>
                            Your page hierarchy will NOT be preserved during Markdown exports. Whiteboard drawings and shapes are currently not included in the export.
                        </p>
                        <button
                            className="btnPrimary ml-auto"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? 'Exporting...' : 'Export to Markdown'}
                        </button>

                        {isExporting && (
                            <div className="">
                                <div className="textRegular mb-2">
                                    Exporting {progress.current} of {progress.total} pages...
                                </div>
                                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-4 bg-blue-500"
                                        style={{
                                            width: `${(progress.current / progress.total) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="textRed-500 mt-4">
                                Error: {error}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default MarkdownExporter;