import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Input } from '@headlessui/react'
import { Share2, Loader2, Copy, CheckCheck, Star } from 'lucide-react'
import { useContext, useEffect, useState } from 'react'
import { useSupabaseAuth } from '../../layouts/auth/SupabaseAuthProvider.jsx'
import { useParams } from 'react-router-dom'
import dbService from '../../lib/dbService'
import { SecureContext } from '../../layouts/secure-context/SecureContext.jsx'

export default function SharePageDialog({isOpen, onClose}) {
    const { pageId } = useParams()
    const { user, accessToken } = useSupabaseAuth()
    const [generating, setGenerating] = useState(false)
    const [link, setLink] = useState("")
    const [copied, setCopied] = useState(false)
    const [message, setMessage] = useState("")
    const { masterKey } = useContext(SecureContext)

    const fetchPage = async () => {
        const page = await dbService.getEntry(pageId, masterKey);
        return page;
    };

    useEffect(() => {
        setLink("");
        setMessage("");
        setGenerating(false);
        setCopied(false);
    }, [pageId]);

    const handleCopy = () => {
        if (!link) return
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const generateLink = async () => {
        if (generating || link) return
        setGenerating(true)

        if (!user) {
            setMessage('You must be logged in to generate a link.')
            setGenerating(false)
            return
        }

        try {
            const page = await fetchPage();
            if (!page) {
                setMessage("Page not found")
                setGenerating(false)
                return
            }
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/create-quicksharepage`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ page: page, pageId: pageId }),
                }
            )

            const data = await res.json()
            if (res.ok && data?.id) {
                setLink(`${import.meta.env.VITE_FRONTEND_URL}/quickshare/${data.id}`)
            } else {
                console.error("Failed to generate link", data)
            }
        } catch (error) {
            console.error("Error:", error)
            setMessage("An error occurred while generating the link.")
        }

        setGenerating(false)
    }

    return (
        <>
            <Dialog open={isOpen} onClose={onClose} className="relative z-20 focus:outline-none">
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle as="h3" className="text-lg font-medium text-black">
                            Quick Share
                        </DialogTitle>
                        <p className="my-2 text-sm text-gray-400">
                            Generate a sharable link for this page. The link will be valid for 24 hours.
                        </p>

                        <Input
                            className="baseInput"
                            type="text"
                            value={link}
                            readOnly
                            placeholder="No link yet"
                        />
                        <p className="mt-2 text-sm text-red-400">
                            {message}
                        </p>

                        <div className="flex justify-between w-full mt-2">
                            <button className="btnSecondary" onClick={onClose}>
                                Close
                            </button>

                            {!link ? (
                                <button
                                    className="btnPrimary flex items-center justify-center gap-2"
                                    disabled={generating || !user}
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
        </>
    )
}
