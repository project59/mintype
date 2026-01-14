import { ChevronRight, ChevronsRight, Edit, Home, Redo, Undo } from "lucide-react";
import { useState, useEffect } from "react";
import dbService from "../../lib/dbService";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageOptionsPopup from "../../layouts/page/PageOptionsPopup.jsx";
import { SearchBar } from "../search/SearchBar";
import PomodoroTimer from "../pomodoro/PomodoroTimer";
import { useSidebar } from "../../layouts/root/SidebarContext.jsx";
import DriveSyncPopup from "../../drivesync/DriveSyncPopup.jsx";

export default function FunctionBar({ handleUndo, handleRedo, isWiki, updatePreferences, triggerRefresh }) {
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(null);
    const { isNavOpen, setIsNavOpen } = useSidebar();
    const navigate = useNavigate();
    const { workspaceId, pageId } = useParams();

    const fetchPage = async () => {
        if (!pageId) return;
        const page = await dbService.getMeta(pageId);
        setPage(page);
    };

    useEffect(() => {
        fetchPage();
    }, [pageId]);

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel('db-updates');

        broadcastChannel.addEventListener('message', async (event) => {
            if (event.data.type === 'update') {
                console.log('broadcast update received');
                fetchPage();
            }
        })
        return () => {
            broadcastChannel.close();
        }
    }, [pageId]);

    const setFavorite = async () => {
        try {
            await dbService.updateMetaField({ id: pageId, fieldName: 'isFavorite', newValue: !page.isFavorite });

        } catch (error) {
            console.error('Failed to set favorite:', error);
        }
    };

    const setSensitive = async () => {
        try {
            await dbService.updateMetaField({ id: pageId, fieldName: 'sensitive', newValue: !page.sensitive });

        } catch (error) {
            console.error('Failed to set sensitive:', error);
        }
    };

    const setWidth = async (width) => {
        try {
            await dbService.updateMetaField({ id: pageId, fieldName: 'documentWidth', newValue: width });
            triggerRefresh();
        } catch (error) {
            console.error('Failed to set width:', error);
        }
    };


    useEffect(() => {
        let cancelled = false;

        const buildBreadcrumbs = async () => {
            const breadcrumbsArray = [];

            // Add workspace root (once)
            if (workspaceId) {
                const workspace = await dbService.getMeta(workspaceId);
                if (!workspace) {
                    if (!cancelled) {
                        setBreadcrumbs([]);
                        setLoading(false);
                    }
                    return;
                }

                breadcrumbsArray.push({
                    id: workspaceId,
                    name: workspace.name || `Workspace ${workspaceId}`,
                    path: `/${isWiki ? 'wiki' : 'workspace'}/${workspaceId}`,
                    type: 'workspace'
                });
            }

            if (page) {
                if (page.parentId === 'quickNote') {
                    return;
                }
                // Recursively build parent chain BUT stop when parentId === page.rootId
                // (so we don't add the workspace as a page and cause duplication)
                const buildParentChain = async (parentId) => {
                    if (!parentId) return [];
                    if (parentId === page.rootId) return []; // don't include root page

                    const parent = await dbService.getMeta(parentId);
                    if (!parent) return [];

                    const parentChain = await buildParentChain(parent.parentId);
                    return [
                        ...parentChain,
                        {
                            id: parent.id,
                            name: parent.name || `Page ${parent.id}`,
                            path: `/${isWiki ? 'wiki' : 'workspace'}/${page.rootId}/${parent.id}`,
                            type: 'page'
                        }
                    ];
                };

                if (page.parentId) {
                    const parentChain = await buildParentChain(page.parentId);
                    breadcrumbsArray.push(...parentChain);
                }

                // current page
                breadcrumbsArray.push({
                    id: page.id,
                    name: page.name || page.title || `Page ${page.id}`,
                    path: `/${isWiki ? 'wiki' : 'workspace'}/${page.rootId}/${page.id}`,
                    type: 'page',
                    current: true
                });
            }

            if (!cancelled) {
                setBreadcrumbs(breadcrumbsArray);
                setLoading(false);
            }
        };

        buildBreadcrumbs();

        return () => {
            cancelled = true;
        };
    }, [workspaceId, page]); // include workspaceId so switching workspaces rebuilds

    // renaming logic
    const [newTitle, setNewTitle] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    const handleTitleChange = async () => {
        // Call your database service to update the title
        await dbService.updateMetaField({ id: pageId, fieldName: 'name', newValue: newTitle });
        setIsRenaming(false);
        setNewTitle('');
    }

    return (
        <nav className="w-full z-20 flex items-center justify-between text-sm text-zinc-400 h-12 p-2.5 ">
            <div className="flex md:hidden">
                <Link to={`/${isWiki ? 'wiki' : 'workspace'}`} className="ml-8 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-gray-300 p-1 rounded-lg duration-200">
                    <Home size={14} />
                </Link>
            </div>
            <div className="items-center hidden md:flex">
                <button className={`p-1 ${isNavOpen ? 'hidden' : 'flex'}`}>
                    <ChevronsRight size={16} className="hover:text-gray-700 dark:hover:text-gray-300 duration-200" onClick={() => setIsNavOpen(true)} />
                </button>
                <Link to={`/${isWiki ? 'wiki' : 'workspace'}`} className="mr-1 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300 p-1 rounded-lg duration-200">
                    <Home size={14} />
                </Link>
                {!loading && breadcrumbs.length > 0 && (
                    <>
                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.id} className="flex items-center">
                                {index > 0 && <span className="mx-1"><ChevronRight className="mt-0.5" size={16} /></span>}
                                {crumb.current ? (
                                    <button onClick={() => navigate(crumb.path)} className={`truncate h-full w-full flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400`}>
                                        {isRenaming ? (
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
                                            <div className={`group/crumb cursor-pointer flex-1 items-center flex gap-1 text-left text-sm truncate font-medium textNode`}>
                                                {crumb.name}
                                                <button className="group-hover/crumb:opacity-100 opacity-0 duration-200" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setNewTitle(crumb.name); }}>
                                                    <Edit size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate(crumb.path)}
                                        className="hover:text-gray-700 truncate max-w-[100px] hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-300 px-1 py-0.5 rounded-lg duration-200"
                                        title={crumb.name}
                                    >
                                        {crumb.name}
                                    </button>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
            {!isWiki && (
                <div className="flex gap-1 items-center">
                    <PomodoroTimer />
                    <div className={`gap-1 items-center ${!page ? 'hidden' : 'flex'}`}>
                        <button className="text-slate-600 dark:text-slate-200 hover:rounded-[50px] btnBase w-7 h-7 bg-slate-400/20 rounded-l-lg rounded-r" onClick={handleUndo} title="Undo">
                            <Undo size={12} />
                        </button>
                        <button className="text-slate-600 dark:text-slate-200 hover:rounded-[50px] btnBase w-7 h-7 bg-slate-400/20 rounded-r-lg rounded-l" onClick={handleRedo} title="Redo">
                            <Redo size={12} />
                        </button>
                        <PageOptionsPopup page={page} setFavorite={setFavorite} setSensitive={setSensitive} setWidth={setWidth} updatePreferences={updatePreferences} />
                    </div>
                    <div className="flex items-center gap-1">
                        <SearchBar />
                        <DriveSyncPopup />
                    </div>
                </div>
            )}
        </nav>
    );
}