import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Input } from '@headlessui/react'
import { Loader2, Copy, CheckCheck } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseAuth } from '../../layouts/auth/SupabaseAuthProvider.jsx'
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx'
import dbService from '../../lib/dbService.js'
import { encryptSharedPage } from './shareCrypto.js'
import { buildSharePayload } from './sharePayload.js'

const SHARE_BUCKET = 'quickshare';
// Matches the quickshare bucket's file size limit in Supabase.
const MAX_SHARE_BYTES = 50 * 1024 * 1024;
const TOO_LARGE = 'This page is too large to share. Large images take up most of the space.';

const errorMessage = async (res) => {
    if (res.status === 401) return 'Your session has expired. Sign in again to share pages.';
    const data = await res.json().catch(() => null);
    return data?.error || 'The link could not be created. Please try again.';
};

// `markdown` is the open document editor's current Markdown, which may be newer than the saved
// copy. Whiteboards are read from storage, which they save to shortly after every change.
export default function SharePageDialog({ isOpen, onClose, page, markdown }) {
    const { user, accessToken, supabase } = useSupabaseAuth()
    const { masterKey } = useContext(SecureContext)
    const [generating, setGenerating] = useState(false)
    const [link, setLink] = useState("")
    const [copied, setCopied] = useState(false)
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!isOpen) return;
        setLink("");
        setMessage("");
        setGenerating(false);
        setCopied(false);
    }, [isOpen, page?.id]);

    const handleCopy = async () => {
        if (!link) return
        try {
            await navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            setMessage('Copy failed. Select the link and copy it manually.')
        }
    }

    const generateLink = async () => {
        if (generating || link || !user || !page) return
        setGenerating(true)
        setMessage("")

        try {
            const content = page.type === 'document'
                ? { type: 'document', markdown: markdown || '' }
                : await dbService.getContent(page.id, masterKey);
            if (page.type === 'whiteboard' && !content?.tldraw?.snapshot) {
                setMessage('This whiteboard has not been saved yet. Make a change and try again.')
                return
            }
            const { body, keyFragment } = await encryptSharedPage(await buildSharePayload(page, content));
            if (body.byteLength > MAX_SHARE_BYTES) {
                setMessage(TOO_LARGE)
                return
            }

            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/create-quicksharepage`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            )
            if (!res.ok) {
                setMessage(await errorMessage(res))
                return
            }
            const { id, path, token } = await res.json()

            const { error: uploadError } = await supabase.storage
                .from(SHARE_BUCKET)
                .uploadToSignedUrl(path, token, new Blob([body], { type: 'application/octet-stream' }), {
                    contentType: 'application/octet-stream',
                })
            if (uploadError) {
                console.error("Failed to upload shared page:", uploadError)
                setMessage((uploadError.status === 413 || uploadError.statusCode === '413') ? TOO_LARGE : 'The page could not be uploaded. Please try again.')
                return
            }
            setLink(`${window.location.origin}/quickshare/${id}#${keyFragment}`)
        } catch (error) {
            console.error("Failed to create share link:", error)
            setMessage("The link could not be created. Please try again.")
        } finally {
            setGenerating(false)
        }
    }

    const blockedReason = !user
        ? 'signIn'
        : page?.sensitive
            ? 'Sensitive pages cannot be shared. Unmark this page as sensitive to share it.'
            : null;

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

                    {blockedReason === 'signIn' ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Sign in with Google in <Link to="/settings/sync" className="underline" onClick={onClose}>Sync settings</Link> to create share links.
                        </p>
                    ) : blockedReason ? (
                        <p className="mt-2 text-sm text-red-400">{blockedReason}</p>
                    ) : (
                        <Input
                            className="baseInput"
                            type="text"
                            value={link}
                            readOnly
                            onFocus={(e) => e.target.select()}
                            placeholder="No link yet"
                        />
                    )}
                    {message && (
                        <p className="mt-2 text-sm text-red-400">
                            {message}
                        </p>
                    )}

                    <div className="flex justify-between w-full mt-4">
                        <button className="btnSecondary" onClick={onClose}>
                            Close
                        </button>

                        {!link ? (
                            <button
                                className="btnPrimary flex items-center justify-center gap-2"
                                disabled={generating || Boolean(blockedReason)}
                                onClick={generateLink}
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Generating...
                                    </>
                                ) : (
                                    "Generate"
                                )}
                            </button>
                        ) : (
                            <button
                                className="btnPrimary flex items-center justify-center gap-2"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <>
                                        <CheckCheck size={14} /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} /> Copy Link
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    )
}
