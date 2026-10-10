import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dbService from '../../lib/dbService.js'
import { unwrapMasterKey } from '../../layouts/secure-context/localKey.js'
import { sharedPageToImport } from './sharePayload.js'

// Copies a shared page into a workspace on this device. The share page runs outside the app's
// SecureProvider, so the master key is unlocked here and kept only in this component's memory.
// The page is written with dbService.importPage, which also queues it for Drive sync.
export default function SaveToWorkspaceDialog({ isOpen, onClose, payload }) {
    const [masterKey, setMasterKey] = useState(null)
    const [secret, setSecret] = useState('')
    const [useRecovery, setUseRecovery] = useState(false)
    const [workspaces, setWorkspaces] = useState(null)
    const [rootId, setRootId] = useState(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [saved, setSaved] = useState(null)

    useEffect(() => {
        if (!isOpen) return;
        setSaved(null);
        setMessage('');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !masterKey) return;
        dbService.getAllRootMeta().then((roots) => {
            const live = roots
                .filter((root) => !root.deleted)
                .sort((a, b) => (a.created ?? 0) - (b.created ?? 0) || (a.id < b.id ? -1 : 1));
            setWorkspaces(live);
            setRootId((current) => live.some((root) => root.id === current) ? current : live[0]?.id ?? null);
        });
    }, [isOpen, masterKey]);

    const unlock = async () => {
        if (busy || !secret) return;
        setBusy(true);
        setMessage('');
        try {
            const unwrapped = await unwrapMasterKey(secret, useRecovery);
            if (!unwrapped) {
                setMessage('Mintype is not set up on this device.');
                return;
            }
            setMasterKey(unwrapped.masterKey);
            setSecret('');
        } catch {
            setMessage(useRecovery ? 'That recovery key is not correct.' : 'That password is not correct.');
        } finally {
            setBusy(false);
        }
    };

    const save = async () => {
        if (busy || !rootId) return;
        setBusy(true);
        setMessage('');
        try {
            const { meta, content } = sharedPageToImport(payload, rootId);
            const didImport = await dbService.importPage({
                meta,
                content,
                masterKey,
                expectedNotesGeneration: dbService.getNotesGeneration(),
            });
            if (!didImport) throw new Error('Notes were reset while saving.');
            dbService.notifyUpdate();
            setSaved({ rootId, pageId: meta.id, workspace: workspaces.find((root) => root.id === rootId)?.name });
        } catch (error) {
            console.error('Failed to save shared page:', error);
            setMessage('The page could not be saved. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-20 focus:outline-none">
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <DialogTitle as="h3" className="textTitle">
                        Save to Workspace
                    </DialogTitle>

                    {saved ? (
                        <p className="my-2 text-sm text-gray-500 dark:text-gray-400">
                            Saved a copy to {saved.workspace || 'your workspace'}. If you use Google Drive sync, it will be uploaded the next time Mintype syncs.
                        </p>
                    ) : !masterKey ? (
                        <>
                            <p className="my-2 text-sm text-gray-500 dark:text-gray-400">
                                Unlock Mintype on this device to save a copy of this page to one of your workspaces.
                            </p>
                            <input
                                type="password"
                                className="baseInput"
                                data-autofocus
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') unlock(); }}
                                placeholder={useRecovery ? 'Recovery Key' : 'Password'}
                            />
                            <button
                                className="textLabel !text-xs mt-2 ml-1"
                                onClick={() => { setUseRecovery(!useRecovery); setMessage(''); }}
                            >
                                {useRecovery ? 'Use Password 🔑' : 'Use Recovery Key 🗝️'}
                            </button>
                        </>
                    ) : workspaces?.length === 0 ? (
                        <p className="my-2 text-sm text-gray-500 dark:text-gray-400">
                            You have no workspaces yet. <Link to="/workspace" className="underline">Open Mintype</Link> to create one, then come back to this link.
                        </p>
                    ) : (
                        <>
                            <p className="my-2 text-sm text-gray-500 dark:text-gray-400">
                                Choose where to save a copy of this page.
                            </p>
                            <div className="flex max-h-64 flex-col gap-1 overflow-auto">
                                {(workspaces || []).map((root) => (
                                    <button
                                        key={root.id}
                                        onClick={() => setRootId(root.id)}
                                        aria-pressed={rootId === root.id}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm duration-200 ${rootId === root.id
                                            ? 'bg-indigo-500/15 text-indigo-900 dark:text-indigo-100'
                                            : 'text-gray-700 hover:bg-slate-300/30 dark:text-gray-300 dark:hover:bg-slate-700/40'}`}
                                    >
                                        <span className="truncate">{root.name || 'Untitled Workspace'}</span>
                                        {rootId === root.id && <Check size={14} className="shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {message && <p className="mt-2 text-sm text-red-400">{message}</p>}

                    <div className="flex justify-between w-full mt-4">
                        <button className="btnSecondary" onClick={onClose}>
                            Close
                        </button>
                        {saved ? (
                            <Link className="btnPrimary" to={`/workspace/${saved.rootId}/${saved.pageId}`}>
                                Open Page
                            </Link>
                        ) : !masterKey ? (
                            <button className="btnPrimary flex items-center gap-2" disabled={busy || !secret} onClick={unlock}>
                                {busy && <Loader2 className="animate-spin" size={14} />} Unlock
                            </button>
                        ) : workspaces?.length !== 0 && (
                            <button className="btnPrimary flex items-center gap-2" disabled={busy || !rootId} onClick={save}>
                                {busy && <Loader2 className="animate-spin" size={14} />} Save
                            </button>
                        )}
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
