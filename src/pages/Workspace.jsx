import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dbService from "../lib/dbService";
import { FileText, PanelsTopLeft, StickyNote, Trash } from "lucide-react";
import WorkspaceTitle from "../layouts/workspaces/WorkspaceTitle.jsx";
import BackgroundCover from "../layouts/workspaces/BackgroundCover.jsx";
import FunctionBar from "../components/common/FunctionBar";
import DeleteWorkspaceModal from "../layouts/workspaces/DeleteWorkspaceModal.jsx";
import PublishWorkspaceDialog from "../layouts/wiki/PublishWorkspaceDialog";
import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";
import JSZip from "jszip";
import toast from "react-hot-toast";
import { SecureContext } from "../layouts/secure-context/SecureContext.jsx";

export default function Workspace() {
    const { workspaceId } = useParams();
    const [workspace, setWorkspace] = useState({});
    const [allPages, setAllPages] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [recentPages, setRecentPages] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const { masterKey } = useContext(SecureContext);
    const navigate = useNavigate();

    const fetchWorkspace = async () => {
        try {
            const workspace = await dbService.getEntry(workspaceId, masterKey);
            if (!workspace) {
                navigate("/workspace");
            } else {
                setWorkspace(workspace);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchWorkspaceData = async () => {
        try {
            let fetchedPages = await dbService.getAllEntriesByRoot(workspaceId);
            fetchedPages = fetchedPages.filter(page => page.id !== workspaceId)
            const nonTrashedfetchedPages = fetchedPages.filter(page => page.deleted === false);
            // remove the workspace from the list
            setAllPages(nonTrashedfetchedPages);

            // Filter favorites
            const filteredFavorites = nonTrashedfetchedPages.filter(page => page?.isFavorite);
            setFavorites(filteredFavorites);

            // Get recent pages (last 5, sorted by lastModified)
            const sortedByRecent = [...nonTrashedfetchedPages]
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                .slice(0, 5);
            setRecentPages(sortedByRecent);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchWorkspace();
        fetchWorkspaceData();
    }, [workspaceId]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        });
    };

    const updateTitle = async (newTitle) => {
        try {
            dbService.updateMetaField({ id: workspace.id, fieldName: 'name', newValue: newTitle });
            setWorkspace({ ...workspace, name: newTitle });
        } catch (error) {
            console.error(error);
        }
    };

    const updateBackground = async (background) => {
        try {
            dbService.updateContentField({ id: workspace.id, fieldName: 'background', newValue: background, masterKey });
            setWorkspace({ ...workspace, background: background });
        } catch (error) {
            console.error(error);
        }
    };

    const PageIconRenderer = ({ page }) => {
        if (page.emoji) {
            return (
                <div className="text-xs">
                    {page.emoji}
                </div>
            )
        } else if (page.type === 'document') {
            return (
                <div className="">
                    <FileText size={14} className="text-blue-500" />
                </div>)
        } else if (page.type === 'whiteboard') {
            return (
                <div className="">
                    <PanelsTopLeft size={14} className="text-indigo-400" />
                </div>)
        } else {
            return <StickyNote size={14} className="text-amber-500" />
        }
    }

    const exportWorkspaceToJSON = async () => {
        const zip = new JSZip();
        // get workspace meta entry
        const workspaceMeta = await dbService.getMeta(workspaceId);
        //get all workspace page meta entries
        const allWorkspaceMetas = await dbService.getAllEntriesByRoot(workspaceId);
        // remove the workspace entry itself
        const allPages = allWorkspaceMetas.filter(page => page.id !== workspaceId);

        zip.file("mintype-data.json", JSON.stringify({
            name: "mintype-appdata",
            created: Date.now(),
            entries: [workspaceMeta, ...allPages]
        }));

        // get the workspace content
        const workspaceContent = await dbService.getContent(workspaceId, masterKey);
        zip.file(`${workspaceId}.json`, JSON.stringify(workspaceContent))

        await Promise.all(
            allPages.map(async (page) => {
                const pageContent = await dbService.getContent(page.id, masterKey);
                zip.file(`${page.id}.json`, JSON.stringify(pageContent));
            })
        );

        zip.generateAsync({ type: "blob" }).then((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${workspaceMeta.name}-export-JSON.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Workspace exported');
        });
    }

    return (
        <div className="flex flex-col h-full">
            <div className="sticky top-0 h-12 z-20 bg-slate-100 dark:bg-[#10101e]">
                <FunctionBar page={null} handleUndo={() => { }} handleRedo={() => { }} />
            </div>
            {/* Header */}
            <PageHeaderWrapper>
                <WorkspaceTitle workspace={workspace} hasBg={workspace.background !== null} allPages={allPages} formatDate={formatDate} handleTitleChange={updateTitle} />
                <div className="absolute top-0 left-0 w-full">
                    <BackgroundCover imageUrl={workspace.background} updateBackground={updateBackground}>
                    </BackgroundCover>
                </div>
            </PageHeaderWrapper>

            <PageSectionWrapper>
                <div className="w-full space-y-1">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent Pages</h2>
                    <div className="space-y-1 ">
                        {recentPages.length > 0 ? (
                            recentPages.map((page) => (
                                <div
                                    key={page.id}
                                    className="mt-2 bg-slate-400/5 hover:bg-slate-400/10 duration-200 p-2 px-2 last:rounded-b-lg first:rounded-t-lg rounded-sm hover:cursor-pointer"
                                    onClick={() => navigate(`/workspace/${workspaceId}/${page.id}`)}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="mt-1">
                                            <PageIconRenderer page={page} />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {page.name || 'Untitled'}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {formatDate(page.lastModified)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                No pages yet. Create your first page to get started!
                            </p>
                        )}
                    </div>
                </div>
                {/* Favorites */}
                <div className="w-full space-y-1">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Favorites</h2>
                    <div className="space-y-1">
                        {favorites.length > 0 ? (
                            favorites.map((page) => (
                                <div
                                    key={page.id}
                                    className="mt-2 bg-slate-400/5 hover:bg-slate-400/10 duration-200 p-2 px-2 last:rounded-b-lg first:rounded-t-lg rounded-sm hover:cursor-pointer"
                                    onClick={() => navigate(`/workspace/${workspaceId}/${page.id}`)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <PageIconRenderer page={page} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate w-fit hover:underline">
                                                {page.name || 'Untitled'}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {formatDate(page.lastModified)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                No favorites yet. Star pages to see them here.
                            </p>
                        )}
                    </div>
                </div>

                {import.meta.env.DEV && (
                    <div className="flex flex-col gap-2 w-full">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Publish Workspace (coming soon)</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            You can publish your workspace to share it with others.
                        </p>

                        <div className="flex gap-2 flex-wrap">
                            <button className="btnPrimary flex gap-1 items-center" onClick={() => setShowPublishModal(true)}>
                                Publish Workspace
                            </button>
                            <PublishWorkspaceDialog
                                isOpen={showPublishModal}
                                onClose={() => setShowPublishModal(false)}
                                workspace={workspace}
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Utilities</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Export Workspace
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            className="btnChip"
                            onClick={
                                exportWorkspaceToJSON
                            }
                        >
                            Export to JSON
                        </button>
                        <button
                            className="btnChip"
                        >
                            {`Export to MD (Coming Soon)`}
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Delete Workspace
                    </p>
                    <button className="btnDestructive w-fit flex items-center gap-1" onClick={() => setShowDeleteModal(true)}>
                        <Trash size={12} />
                        Delete
                    </button>
                    <DeleteWorkspaceModal isDialogOpen={showDeleteModal} workspaceId={workspaceId} onClose={() => setShowDeleteModal(false)} />
                </div>
            </PageSectionWrapper>

        </div>
    );
}