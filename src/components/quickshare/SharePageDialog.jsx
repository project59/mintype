import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Input } from '@headlessui/react'
import { Loader2, Copy, CheckCheck } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseAuth } from '../../layouts/auth/SupabaseAuthProvider.jsx'
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx'
import dbService from '../../lib/dbService.js'
import { encryptSharedPage, hashSharePayload } from './shareCrypto.js'
import { buildSharePayload } from './sharePayload.js'
import { forgetSharedLink, getSharedLink, rememberSharedLink } from './sharedLinks.js'

const SHARE_BUCKET = 'quickshare';
// Matches the quickshare bucket's file size limit in Supabase.
const MAX_SHARE_BYTES = 50 * 1024 * 1024;
const TOO_LARGE = 'This page is too large to share. Large images take up most of the space.';
const UNSAVED_WHITEBOARD = 'This whiteboard has not been saved yet. Make a change and try again.';

const errorMessage = async (res, fallback) => {
    if (res.status === 401) return 'Your session has expired. Sign in again to share pages.';
    const data = await res.json().catch(() => null);
    return data?.error || fallback;
};

const formatExpiry = (expiresAt) => new Date(expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// `markdown` is the open document editor's current Markdown, which may be newer than the saved
// copy. Whiteboards are read from storage, which they save to shortly after every change.
const loadPayload = async (page, markdown, masterKey) => {
    const content = page.type === 'document'
        ? { type: 'document', markdown: markdown || '' }
        : await dbService.getContent(page.id, masterKey);
    if (page.type === 'whiteboard' && !content?.tldraw?.snapshot) return null;
    return buildSharePayload(page, content);
};

// A page's link is remembered on this device until it expires, so reopening the dialog shows it
// again. Reshare uploads the page's current version to the same link; Revoke deletes it.
export default function SharePageDialog({ isOpen, onClose, page, markdown }) {
    const { user, accessToken, supabase } = useSupabaseAuth()
    const { masterKey } = useContext(SecureContext)
    const [share, setShare] = useState(null)
    const [changed, setChanged] = useState(false)
    const [busy, setBusy] = useState(null)
    const [confirmRevoke, setConfirmRevoke] = useState(false)
    const [copied, setCopied] = useState(false)
    const [message, setMessage] = useState("")
    const [notice, setNotice] = useState("")

    useEffect(() => {
        if (!isOpen) return undefined;
        let cancelled = false;
        setShare(null);
        setChanged(false);
        setBusy(null);
        setConfirmRevoke(false);
        setCopied(false);
        setMessage("");
        setNotice("");
        if (!page || !masterKey) return undefined;

        (async () => {
            const stored = await getSharedLink(masterKey, page.id);
            if (cancelled || !stored) return;
            setShare(stored);
            const payload = await loadPayload(page, markdown, masterKey).catch(() => null);
            if (!cancelled && payload) setChanged(await hashSharePayload(payload) !== stored.contentHash);
        })();
        return () => { cancelled = true; };
        // Runs on opening only: the open editor's Markdown changes with every keystroke.
    }, [isOpen, page?.id, masterKey]);

    const handleCopy = async () => {
        if (!share) return
        try {
            await navigator.clipboard.writeText(share.link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setMessage('Copy failed. Select the link and copy it manually.')
        }
    }

    const run = async (action, task) => {
        if (busy || !user || !page) return
        setBusy(action)
        setMessage("")
        setNotice("")
        try {
            await task()
        } catch (error) {
            console.error(`QuickShare ${action} failed:`, error)
            setMessage(action === 'revoke' ? 'The link could not be revoked. Please try again.' : 'The link could not be created. Please try again.')
        } finally {
            setBusy(null)
        }
    }

    const api = (path, body) => fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, ...(body && { 'Content-Type': 'application/json' }) },
        body: body && JSON.stringify(body),
    })

    // Encrypts the page and uploads it through a signed upload URL. Returns the key fragment and
    // the payload's hash, or null after showing why it could not.
    const upload = async ({ path, token }, keyFragment, upsert) => {
        const payload = await loadPayload(page, markdown, masterKey)
        if (!payload) {
            setMessage(UNSAVED_WHITEBOARD)
            return null
        }
        const encrypted = await encryptSharedPage(payload, keyFragment)
        if (encrypted.body.byteLength > MAX_SHARE_BYTES) {
            setMessage(TOO_LARGE)
            return null
        }
        const { error } = await supabase.storage
            .from(SHARE_BUCKET)
            .uploadToSignedUrl(path, token, new Blob([encrypted.body], { type: 'application/octet-stream' }), {
                contentType: 'application/octet-stream',
                upsert,
            })
        if (error) {
            console.error("Failed to upload shared page:", error)
            setMessage((error.status === 413 || error.statusCode === '413') ? TOO_LARGE : 'The page could not be uploaded. Please try again.')
            return null
        }
        return { keyFragment: encrypted.keyFragment, contentHash: await hashSharePayload(payload) }
    }

    const saveShare = async (record) => {
        await rememberSharedLink(masterKey, page.id, record)
        setShare(record)
        setChanged(false)
    }

    const createLink = () => run('generate', async () => {
        const res = await api('/api/create-quicksharepage')
        if (!res.ok) {
            setMessage(await errorMessage(res, 'The link could not be created. Please try again.'))
            return
        }
        const { id, path, token, expiresAt, manageToken } = await res.json()
        const uploaded = await upload({ path, token }, null, false)
        if (!uploaded) return
        await saveShare({
            id,
            link: `${window.location.origin}/quickshare/${id}#${uploaded.keyFragment}`,
            manageToken: manageToken || null,
            expiresAt,
            contentHash: uploaded.contentHash,
        })
    })

    // Uploads the current version over the shared file, encrypted with the link's own key.
    const reshare = () => run('reshare', async () => {
        const res = await api('/api/update-quicksharepage', { id: share.id, manageToken: share.manageToken })
        if (!res.ok) {
            if (res.status === 404) {
                forgetSharedLink(page.id)
                setShare(null)
            }
            setMessage(await errorMessage(res, 'The link could not be updated. Please try again.'))
            return
        }
        const { path, token, expiresAt } = await res.json()
        const uploaded = await upload({ path, token }, new URL(share.link).hash, true)
        if (!uploaded) return
        // The server times expiry from the file's creation; read it back in case overwriting reset it.
        const current = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/get-quicksharepage/${share.id}`)
            .then((info) => info.ok ? info.json() : null)
            .catch(() => null)
        await saveShare({ ...share, expiresAt: current?.expiresAt || expiresAt, contentHash: uploaded.contentHash })
        setNotice('The link now shows the current version of this page.')
    })

    const revoke = () => {
        if (!confirmRevoke) {
            setConfirmRevoke(true)
            return
        }
        setConfirmRevoke(false)
        run('revoke', async () => {
            const res = await api('/api/revoke-quicksharepage', { id: share.id, manageToken: share.manageToken })
            if (!res.ok) {
                setMessage(await errorMessage(res, 'The link could not be revoked. Please try again.'))
                return
            }
            forgetSharedLink(page.id)
            setShare(null)
            setChanged(false)
            setNotice('Link revoked. It no longer opens this page.')
        })
    }

    const blockedReason = !user
        ? 'signIn'
        : page?.sensitive
            ? 'Sensitive pages cannot be shared. Unmark this page as sensitive to share it.'
            : null;
    // Links from a server without a manage token can only be replaced, not updated or revoked.
    const canManage = Boolean(share?.manageToken && user);

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-20 focus:outline-none">
            <DialogBackdrop transition className="dialogBackdrop" />
            <div className="dialogWrapper">
                <DialogPanel transition className="dialogPanel">
                    <DialogTitle as="h3" className="textTitle">
                        Quick Share
                    </DialogTitle>
                    <p className="my-2 text-sm text-gray-500 dark:text-gray-400">
                        Create a read-only link to this page as it is now. The page is encrypted before it leaves this device and the key is only in the link, so anyone with the link can read it for 24 hours.
                    </p>

                    {(share || !blockedReason) && (
                        <Input
                            className="baseInput"
                            type="text"
                            value={share?.link || ""}
                            readOnly
                            onFocus={(e) => e.target.select()}
                            placeholder="No link yet"
                        />
                    )}
                    {share && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Expires {formatExpiry(share.expiresAt)}.
                            {changed && ' This page has changed since you shared it. Reshare to update the link.'}
                        </p>
                    )}
                    {blockedReason === 'signIn' ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Sign in with Google in <Link to="/settings/sync" className="underline" onClick={onClose}>Sync settings</Link> to create share links.
                        </p>
                    ) : blockedReason && (
                        <p className="mt-2 text-sm text-red-400">{blockedReason}</p>
                    )}
                    {message && <p className="mt-2 text-sm text-red-400">{message}</p>}
                    {notice && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{notice}</p>}

                    <div className="mt-4 flex w-full flex-wrap justify-between gap-2">
                        <button className="btnSecondary" onClick={onClose}>
                            Close
                        </button>

                        <div className="flex flex-wrap justify-end gap-2">
                            {canManage && (
                                <button
                                    className={`${confirmRevoke ? 'btnDestructive' : 'btnSecondary'} flex items-center justify-center gap-2`}
                                    disabled={Boolean(busy)}
                                    onClick={revoke}
                                    onBlur={() => setConfirmRevoke(false)}
                                >
                                    {busy === 'revoke' ? <><Loader2 className="animate-spin" size={16} /> Revoking...</> : confirmRevoke ? 'Confirm revoke' : 'Revoke'}
                                </button>
                            )}
                            {share && changed && !blockedReason && (
                                <button
                                    className="btnPrimary flex items-center justify-center gap-2"
                                    disabled={Boolean(busy)}
                                    onClick={canManage ? reshare : createLink}
                                >
                                    {busy === 'reshare' || busy === 'generate' ? <><Loader2 className="animate-spin" size={16} /> Resharing...</> : 'Reshare'}
                                </button>
                            )}
                            {share ? (
                                <button
                                    className={`${changed && !blockedReason ? 'btnSecondary' : 'btnPrimary'} flex items-center justify-center gap-2`}
                                    onClick={handleCopy}
                                >
                                    {copied ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                                </button>
                            ) : (
                                <button
                                    className="btnPrimary flex items-center justify-center gap-2"
                                    disabled={Boolean(busy) || Boolean(blockedReason)}
                                    onClick={createLink}
                                >
                                    {busy === 'generate' ? <><Loader2 className="animate-spin" size={16} /> Generating...</> : "Generate"}
                                </button>
                            )}
                        </div>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
