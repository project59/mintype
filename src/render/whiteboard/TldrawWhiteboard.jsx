import { useCallback, useEffect, useRef } from 'react';
import { getSnapshot } from 'tldraw';
import dbService from '../../lib/dbService.js';
import TldrawCanvas from './TldrawCanvas.jsx';

export default function TldrawWhiteboard({ pageId, masterKey, snapshot, onEditorReady }) {
    const editorRef = useRef(null);
    const saveTimerRef = useRef(null);
    const saveRevisionRef = useRef(0);
    const savedRevisionRef = useRef(0);
    const saveQueueRef = useRef(Promise.resolve());
    const stopListeningRef = useRef(null);

    const writeSnapshot = useCallback((nextSnapshot, revision) => {
        saveQueueRef.current = saveQueueRef.current
            .catch(() => {})
            .then(() => dbService.updateTldrawSnapshot({
                id: pageId,
                snapshot: nextSnapshot,
                masterKey,
            }))
            .then(() => {
                savedRevisionRef.current = revision;
            })
            .catch((error) => {
                console.error('Failed to save tldraw whiteboard:', error);
            });
        return saveQueueRef.current;
    }, [masterKey, pageId]);

    const flushSnapshot = useCallback((editor) => {
        if (!editor) return Promise.resolve();
        if (saveRevisionRef.current === savedRevisionRef.current) return saveQueueRef.current;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const revision = saveRevisionRef.current;
        try {
            return writeSnapshot(getSnapshot(editor.store), revision);
        } catch (error) {
            console.error('Failed to capture tldraw snapshot:', error);
            return Promise.resolve();
        }
    }, [writeSnapshot]);

    const scheduleSnapshotSave = useCallback((editor) => {
        const revision = ++saveRevisionRef.current;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            try {
                void writeSnapshot(getSnapshot(editor.store), revision);
            } catch (error) {
                console.error('Failed to capture tldraw snapshot:', error);
            }
        }, 700);
    }, [writeSnapshot]);

    const handleEditorMount = useCallback((editor) => {
        stopListeningRef.current?.();
        editorRef.current = editor;
        onEditorReady?.(editor);
        stopListeningRef.current = editor.store.listen(
            () => scheduleSnapshotSave(editor),
            { source: 'user', scope: 'all' }
        );
    }, [onEditorReady, scheduleSnapshotSave]);

    useEffect(() => () => {
        stopListeningRef.current?.();
        stopListeningRef.current = null;
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        if (editorRef.current) {
            void flushSnapshot(editorRef.current);
        }
        onEditorReady?.(null);
    }, [flushSnapshot, onEditorReady]);

    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            <TldrawCanvas
                snapshot={snapshot}
                onMount={handleEditorMount}
                seedInitialScene={!snapshot}
                className="relative min-h-0 flex-1"
            />
        </div>
    );
}
