import { useState, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Image, X } from 'lucide-react';
import Workspace from '../../pages/Workspace.jsx';

export default function BackgroundCover({ imageUrl, updateBackground, children }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
    const fileInputRef = useRef(null);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlChange = (event) => {
        const url = event.target.value;
        setUrlInput(url);
        if (url) {
            setPreviewUrl(url);
        }
    };

    const handleUpdateBackground = () => {
        if (previewUrl) {
            updateBackground(previewUrl);
            handleCloseDialog();
        }
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setPreviewUrl('');
        setUrlInput('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClearBackground = () => {
        updateBackground(null);
        handleCloseDialog();
    };

    return (
        <>
            <div
                className="relative w-full h-72 bg-slate-100 dark:bg-[#10101e] bg-cover bg-center bg-no-repeat overflow-hidden rounded-t-2xl "
                style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : 'none' }}
            >
                <div className='flex h-full w-full items-end justify-start max-w-screen-lg mx-auto px-4 py-4'>
                    {children}
                </div>
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-zinc-800 text-white rounded-xl p-1.5 top-2 absolute right-2 z-10"
                    title='Update Background'
                >
                    <Image size={14} />
                </button>
                <div className={`absolute w-full h-full top-0 left-0 dark:bg-gradient-to-t ${imageUrl ? 'bg-gradient-to-t from-black/30' : ''} dark:from-black/30`}></div>
            </div>

            <Dialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                className="relative z-50"
            >
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle className="textTitle">
                            Update Background
                        </DialogTitle>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => setUploadMethod('upload')}
                                className={`w-full ${uploadMethod === 'upload'
                                    ? 'btnPrimary'
                                    : 'btnSecondary'
                                    }`}
                            >
                                Upload File
                            </button>
                            <button
                                onClick={() => setUploadMethod('url')}
                                className={`w-full ${uploadMethod === 'url'
                                    ? 'btnPrimary'
                                    : 'btnSecondary'
                                    }`}
                            >
                                Paste URL
                            </button>
                        </div>

                        {/* Upload Method */}
                        {uploadMethod === 'upload' && (
                            <div className='space-y-2'>
                                <label className="textLabel">
                                    Choose Image File
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                        )}

                        {/* URL Method */}
                        {uploadMethod === 'url' && (
                            <div className='space-y-2'>
                                <label className="textLabel">
                                    Image URL
                                </label>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={handleUrlChange}
                                    placeholder="https://example.com/image.jpg"
                                    className="baseInput"
                                />
                            </div>
                        )}

                        {/* Preview */}
                        {previewUrl && (
                            <div className='space-y-2'>
                                <label className="textLabel">
                                    Preview
                                </label>
                                <div className="w-full h-32 bg-gray-100 rounded-md overflow-hidden">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={() => setPreviewUrl('')}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between">
                            <div className='flex gap-1'>
                                <button
                                    onClick={handleCloseDialog}
                                    className="btnSecondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearBackground}
                                    className="btnSecondary"
                                >
                                    Clear
                                </button>
                            </div>
                            <button
                                onClick={handleUpdateBackground}
                                disabled={!previewUrl}
                                className="btnPrimary"
                            >
                                Update
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}