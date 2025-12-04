import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Home, PanelsTopLeft, Star, StickyNote } from "lucide-react";
import WorkspaceTitle from "../layouts/workspaces/WorkspaceTitle.jsx";
import BackgroundCover from "../layouts/workspaces/BackgroundCover.jsx";
import { useWiki } from "../layouts/wiki/WikiContext.jsx";
import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";

export default function WikiHome() {
    const { wikiId } = useParams();
    const [workspace, setWorkspace] = useState({});
    const [workspaceEntry, setWorkspaceEntry] = useState({});
    const [allPages, setAllPages] = useState([]);
    const [recentPages, setRecentPages] = useState([]);
    const navigate = useNavigate();
    const { wikiRoot, fileTree, canView, loading, message } = useWiki();

    const fetchWorkspace = async () => {
        try {
            setWorkspace(wikiRoot);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchWorkspaceData = async () => {
        try {
            setAllPages(fileTree);
            // get the root entry, it has parentId null
            const rootEntry = fileTree.find(entry => entry.type === 'workspace');
            setWorkspaceEntry(rootEntry);
            const sortedByRecent = [...fileTree]
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
    }, [wikiId, wikiRoot, fileTree]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        });
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
                    <FileText size={14} className="text-blue-400" />
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

    if (loading) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen text-black dark:text-white font-bold">
                <img src="/favicon.svg" className="h-8" alt="logo" />
                LOADING...
            </div>
        )
    }

    if (!canView) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen text-black dark:text-white">
                {message}
                <Link to="/workspace" className="btnSecondary flex items-center">Go to Workspaces</Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <nav className="w-full flex items-center justify-between text-sm text-zinc-400 px-2 py-2.5 sticky top-0 h-12 z-20 bg-slate-100 dark:bg-[#10101e]">
                <div className="items-center flex">
                    <Link to={`/wiki/${wikiId}`} className="ml-9 md:ml-0 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-gray-300 p-1 rounded-lg duration-200">
                        <Home size={14} />
                    </Link>
                </div>
                <div className="flex">
                    <Link to="/workspace" className="btnAction">
                        My Workspaces
                    </Link>
                </div>
            </nav>
            {/* Header */}
            <PageHeaderWrapper>
                <WorkspaceTitle workspace={workspaceEntry} hasBg={workspace.background !== null} allPages={allPages} formatDate={formatDate} handleTitleChange={() => { }} />
                <div className="absolute top-0 left-0 w-full">
                    <BackgroundCover imageUrl={workspace.background} updateBackground={() => { }}>
                    </BackgroundCover>
                </div>
            </PageHeaderWrapper>

            <PageSectionWrapper>
                <div className="w-full space-y-1">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Recent Pages</h2>
                    <div className="space-y-1 ">
                        {recentPages.length > 0 ? (
                            recentPages.map((page) => (
                                (page.type !== 'workspace' &&
                                    <div
                                        key={page.id}
                                        className="mt-2 bg-slate-400/5 hover:bg-slate-400/10 duration-200 p-2 px-2 last:rounded-b-lg first:rounded-t-lg rounded-sm hover:cursor-pointer"
                                        onClick={() => navigate(`/wiki/${wikiId}/${page.id}`)}
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
                                )
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                No pages yet. Create your first page to get started!
                            </p>
                        )}
                    </div>
                </div>
            </PageSectionWrapper>
        </div>
    );
}