import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useEffect, useState } from "react";

const ImportPreview = ({ fileStructure, onImport, onCancel, importId }) => {
    const [selectedPages, setSelectedPages] = useState(
        new Set(fileStructure.pages.map(page => page.id))
    );
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    const handlePageToggle = (pageId) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(pageId)) {
            newSelected.delete(pageId);
            // Also deselect all children
            const page = fileStructure.pages.find(p => p.id === pageId);
            if (page) {
                const deselectChildren = (children) => {
                    children.forEach(child => {
                        newSelected.delete(child.id);
                        if (child.children) {
                            deselectChildren(child.children);
                        }
                    });
                };
                if (page.children) {
                    deselectChildren(page.children);
                }
            }
        } else {
            newSelected.add(pageId);
        }
        setSelectedPages(newSelected);
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

    const renderPageTree = (pages, level = 0) => {
        return pages.map(page => {
            const hasChildren = page.children && page.children.length > 0;
            const isExpanded = expandedFolders.has(page.id);

            return (
                <div key={page.id} className="page-item" style={{ marginLeft: `${level * 20}px` }}>
                    <div className="flex gap-1">
                        {hasChildren && (
                            <button
                                className="expand-button"
                                onClick={() => handleFolderToggle(page.id)}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                        {!hasChildren && <span className="expand-spacer" />}

                        <input
                            type="checkbox"
                            checked={selectedPages.has(page.id)}
                            onChange={() => handlePageToggle(page.id)}
                        />

                        <div className="page-info">
                            <span className="flex items-center gap-1">
                                {hasChildren ? <Folder size={16} /> : <FileText size={16} />} {page.name}
                            </span>
                        </div>
                    </div>

                    {hasChildren && isExpanded && (
                        <div className="page-children">
                            {renderPageTree(page.children, level + 1)}
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
        <div className="space-y-4">
            <div className="preview-header">
                <h3 className="text-lg font-medium">Preview Import</h3>
                <p className="text-gray-600">Found {fileStructure.totalPages} pages with hierarchy. Select which ones to import:</p>
            </div>

            <div className="space-x-2">
                <button className="btnSecondary" onClick={handleSelectAll}>Select All</button>
                <button className="btnSecondary" onClick={handleSelectNone}>Select None</button>
            </div>

            <div className="preview-stats">
                <div className="stat">
                    <strong>Total Pages:</strong> {fileStructure.totalPages}
                </div>
                <div className="stat">
                    <strong>Selected:</strong> {selectedPages.size}
                </div>
            </div>

            <div className="pages-tree">
                {renderPageTree(fileStructure.rootPages)}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <button className="btnSecondary" onClick={onCancel}>Cancel</button>
                    <button
                        onClick={() => onImport(Array.from(selectedPages))}
                        disabled={selectedPages.size === 0 || importId === null}
                        className="btnPrimary"
                    >
                        Import {selectedPages.size} Page{selectedPages.size !== 1 ? 's' : ''}
                    </button>
                </div>
                {!importId && <span className="error">Please select a workspace to import into</span>}
            </div>
        </div>
    );
};

export default ImportPreview;