import { useParams } from "react-router-dom";
import { ExternalToolbar } from "../render/editor/EditorToolbar.jsx";
import DocumentEditor from "../render/editor/DocumentEditor.jsx";
import { lazy, Suspense, useEffect, useState, useRef, useCallback, useContext } from "react";
import dbService from "../lib/dbService";
import toast from "react-hot-toast";
import FunctionBar from "../components/common/FunctionBar";
import { useSidebar } from "../layouts/root/SidebarContext.jsx";
import { SecureContext } from "../layouts/secure-context/SecureContext.jsx";
import { decryptWithKey, deriveKEK } from "../layouts/secure-context/secureUtils.js";
import { getItem } from "../layouts/secure-context/dbUtils.js";
import SensitiveDialog from "../layouts/secure-context/SensitiveDialog.jsx";
import { useEditorContext } from "../render/editor/EditorContext.jsx";
import { TLDRAW_WHITEBOARD_FORMAT_VERSION } from "../utils/constants.js";

const TldrawWhiteboard = lazy(() => import('../render/whiteboard/TldrawWhiteboard.jsx'));

const readTldrawSnapshot = (value) => {
    if (!value) return null;

    if (value.formatVersion !== TLDRAW_WHITEBOARD_FORMAT_VERSION || !Object.hasOwn(value, 'snapshot')) {
        throw new Error('This tldraw whiteboard version is not supported.');
    }
    const snapshot = value.snapshot;
    if (snapshot != null && (!snapshot.document || !snapshot.session)) {
        throw new Error('This tldraw whiteboard snapshot is invalid.');
    }
    return snapshot ?? null;
};

export default function Page() {
    const { pageId } = useParams();
    const [pageMeta, setPageMeta] = useState(null);
    const [tldrawSnapshot, setTldrawSnapshot] = useState(null);
    const [markdown, setMarkdown] = useState('');
    const [showPassword, setShowPassword] = useState(null);
    const [error, setError] = useState(null);
    const [documentEditor, setDocumentEditor] = useState(null);
    const { showTextToolbar, setShowTextToolbar } = useSidebar();
    const { activeEditor, setActiveEditor } = useEditorContext();
    const { masterKey } = useContext(SecureContext);
    const [tldrawEditor, setTldrawEditor] = useState(null);
    // Remounts the whiteboard when sync replaces its content.
    const [contentRevision, setContentRevision] = useState(0);

    const masterKeyRef = useRef(masterKey);
    masterKeyRef.current = masterKey;

    // The latest unsaved Markdown, kept with the page it belongs to so switching pages or leaving
    // can save it immediately instead of dropping it.
    const pendingSaveRef = useRef(null);
    const flushMarkdownSave = useCallback(() => {
        const pending = pendingSaveRef.current;
        if (!pending) return;
        pendingSaveRef.current = null;
        clearTimeout(pending.timer);
        dbService.updateDocumentMarkdown(pending.pageId, pending.markdown, masterKeyRef.current)
            .catch((error) => console.error('Failed to save markdown update:', error));
    }, []);

    const debouncedMarkdownSave = useCallback((pageId, nextMarkdown) => {
        const pending = pendingSaveRef.current;
        if (pending?.pageId !== pageId) flushMarkdownSave();
        else clearTimeout(pending.timer);
        pendingSaveRef.current = { pageId, markdown: nextMarkdown, timer: setTimeout(flushMarkdownSave, 500) };
    }, [flushMarkdownSave]);

    const fetchPage = async (isRefresh = false) => {
        try {
            const fetchedMeta = await dbService.getMeta(pageId);
            const fetchedContent = await dbService.getContent(pageId, masterKey);
            setPageMeta(fetchedMeta);
            if (fetchedMeta.sensitive && !isRefresh) {
                setShowPassword(true);
            }
            if (!fetchedContent) {
                setError('Page content not found');
                return;
            }

            if (fetchedMeta.type === 'document') {
                if (typeof fetchedContent.markdown !== 'string') {
                    setError('Page content is corrupted');
                    return;
                }
                setTldrawSnapshot(null);
                setMarkdown(fetchedContent.markdown);
            } else {
                if (fetchedMeta.type !== 'whiteboard' || !Object.hasOwn(fetchedContent, 'tldraw')) {
                    setError('Page content is corrupted');
                    return;
                }
                setTldrawSnapshot(readTldrawSnapshot(fetchedContent.tldraw));
            }
        } catch (error) {
            console.error(error);
            setError(error.message || 'Could not load this page.');
        }
    };

    const triggerRefresh = () => {
        fetchPage(true);
    };

    const isTldrawWhiteboard = pageMeta?.type === 'whiteboard';

    const handleUndo = useCallback(async () => {
        if (!pageId) return;
        if (pageMeta?.type === 'document') {
            if (documentEditor?.can().undo()) {
                documentEditor.commands.undo();
            } else {
                toast.error('Nothing to undo');
            }
            return;
        }
        if (isTldrawWhiteboard) {
            if (activeEditor) {
                if (activeEditor.can().undo()) activeEditor.commands.undo();
                else toast.error('Nothing to undo');
                return;
            }
            if (tldrawEditor?.canUndo()) tldrawEditor.undo();
            else toast.error('Nothing to undo');
            return;
        }
    }, [pageId, pageMeta, documentEditor, isTldrawWhiteboard, activeEditor, tldrawEditor]);

    const handleRedo = useCallback(async () => {
        if (!pageId) return;
        if (pageMeta?.type === 'document') {
            if (documentEditor?.can().redo()) {
                documentEditor.commands.redo();
            } else {
                toast.error('Nothing to redo');
            }
            return;
        }
        if (isTldrawWhiteboard) {
            if (activeEditor) {
                if (activeEditor.can().redo()) activeEditor.commands.redo();
                else toast.error('Nothing to redo');
                return;
            }
            if (tldrawEditor?.canRedo()) tldrawEditor.redo();
            else toast.error('Nothing to redo');
            return;
        }
    }, [pageId, pageMeta, documentEditor, isTldrawWhiteboard, activeEditor, tldrawEditor]);

    useEffect(() => {
        setShowTextToolbar(false);

        // Reset state immediately when pageId changes
        setPageMeta(null);
        setTldrawSnapshot(null);
        setMarkdown('');
        setDocumentEditor(null);
        setTldrawEditor(null);
        setActiveEditor(null);
        setError(null);
        setShowPassword(null);

        fetchPage();
    }, [pageId]);

    const handleMarkdownUpdate = useCallback(async (nextMarkdown) => {
        try {
            setMarkdown(nextMarkdown);
            debouncedMarkdownSave(pageId, nextMarkdown);
        } catch (error) {
            console.error('Failed to update markdown:', error);
        }
    }, [pageId, debouncedMarkdownSave]);

    useEffect(() => flushMarkdownSave, [pageId, flushMarkdownSave]);

    useEffect(() => {
        const flushWhenHidden = () => {
            if (document.visibilityState === 'hidden') flushMarkdownSave();
        };
        document.addEventListener('visibilitychange', flushWhenHidden);
        window.addEventListener('pagehide', flushMarkdownSave);
        return () => {
            document.removeEventListener('visibilitychange', flushWhenHidden);
            window.removeEventListener('pagehide', flushMarkdownSave);
        };
    }, [flushMarkdownSave]);

    // Shows newer content that sync downloaded for this page. Unsaved local edits are newer, so
    // they are kept and win on the next sync.
    useEffect(() => {
        const channel = new BroadcastChannel('db-updates');
        channel.onmessage = async (event) => {
            if (!event.data?.remotePageIds?.includes(pageId) || pendingSaveRef.current) return;
            try {
                const content = await dbService.getContent(pageId, masterKeyRef.current);
                if (typeof content?.markdown === 'string') {
                    setMarkdown(content.markdown);
                } else if (content && Object.hasOwn(content, 'tldraw')) {
                    setTldrawSnapshot(readTldrawSnapshot(content.tldraw));
                    setContentRevision((revision) => revision + 1);
                }
            } catch (error) {
                console.error('Failed to load synced page content:', error);
            }
        };
        return () => channel.close();
    }, [pageId]);

    const handleSubmit = async (passwordOrRecovery, isRecovery = false) => {
        const salt = isRecovery ? await getItem("recovery_salt") : await getItem("salt");
        const encBlob = isRecovery
            ? await getItem("recovery_key_enc")
            : await getItem("master_key_enc");
        if (!encBlob) return alert("No matching encrypted data found");

        const { iv, ciphertext } = encBlob;
        const kek = await deriveKEK(passwordOrRecovery, salt);

        try {
            const decrypted = await decryptWithKey(kek, iv, ciphertext);

            setShowPassword(false);
            toast.success("Unlocked");
        } catch (e) {
            toast.error("Failed to unlock");
        }
    };


    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    if (showPassword) {
        return (
            <SensitiveDialog onSubmit={handleSubmit} />
        )
    }

    return (
        <div className="flex flex-col items-center relative h-full text-black overflow-hidden">
            <div className="sticky top-0 h-12 z-20 bg-slate-100 dark:bg-[#10101e] w-full">
                <FunctionBar handleUndo={handleUndo} handleRedo={handleRedo} triggerRefresh={triggerRefresh} markdown={markdown} />
            </div>

            {pageMeta && pageMeta.id === pageId && (
                (pageMeta.type === "document" ? (
                    <DocumentEditor
                        key={pageId}
                        markdown={markdown}
                        onUpdate={handleMarkdownUpdate}
                        onEditorReady={setDocumentEditor}
                        width={pageMeta.documentWidth}
                    />
                ) : (
                    <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center">Loading whiteboard...</div>}>
                        <TldrawWhiteboard
                            key={`${pageId}:${contentRevision}`}
                            pageId={pageId}
                            masterKey={masterKey}
                            snapshot={tldrawSnapshot}
                            onEditorReady={setTldrawEditor}
                        />
                    </Suspense>
                ))
            )}
            {/* Whiteboards show the text toolbar in place of tldraw's while a Markdown object is edited. */}
            {!isTldrawWhiteboard && (
                <div className="w-full bg-white dark:bg-[#1f1f2d] flex justify-center">
                    <div className={`h-12 bg-slate-200/80 md:mb-2 md:rounded-full dark:bg-[#2d2e3b]/80 backdrop-blur-sm z-10 mt-2 static ${showTextToolbar ? 'md:fixed bottom-0 md:bottom-2' : 'hidden'} flex items-center justify-center no-printme`}>
                        <ExternalToolbar />
                    </div>
                </div>
            )}
        </div>
    );
}
