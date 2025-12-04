import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import EnterPasswordDialog from "../components/encryption/EnterPasswordDialog";
import toast from "react-hot-toast";
import { useWiki } from "../layouts/wiki/WikiContext.jsx";
import BasicElementRenderer from "../render/shared/read-only/BasicElementRenderer.jsx";
import { useSupabaseAuth } from "../layouts/auth/SupabaseAuthProvider.jsx";
import { Home } from "lucide-react";
import ReadOnlyWhiteboard from "../render/whiteboard/components/ReadOnlyWhiteboard.jsx";

export default function WikiPage() {
    const { wikiId, pageId } = useParams();
    const [page, setPage] = useState(null);
    const [elements, setElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPasswordRequired, setIsPasswordRequired] = useState(false);
    const { wikiEntries, message, canView } = useWiki();
    const { accessToken, supabase } = useSupabaseAuth();

    const fetchPage = async ({ workspaceRowId, pageId }) => {
        console.log('fetching page')
        // workspaceRowId is the internal workspaces.id (uuid).
        // If you only have wiki_id, first fetch workspace id.
        try {
            // If you have wikiId (wiki_id), fetch workspace.id first:
            let workspaceRowIdToUse = workspaceRowId;
            if (!workspaceRowIdToUse) {
                const { data: workspace, error } = await supabase
                    .from('workspaces')
                    .select('id')
                    .eq('wiki_id', wikiId)
                    .maybeSingle();
                if (error || !workspace) throw new Error('Workspace not found');
                workspaceRowIdToUse = workspace.id;
            }
            const { data: page, error: pageErr } = await supabase
                .from('workspace_pages')
                .select('content')
                .eq('workspace_id', workspaceRowIdToUse)
                .eq('page_id', pageId)
                .maybeSingle();

            if (pageErr) {
                console.error('page fetch error', pageErr);
                return null;
            }
            if (!page) {
                return null;
            }

            if (page.content) {
                console.log('page content', page.content);
                setPage(page.content);
                if (page.content.encrypted) {
                    setIsPasswordRequired(true);
                    setElements([]);
                } else {
                    setElements(page.content.elements || []);
                    setIsPasswordRequired(false);
                }
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching page:', err);
            return null;
        }
    };

    const handlePasswordSubmit = async (enteredPassword) => {
        // try {
        //     const decryptedElements = await decryptData(page.encryptedElements, enteredPassword, page.salt, page.iv);
        //     setElements(JSON.parse(decryptedElements));
        //     setIsPasswordRequired(false);
        // } catch (error) {
        //     toast.error('Invalid password');
        // }
    };

    useEffect(() => {
        if (!accessToken) return;
        fetchPage({ workspaceRowId: null, pageId });
    }, [pageId, wikiEntries, accessToken]);

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
        <div className="flex flex-col items-center relative h-screen text-black overflow-auto">
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

            {page && page.id === pageId && !isPasswordRequired && (
                (page.type === "document" ? (
                    <div className="relative h-fit max-w-3xl px-3 w-full pt-16 pb-12 md:pt-16 md:pb-16">
                        <BasicElementRenderer elements={elements[0]} readOnly={true} />
                    </div>
                ) : (
                    <ReadOnlyWhiteboard
                        key={pageId}
                        preferences={page.preferences}
                        elements={elements}
                        onElementUpdate={() => { }}
                        onwrapperUpdate={() => { }}
                        onElementAdd={() => { }}
                        onElementDelete={() => { }}
                        handleTransformed={() => { }}
                    />
                ))
            )}
            
            <EnterPasswordDialog handleSubmit={handlePasswordSubmit} showPasswordDialog={isPasswordRequired} />
        </div>
    );
}