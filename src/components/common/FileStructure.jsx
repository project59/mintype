import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag, useDrop } from 'react-dnd';
import dbService from '../../lib/dbService.js';
import { ChevronRight, Trash, Ellipsis, Edit, ChevronDownIcon, FileText, PanelsTopLeft, Copy, ArrowLeftRight } from 'lucide-react';
import { newPageSchema } from '../../utils/constants.js';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useParams } from 'react-router-dom';
import { useSidebar } from '../../layouts/root/SidebarContext.jsx';
import NewPageDropdown from './NewPageDropdown.jsx';
import PageEmojiPicker from '../../layouts/page/PageEmojiPicker.jsx';
import WorkspaceButton from '../../layouts/wiki/WorkspaceButton.jsx';
import toast from 'react-hot-toast';
import { getRandomTrashedMessage } from '../../utils/assets.js';
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx';
import MoveToWorkspaceDialog from '../encryption/MoveToWorkspaceDialog.jsx';

// Item Types for drag and drop
const ItemTypes = {
    ENTRY: 'entry'
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
        item: { id: node.id, type: node.type, parentId: node.parentId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Handle drop
    const [{ isOver, canDrop }, drop] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop() && item.id !== node.id && !quickNote) {
                dbService.moveEntry(item.id, node.id, rootId); // default "into folder"
                return { id: node.id, handled: true };
            }
        },
        canDrop: (item) => item.id !== node.id && !quickNote,
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }) && !quickNote,
            canDrop: monitor.canDrop(),
        }),
    });

    const [{ isOverAbove }, dropAbove] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop() && item.id !== node.id) {
                handleReorder(item.id, node.parentId, node.id, "before");
                return { handled: true };
            }
        },
        collect: monitor => ({ isOverAbove: monitor.isOver({ shallow: true }) }),
    });

    const [{ isOverBelow }, dropBelow] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop() && item.id !== node.id) {
                handleReorder(item.id, node.parentId, node.id, "after");
                return { handled: true };
            }
        },
        collect: monitor => ({ isOverBelow: monitor.isOver({ shallow: true }) }),
    });

    const handleReorder = async (draggedId, newParentId, siblingId, position) => {
        // Get siblings and sort by order
        let siblings = await dbService.getSiblings(newParentId);
        siblings = siblings.sort((a, b) => (a.order ?? 1000000) - (b.order ?? 1000000));

        // Find the target sibling
        const targetIndex = siblings.findIndex(s => s.id === siblingId);

        let newOrder;

        if (position === "before") {
            // Get the order values around the target position
            const targetOrder = siblings[targetIndex].order ?? 1000000;
            const prevOrder = targetIndex > 0 ? (siblings[targetIndex - 1].order ?? 1000000) : 0;

            // Calculate the new order as the midpoint
            newOrder = (prevOrder + targetOrder) / 2;
        } else { // "after"
            const targetOrder = siblings[targetIndex].order ?? 1000000;
            const nextOrder = targetIndex < siblings.length - 1
                ? (siblings[targetIndex + 1].order ?? 1000000)
                : targetOrder + 2000000;

            // Calculate the new order as the midpoint
            newOrder = (targetOrder + nextOrder) / 2;
        }

        // Update parentId and rootId
        await dbService.updateMetaField({
            id: draggedId,
            fieldName: "parentId",
            newValue: newParentId,
        });
        await dbService.updateMetaField({
            id: draggedId,
            fieldName: "rootId",
            newValue: rootId,
        });

        // Update only the dragged item's order
        await dbService.updateMetaField({
            id: draggedId,
            fieldName: "order",
            newValue: newOrder
        });
    };
    // NOTE: handle quick note reorder.

    const handleExpand = (e) => {
        e.stopPropagation();
        if (hasChildren) {
            const newExpanded = !isExpanded;
            if (onCollapse) onCollapse(node.id, newExpanded);
        }
    };

    const handleAddDocument = async (e) => {
        e.stopPropagation();
        const siblings = await dbService.getSiblings(node.id);

        // Find the maximum order value
        const maxOrder = siblings.length > 0
            ? Math.max(...siblings.map(s => s.order ?? 1000000))
            : 1000000;

        dbService.addEntry({
            id: null, newContent: newPageSchema('document', maxOrder + 1000000), parentId: node.id, rootId: rootId, masterKey
        });
    };
    const handleAddWhiteboard = async (e) => {
        e.stopPropagation();
        const siblings = await dbService.getSiblings(node.id);

        // Find the maximum order value
        const maxOrder = siblings.length > 0
            ? Math.max(...siblings.map(s => s.order ?? 1000000))
            : 1000000;

        dbService.addEntry({
            id: null, newContent: newPageSchema('whiteboard', maxOrder + 1000000), parentId: node.id, rootId: rootId, masterKey
        });
    };

    const handleDeletePage = (e) => {
        e.stopPropagation();
        dbService.trashEntry({ id: node.id });
        navigate(`/workspace/${workspaceId}`);
        toast.success(getRandomTrashedMessage());
    };

    // Highlight style when dragging over
    const dropStyle = isOver && canDrop ? 'bg-blue-100 dark:bg-blue-800/30' : '';
    const dragStyle = isDragging ? 'opacity-50' : '';

    const [isEditing, setIsEditing] = useState(false);
    const [newTitle, setNewTitle] = useState(node.name);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)

    const handleTitleChange = async () => {
        // Call your database service to update the title
        await dbService.updateMetaField({ id: node.id, fieldName: 'name', newValue: newTitle });
        setIsEditing(false);
    }

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

                    <button onClick={handleClick} onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true) }} className={`truncate h-full w-full flex items-center gap-2 text-sm  ${hasChildren ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isEditing ? (
                            <input
                                // text all select on focus
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onBlur={() => handleTitleChange()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                        handleTitleChange();
                                    }
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
                                        setIsEditing(true);
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
                                        onClick={handleAddDocument}
                                        title="Add Document"
                                    >
                                        <FileText className='text-blue-400' size={14} />
                                        Add Document
                                    </button>
                                </MenuItem>
                                <MenuItem>
                                    <button
                                        className="dropdownItem"
                                        onClick={handleAddWhiteboard}
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
            {/* Drop BELOW indicator */}
            {/* <div ref={dropBelow} className="h-0.5 relative">
                {isOverBelow && <div className="absolute inset-0 h-0.5 bg-blue-500 rounded"></div>}
            </div> */}

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

// Create a wrapper component that includes DndProvider
const FileStructureWithDnd = () => {
    const { workspaceId } = useParams();
    return (
        <>
            <FileStructureContent rootId={workspaceId} />
        </>
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

    const fetchAllData = useMemo(() => {
        return async () => {
            try {
                const [fetchedEntries, quickNotes, fetchedRoots] = await Promise.all([
                    dbService.getAllEntriesByRoot(rootId),
                    dbService.getAllQuickNotes(),
                    dbService.getAllRootMeta()
                ]);

                setEntries(fetchedEntries);
                setQuickNotes(quickNotes);
                setWorkspaces(fetchedRoots);

                const filteredFavorites = fetchedEntries.filter(favorite => favorite?.isFavorite);
                setFavorites(filteredFavorites);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
    }, [rootId]);

    // Broadcast channel listener for real-time updates
    useEffect(() => {
        const broadcastChannel = new BroadcastChannel('db-updates');
        const handleUpdate = () => {
            console.log('Received update from broadcast channel');
            fetchAllData(); // Use the combined function
        };

        broadcastChannel.addEventListener('message', handleUpdate);
        return () => {
            broadcastChannel.removeEventListener('message', handleUpdate);
            broadcastChannel.close();
        };
    }, [fetchAllData]);

    // Fetch entries on mount and when rootId changes
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Build tree hierarchy
    const hierarchy = useMemo(() => {
        if (!entries.length) return [];
        const buildTree = (parentId) => {
            return entries
                .filter(entry => entry.parentId === parentId)
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(entry => ({
                    ...entry,
                    children: buildTree(entry.id),
                }));
        };
        return buildTree(rootId);
    }, [entries, rootId]);

    // Drop area for top level (direct children of root)
    const [{ isOver }, drop] = useDrop({
        accept: ItemTypes.ENTRY,
        drop: (item, monitor) => {
            if (!monitor.didDrop()) {
                dbService.moveEntry(item.id, rootId, rootId);
                return { handled: true };
            }
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
        }),
    });

    const checkSiblings = async (id) => {
        return await dbService.hasChild(id);
    }

    // Add this new drop zone component for Quick Notes
    const QuickNotesDropZone = () => {
        const [{ isOverQuickNotes }, dropQuickNotes] = useDrop({
            accept: ItemTypes.ENTRY,
            drop: async (item, monitor) => {
                if (!monitor.didDrop()) {
                    // Now we can await the async function
                    const hasChildren = await checkSiblings(item.id);

                    if (hasChildren) {
                        toast.error(`Quick note must not contain sub-pages`);
                        return { handled: true };
                    }

                    await dbService.moveEntry(item.id, 'quickNote', rootId);
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
                        <QuickNotesDropZone />
                    </div>
                    <NewPageDropdown rootId={rootId} order={hierarchy.length > 0 ? hierarchy[hierarchy.length - 1].order + 1000000 : 1000000} quickNote={true} />
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
                    <NewPageDropdown rootId={rootId} order={hierarchy.length > 0 ? hierarchy[hierarchy.length - 1].order + 1000000 : 1000000} />
                </div>

                {hierarchy.length > 0 && (
                    <>
                        {/* we want only nodes where deleted = false */}
                        {hierarchy.map(node => (
                            node.deleted === false && (
                                <TreeNode
                                    key={node.id}
                                    node={node}
                                    rootId={rootId}
                                    onCollapse={handleCollapse}
                                    quickNote={false}
                                />
                            )
                        ))}
                    </>
                )}
            </div>
        </div >
    );
};

// Export the wrapped component
export default FileStructureWithDnd;