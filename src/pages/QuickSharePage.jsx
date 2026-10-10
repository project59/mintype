import { Link, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import StaticMarkdownRenderer from "../render/shared/read-only/StaticMarkdownRenderer.jsx";
import { FolderInput, Home } from "lucide-react";
import ThemeToggleBtn from "../components/common/ThemeToggleBtn";
import { decryptSharedPage, readShareKey } from "../components/quickshare/shareCrypto.js";
import { validSharePayload } from "../components/quickshare/sharePayload.js";
import SaveToWorkspaceDialog from "../components/quickshare/SaveToWorkspaceDialog.jsx";
import { hasLocalSetup } from "../layouts/secure-context/localKey.js";

// Loaded only for whiteboard links, so document links never download the canvas runtime.
const ReadOnlyWhiteboard = lazy(() => import("../render/whiteboard/ReadOnlyWhiteboard.jsx"));

const MESSAGES = {
    missingKey: "This link is incomplete. Ask the sender to copy the whole link, including the part after #.",
    notFound: "This page does not exist or its link has expired.",
    wrongKey: "This page could not be decrypted. The link may have been changed or copied incompletely.",
    unsupported: "This page cannot be shown here.",
    failed: "This page could not be loaded. Check your connection and try again.",
};

export default function QuickSharePage() {
    const { pageId: shareId } = useParams();
    const { hash } = useLocation();
    const [page, setPage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [canSave, setCanSave] = useState(false);
    const [isSaveOpen, setIsSaveOpen] = useState(false);

    // Saving needs a Mintype setup on this device to hold the copy.
    useEffect(() => {
        hasLocalSetup().then(setCanSave).catch(() => setCanSave(false));
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setPage(null);
        setError(null);

        const load = async () => {
            const key = await readShareKey(hash);
            if (!key) return { error: 'missingKey' };

            // The server returns a short-lived URL to the encrypted file in storage.
            let encrypted;
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/get-quicksharepage/${encodeURIComponent(shareId)}`);
                if (response.status === 404) return { error: 'notFound' };
                if (!response.ok) return { error: 'failed' };
                const { url } = await response.json();
                const file = await fetch(url);
                if (!file.ok) return { error: file.status === 404 || file.status === 400 ? 'notFound' : 'failed' };
                encrypted = await file.arrayBuffer();
            } catch {
                return { error: 'failed' };
            }

            let payload;
            try {
                payload = await decryptSharedPage(key, encrypted);
            } catch {
                return { error: 'wrongKey' };
            }
            return validSharePayload(payload) ? { page: payload } : { error: 'unsupported' };
        };

        load().then((result) => {
            if (cancelled) return;
            setPage(result.page || null);
            setError(result.error || null);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [shareId, hash]);

    useEffect(() => {
        if (!page) return undefined;
        const previousTitle = document.title;
        document.title = `${page.meta.name || 'Untitled Page'} · Mintype`;
        return () => {
            document.title = previousTitle;
        };
    }, [page]);

    if (loading) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center min-h-screen text-black dark:text-white font-bold">
                <img src="/favicon.svg" className="h-8" alt="logo" />
                LOADING...
            </div>
        )
    }

    const isWhiteboard = page?.content.type === 'whiteboard';

    return (
        <div className={`flex flex-col items-center relative h-screen text-black bg-white dark:bg-[#1f1f2d] ${isWhiteboard ? 'overflow-hidden' : 'overflow-auto'}`}>
            {/* Sticky so a long document keeps its title in view. */}
            <nav className="sticky top-0 w-full z-20 flex shrink-0 items-center gap-2 text-sm text-zinc-400 h-12 p-2.5 bg-white dark:bg-[#1f1f2d]">
                <ThemeToggleBtn />
                <Link to="/workspace" className=" hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:hover:text-gray-300 p-1 rounded-lg duration-200">
                    <Home size={14} />
                </Link>
                {page && (
                    <h1 className="ml-1 flex min-w-0 items-center gap-2 font-medium text-black dark:text-white">
                        {page.meta.emoji && <span>{page.meta.emoji}</span>}
                        <span className="truncate">{page.meta.name || 'Untitled Page'}</span>
                    </h1>
                )}
                {page && canSave && (
                    <button
                        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-indigo-900 bg-indigo-400/20 border border-indigo-400/50 hover:bg-indigo-400/30 dark:text-white dark:bg-indigo-500/40 duration-200"
                        onClick={() => setIsSaveOpen(true)}
                        title="Save a copy to one of your workspaces"
                    >
                        <FolderInput size={14} />
                        <span className="hidden sm:inline">Save to workspace</span>
                    </button>
                )}
            </nav>

            {isWhiteboard ? (
                <Suspense fallback={<div className="flex-1" />}>
                    <ReadOnlyWhiteboard snapshot={page.content.tldraw.snapshot} className="relative min-h-0 w-full flex-1" />
                </Suspense>
            ) : page ? (
                <div className="relative h-fit max-w-3xl px-3 w-full pt-16 pb-12 md:pt-16 md:pb-16">
                    <StaticMarkdownRenderer markdown={page.content.markdown} />
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {MESSAGES[error]}
                </div>
            )}
            {page && canSave && (
                <SaveToWorkspaceDialog isOpen={isSaveOpen} onClose={() => setIsSaveOpen(false)} payload={page} />
            )}
        </div>
    );
}
