import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useEffect, useState } from "react";

const ImportPreview = ({ fileStructure, onImport, onCancel }) => {
    const [selectedPages, setSelectedPages] = useState(
        new Set(fileStructure.pages.map(page => page.id))
    );
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const handlePageToggle = (pageId) => {
        const newSelectedPages = new Set(selectedPages);

        if (newSelectedPages.has(pageId)) {
            // Unchecking - remove this page and all descendants
            const removePageAndDescendants = (id) => {
                newSelectedPages.delete(id);
                const page = fileStructure.pageMap.get(id);
                if (page?.children) {
                    page.children.forEach(childId => removePageAndDescendants(childId));
                }
            };
            removePageAndDescendants(pageId);
        } else {
            // Checking - add this page and ensure all ancestors are checked
            newSelectedPages.add(pageId);

            const ensureAncestorsSelected = (id) => {
                const page = fileStructure.pages.find(p => p.id === id);
                if (page?.parentId && page.parentId !== fileStructure.rootPages[0]) {
                    newSelectedPages.add(page.parentId);
                    ensureAncestorsSelected(page.parentId);
                }
            };
            ensureAncestorsSelected(pageId);
        }

        setSelectedPages(newSelectedPages);
    };

    const handleFolderToggle = (pageId) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(pageId)) {
            newExpanded.delete(pageId);
        } else {
            newExpanded.add(pageId);
        }
        setExpandedFolders(newExpanded);
    };

    const renderPageTree = (pageIds, pageMap, level = 0) => {
        return pageIds.map(pageId => {
            const page = pageMap.get(pageId);
            if (!page) return null;

            const hasChildren = page.children && page.children.length > 0;
            const isExpanded = expandedFolders.has(pageId);

            return (
                <div key={pageId} className="" style={{ marginLeft: `${level * 12}px` }}>
                    <div className="flex gap-1">
                        {hasChildren && (
                            <button
                                className=""
                                onClick={() => handleFolderToggle(pageId)}
                            >
                                {!isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                        {!hasChildren && <span className="" />}
                        <input
                            type="checkbox"
                            checked={selectedPages.has(pageId)}
                            onChange={() => handlePageToggle(pageId)}
                        />
                        <div className="">
                            <span className="flex items-center gap-1 textRegular">
                                {hasChildren ? <Folder size={16} /> : <FileText size={16} />} {page.name}
                            </span>
                        </div>
                    </div>
                    {hasChildren && !isExpanded && (
                        <div className="">
                            {renderPageTree(page.children, pageMap, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    // Auto-expand folders initially
    useEffect(() => {
        const getAllParentIds = (pages) => {
            const parentIds = new Set();
            pages.forEach(page => {
                if (page.children && page.children.length > 0) {
                    parentIds.add(page.id);
                    getAllParentIds(page.children).forEach(id => parentIds.add(id));
                }
            });
            return parentIds;
        };

        setExpandedFolders(getAllParentIds(fileStructure.rootPages));
    }, [fileStructure]);

    // Rest of the component remains the same...
    const handleSelectAll = () => {
        setSelectedPages(new Set(fileStructure.pages.map(page => page.id)));
    };

    const handleSelectNone = () => {
        setSelectedPages(new Set());
    };

    return (
        <div className="space-y-2 pt-4">
            <div className="">
                <h3 className="textTitle">Preview Import</h3>
                <p className="textRegular">Found {fileStructure.totalPages} pages. Select which ones to import:</p>
            </div>

            <div className="flex gap-2">
                <button className="btnChip" onClick={handleSelectAll}>Select All</button>
                <button className="btnChip" onClick={handleSelectNone}>Select None</button>
            </div>

            <div className="max-h-60 overflow-y-auto">
                {renderPageTree(fileStructure.rootPages, fileStructure.pageMap)}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <button className="btnSecondary" onClick={onCancel}>Cancel</button>
                    <button
                        onClick={() => onImport(Array.from(selectedPages))}
                        disabled={selectedPages.size === 0}
                        className="btnPrimary"
                    >
                        Import {selectedPages.size} Page{selectedPages.size !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportPreview;