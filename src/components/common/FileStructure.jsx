import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import dbService from '../../lib/dbService.js';
import { ChevronRight, Trash, Ellipsis, Edit, ChevronDownIcon, FileText, PanelsTopLeft, Copy, ArrowLeftRight } from 'lucide-react';
import { newPageSchema } from '../../utils/constants.js';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useParams } from 'react-router-dom';
import { useSidebar } from '../../layouts/root/SidebarContext.jsx';
import NewPageDropdown from './NewPageDropdown.jsx';
import PageEmojiPicker from '../../layouts/page/PageEmojiPicker.jsx';
import WorkspaceButton from './WorkspaceButton.jsx';
import toast from 'react-hot-toast';
import { getRandomTrashedMessage } from '../../utils/assets.js';
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx';
import MoveToWorkspaceDialog from '../encryption/MoveToWorkspaceDialog.jsx';
import { compareByOrder, sortByOrder } from '../../lib/pageOrder.js';

// Item Types for drag and drop
const ItemTypes = {
    ENTRY: 'entry'
};

// Moves a dragged entry under `parentId`, before `beforeId` or at the end. dbService refuses
// moves into the entry's own subtree and pages with sub-pages into quick notes.
const moveDraggedEntry = async (id, parentId, rootId, beforeId = null) => {
    const moved = await dbService.moveEntry(id, parentId, rootId, beforeId);
    if (!moved && parentId === 'quickNote') toast.error('Quick note must not contain sub-pages');
};

const containsPage = (node, id) => node.id === id || (node.children || []).some(child => containsPage(child, id));

// Builds the visible page tree of a workspace. Pages whose parent is missing (not yet synced)
// or that sit in a parent cycle (two devices moving pages into each other offline) are shown at
// the top level instead of disappearing.
const buildPageTree = (entries, rootId) => {
    const pages = entries.filter(entry => !entry.deleted && entry.id !== rootId && entry.parentId !== 'quickNote');
    const childrenOf = new Map();
    for (const page of sortByOrder(pages)) {
        if (!childrenOf.has(page.parentId)) childrenOf.set(page.parentId, []);
        childrenOf.get(page.parentId).push(page);
    }

    const placed = new Set();
    const build = (parentId) => (childrenOf.get(parentId) || [])
        .filter(page => !placed.has(page.id))
        .map(page => {
            placed.add(page.id);
            return { ...page, children: build(page.id) };
        });

    const tree = build(rootId);
    const pageIds = new Set(pages.map(page => page.id));
    const unplaced = sortByOrder(pages.filter(page => !placed.has(page.id)));
    // Orphans first, so a page whose parent is also unplaced still appears under that parent.
    for (const page of [...unplaced.filter(p => !pageIds.has(p.parentId)), ...unplaced]) {
        if (placed.has(page.id)) continue;
        placed.add(page.id);
        tree.push({ ...page, children: build(page.id) });
    }
    return tree.sort(compareByOrder);
};

// TreeNode component for each entry
const TreeNode = React.memo(({ node, rootId, depth = 0, onCollapse, quickNote }) => {
    const navigate = useNavigate();
    const { collapsedNodes } = useSidebar();
    const isExpanded = !collapsedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const { workspaceId, pageId } = useParams();
    const { masterKey } = useContext(SecureContext);
    // Handle drag
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.ENTRY,
        item: { id: node.id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Drop onto the row: move into this page, at the end of its sub-pages
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop()) {
                moveDraggedEntry(item.id, node.id, rootId);
                return { handled: true };
            }
        },
        canDrop: (item) => item.id !== node.id && !quickNote,
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }) && !quickNote,
            canDrop: monitor.canDrop(),
        }),
    });

    // Drop onto the strip above the row: move next to this page, directly before it
    const [{ isOverAbove }, dropAbove] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop()) {
                // Top-level rows may be pages rescued from a missing parent, so use where they are shown.
                const parentId = quickNote ? 'quickNote' : depth === 0 ? rootId : node.parentId;
                moveDraggedEntry(item.id, parentId, rootId, node.id);
                return { handled: true };
            }
        },
        canDrop: (item) => item.id !== node.id,
        collect: monitor => ({ isOverAbove: monitor.isOver({ shallow: true }) && monitor.canDrop() }),
    });

    const handleExpand = (e) => {
        e.stopPropagation();
        if (hasChildren) {
            const newExpanded = !isExpanded;
            if (onCollapse) onCollapse(node.id, newExpanded);
        }
    };

    const handleAddPage = (e, type) => {
        e.stopPropagation();
        dbService.addEntry({
            id: null, newContent: newPageSchema(type), parentId: node.id, rootId: rootId, masterKey
        });
        if (!isExpanded && onCollapse) onCollapse(node.id, true);
    };

    const handleDeletePage = (e) => {
        e.stopPropagation();
        dbService.trashEntry({ id: node.id });
        if (pageId && containsPage(node, pageId)) navigate(`/workspace/${workspaceId}`);
        toast.success(getRandomTrashedMessage());
    };

    // Highlight style when dragging over
    const dropStyle = isOver && canDrop ? 'bg-blue-100 dark:bg-blue-800/30' : '';
    const dragStyle = isDragging ? 'opacity-50' : '';

    const [isEditing, setIsEditing] = useState(false);
    const [newTitle, setNewTitle] = useState(node.name);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)

    // Guards against saving twice when Enter or Escape is followed by the input's blur.
    const editingRef = useRef(false);

    const startEditing = () => {
        editingRef.current = true;
        setNewTitle(node.name);
        setIsEditing(true);
    };

    const finishEditing = async (save) => {
        if (!editingRef.current) return;
        editingRef.current = false;
        setIsEditing(false);
        const title = newTitle.trim();
        if (save && title && title !== node.name) {
            await dbService.updateMetaField({ id: node.id, fieldName: 'name', newValue: title });
        }
    };

    const handleClick = () => {
        if (pageId === node.id) {

        } else {
            navigate(`/workspace/${workspaceId}/${node.id}`);
        }
    }

    const handleCopyPageId = () => {
        navigator.clipboard.writeText(node.id);
        toast.success('Page ID copied to clipboard');
    }

    return (
        <div
            className={`relative mb-0.5 `}
        >
            {/* Drop ABOVE indicator */}
            <div ref={dropAbove} className="h-1 relative">
                {isOverAbove && <div className="absolute inset-0 h-0.5 bg-blue-500 rounded"></div>}
            </div>
            <div
                ref={drop}
                className={`flex items-center justify-between group h-8 cursor-pointer hover:bg-slate-300/20 dark:hover:bg-indigo-900/30 duration-200 rounded-lg ${dropStyle} ${dragStyle} ${pageId === node.id ? 'bg-slate-300/40 dark:bg-indigo-800/30' : ''} `}
            >

                <div ref={drag} className='flex items-center h-full flex-1 w-[70%]'>
                    <PageEmojiPicker page={node} />

                    <button onClick={handleClick} onDoubleClick={(e) => { e.stopPropagation(); startEditing() }} className={`truncate h-full w-full flex items-center gap-2 text-sm  ${hasChildren ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isEditing ? (
                            <input
                                // text all select on focus
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onBlur={() => finishEditing(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') finishEditing(true);
                                    if (e.key === 'Escape') finishEditing(false);
                                }}
                                className="ml-1 smallInput w-40"
                            />
                        ) : (
                            <div className={`cursor-pointer flex-1 text-left text-sm truncate ${pageId === node.id ? 'font-medium textNode' : ''}`}>
                                {node.name}
                            </div>
                        )}
                    </button>
                </div>
                <button className="" onClick={handleExpand}>
                    {hasChildren ? (
                        <div className='mx-1 p-1 text-black dark:text-white'>
                            <ChevronRight size={14} className={`${isExpanded ? 'rotate-90' : ''} duration-200 `} />
                        </div>
                    ) : (
                        <div className="w-0"></div>
                    )}
                </button>

                <Menu>
                    <MenuButton className="p-1 pr-2">
                        <Ellipsis size={16} className="text-gray-500 hover:text-black dark:hover:text-white" />
                    </MenuButton>

                    <MenuItems
                        transition
                        anchor="bottom end"
                        className="dropdownPanel"
                    >
                        <MenuItem>
                            <button
                                className="dropdownItem"
                                onClick={
                                    (e) => {
                                        e.stopPropagation();
                                        startEditing();
                                    }
                                }
                                title="Rename page"
                            >
                                <Edit size={14} />
                                Rename
                            </button>
                        </MenuItem>
                        {!quickNote && (
                            <>
                                <MenuItem>
                                    <button
                                        className="dropdownItem"
                                        onClick={(e) => handleAddPage(e, 'document')}
                                        title="Add Document"
                                    >
                                        <FileText className='text-blue-400' size={14} />
                                        Add Document
                                    </button>
                                </MenuItem>
                                <MenuItem>
                                    <button
                                        className="dropdownItem"
                                        onClick={(e) => handleAddPage(e, 'whiteboard')}
                                        title="Add Whiteboard"
                                    >
                                        <PanelsTopLeft className='text-indigo-400' size={14} />
                                        Add Whiteboard
                                    </button>
                                </MenuItem>
                                <MenuItem>
                                    <button
                                        className="dropdownItem"
                                        onClick={() => setIsMoveDialogOpen(true)}
                                        title="Move to Trash"
                                    >
                                        <ArrowLeftRight size={14} />
                                        Move to Workspace
                                    </button>
                                </MenuItem>
                            </>
                        )}
                        <div className='h-px bg-gray-200 dark:bg-slate-800'></div>
                        <MenuItem>
                            <button
                                className="dropdownItem"
                                onClick={
                                    (e) => {
                                        e.stopPropagation();
                                        handleCopyPageId(node.id);
                                    }
                                }
                                title="Copy Page ID"
                            >
                                <Copy size={14} />
                                Copy Page ID
                            </button>
                        </MenuItem>
                        <MenuItem>
                            <button
                                className="dropdownItem !text-red-500"
                                onClick={handleDeletePage}
                                title="Move to Trash"
                            >
                                <Trash size={14} />
                                Move to Trash
                            </button>
                        </MenuItem>
                    </MenuItems>
                </Menu>

                <MoveToWorkspaceDialog isDialogOpen={isMoveDialogOpen} pageId={node.id} onClose={() => setIsMoveDialogOpen(false)} />

            </div>
            {hasChildren && isExpanded && (
                <div className="ml-3 mt-0.5 flex flex-col">
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            rootId={rootId}
                            depth={depth + 1}
                            onCollapse={onCollapse}
                            quickNote={false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

// Drop zone in the Quick Notes header. Defined at module level so re-renders of the sidebar
// do not remount it and re-register its drop target mid-drag.
const QuickNotesDropZone = ({ rootId }) => {
    const [{ isOverQuickNotes }, dropQuickNotes] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop()) {
                moveDraggedEntry(item.id, 'quickNote', rootId);
                return { handled: true };
            }
        },
        collect: monitor => ({
            isOverQuickNotes: monitor.isOver({ shallow: true }),
        }),
    });

    return (
        <div
            ref={dropQuickNotes}
            className={`p-2 flex-1`}
        >
            {isOverQuickNotes && (
                <div className="h-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-md text-sm flex items-center justify-center text-blue-500 dark:text-blue-400">
                    Move to Quick Notes
                </div>
            )}
        </div>
    );
};

// Create a wrapper component that includes DndProvider.
// The backend root is scoped to this subtree: the HTML5Backend installs
// window-level capture listeners that preventDefault any drop carrying
// text/html or text/plain data, which would make ProseMirror ignore all
// editor drag-and-drop.
const FileStructureWithDnd = () => {
    const { workspaceId } = useParams();
    const [dndRoot, setDndRoot] = useState(null);

    return (
        <div ref={setDndRoot} className="contents">
            {dndRoot && (
                <DndProvider backend={HTML5Backend} options={{ rootElement: dndRoot }}>
                    <FileStructureContent rootId={workspaceId} />
                </DndProvider>
            )}
        </div>
    );
};

// Main content component
const FileStructureContent = ({ rootId }) => {
    const {
        entries, setEntries,
        quickNotes, setQuickNotes,
        favorites, setFavorites,
        workspaces, setWorkspaces,
        collapsedNodes, toggleCollapse,
        openSections, setOpenSections,
    } = useSidebar();

    const navigate = useNavigate();

    // Track collapsed state
    const handleCollapse = toggleCollapse;

    // Broadcasts can arrive faster than fetches finish; only the latest fetch may set state.
    const fetchIdRef = useRef(0);
    const fetchAllData = useCallback(async () => {
        const fetchId = ++fetchIdRef.current;
        try {
            const [fetchedEntries, fetchedQuickNotes, fetchedRoots] = await Promise.all([
                dbService.getAllEntriesByRoot(rootId),
                dbService.getAllQuickNotes(),
                dbService.getAllRootMeta()
            ]);
            if (fetchId !== fetchIdRef.current) return;

            setEntries(fetchedEntries);
            setQuickNotes(sortByOrder(fetchedQuickNotes.filter(note => !note.deleted)));
            setWorkspaces(fetchedRoots
                .filter(root => !root.deleted)
                .sort((a, b) => (a.created ?? 0) - (b.created ?? 0) || (a.id < b.id ? -1 : 1)));
            setFavorites(sortByOrder(fetchedEntries.filter(entry => entry.isFavorite && !entry.deleted)));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, [rootId, setEntries, setQuickNotes, setWorkspaces, setFavorites]);

    // Broadcast channel listener for real-time updates
    useEffect(() => {
        const broadcastChannel = new BroadcastChannel('db-updates');
        broadcastChannel.addEventListener('message', fetchAllData);
        return () => {
            broadcastChannel.removeEventListener('message', fetchAllData);
            broadcastChannel.close();
        };
    }, [fetchAllData]);

    // Fetch entries on mount and when rootId changes
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const hierarchy = useMemo(() => buildPageTree(entries, rootId), [entries, rootId]);

    // Drop area for top level (direct children of root)
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop()) {
                moveDraggedEntry(item.id, rootId, rootId);
                return { handled: true };
            }
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
        }),
    });

    return (
        <div className='flex flex-col gap-1 w-full'>
            <div className="">
                <button
                    className="flex w-full items-center justify-between p-2 duration-200"
                    onClick={() => setOpenSections(prev => ({ ...prev, workspaces: !prev.workspaces }))}
                >
                    <div className='flex gap-2 items-center'>
                        {/* <div className='w-2 h-2 rounded-full bg-blue-500'></div> */}
                        {/* <FolderKanban size={14} /> */}
                        <span className="textH2">
                            Workspaces
                        </span>
                    </div>
                    <ChevronDownIcon className={`size-4 textH2 duration-200 ${openSections.workspaces ? 'rotate-180' : ''}`} />
                </button>

                {openSections.workspaces && (
                    <div className="flex flex-col gap-1">
                        {workspaces.map(entry => (
                            <WorkspaceButton key={entry.id} entry={entry} />
                        ))}
                        {workspaces.length === 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Create a workspace</div>
                        )}
                    </div>
                )}
            </div>

            <div className="">
                <button
                    className="flex w-full items-center justify-between p-2 duration-200"
                    onClick={() => setOpenSections(prev => ({ ...prev, favorites: !prev.favorites }))}
                >
                    <div className='flex gap-2 items-center'>
                        {/* <div className='w-2 h-2 rounded-full bg-amber-500'></div> */}
                        <span className="textH2">
                            Favorites
                        </span>
                    </div>
                    <ChevronDownIcon className={`size-4 textH2 duration-200 ${openSections.favorites ? 'rotate-180' : ''}`} />
                </button>

                {openSections.favorites && (
                    <div className="flex flex-col">
                        {favorites.map(entry => (
                            <button key={entry.id} onClick={() => { navigate(`/workspace/${entry.rootId}/${entry.id}`); }}>
                                <div className={`flex items-center gap-1.5 py-1 rounded-lg hover:bg-slate-300/20 dark:hover:bg-indigo-800/30 text-sm duration-200 text-gray-500 dark:text-gray-400`}>
                                        <PageEmojiPicker page={entry} />
                                    {entry.name}
                                </div>
                            </button>
                        ))}
                        {favorites.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No favorites yet</div>}
                    </div>
                )}
            </div>

            <div className="w-full">
                <div className='flex p-2 pr-1 justify-between items-center'>
                    <div className='flex gap-2 items-center w-full'>
                        <span className="textH2">Quick Notes</span>
                        <QuickNotesDropZone rootId={rootId} />
                    </div>
                    <NewPageDropdown rootId={rootId} quickNote={true} />
                </div>


                {quickNotes.length > 0 && (
                    <>
                        {quickNotes.map(note => (
                            <TreeNode
                                key={note.id}
                                node={note}
                                rootId={rootId}
                                onCollapse={handleCollapse}
                                quickNote={true}
                            />
                        ))}
                    </>
                )}
            </div>

            <div className={`w-full`} >
                <div className='flex p-2 pr-1 justify-between items-center mt-2' >
                    <div className='flex gap-2 items-center w-full'>
                        {/* <div className='w-2 h-2 rounded-full bg-violet-500'></div> */}
                        <span className="textH2">
                            Notes
                        </span>
                        <div className='p-2 w-full' ref={drop}>
                            {isOver && (
                                <div className="h-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-md text-sm flex items-center justify-center text-blue-500 dark:text-blue-400">
                                    Move to Workspace
                                </div>
                            )}
                        </div>
                    </div>
                    <NewPageDropdown rootId={rootId} />
                </div>

                {hierarchy.map(node => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        rootId={rootId}
                        onCollapse={handleCollapse}
                        quickNote={false}
                    />
                ))}
            </div>
        </div >
    );
};

// Export the wrapped component
export default FileStructureWithDnd;
