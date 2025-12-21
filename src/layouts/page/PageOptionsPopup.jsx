import { Ellipsis, Lock, Star } from "lucide-react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import CloudIndicator from "../../components/common/CloudIndicator.jsx";
import PagePreferences from "./PagePreferences.jsx";
import SharePageDialog from "../../components/quickshare/SharePageDialog.jsx";

export default function PageOptionsPopup({ page, setFavorite, setSensitive, updatePreferences, setWidth }) {
    const [savedToCloud, setSavedToCloud] = useState(false);
    const [showQuickShare, setShowQuickShare] = useState(false);

    useEffect(() => {
        const savedPage = page?.remoteFileId;
        if (savedPage) {
            setSavedToCloud(true);
        } else {
            setSavedToCloud(false);
        }
    }, [page]);

    return (
        <>
            <Popover className={"relative"}>
                <PopoverButton className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-400/20 hover:bg-slate-400/50 duration-200 dark:text-white text-black">
                    <Ellipsis size={12} />
                </PopoverButton>
                <PopoverPanel portal={true}
                    transition
                    anchor={{ to: 'bottom start', gap: '16px', padding: '16px' }}
                    className="text-sm z-50 bg-white dark:bg-slate-900 text-black rounded-xl p-4 min-w-72 shadow"
                >
                    <div className="flex flex-col gap-4 items-center text-sm text-gray-400">
                        {/* <div className="flex justify-between items-center w-full">
                            <div className='flex flex-col'>
                                <div className={'textLabel'}>Quick Share</div>
                                <span className='text-xs text-gray-400'>
                                    Share this page with a link
                                </span>
                            </div>
                            <CloseButton
                                onClick={() => setShowQuickShare(true)}
                                title="Share"
                                className="w-8 h-8  flex items-center justify-center duration-200 text-gray-300 bg-slate-300/30 rounded-[50px]"
                            >
                                <Share2 size={12} />
                            </CloseButton>
                        </div> */}
                        {page?.parentId !== 'quickNote' && (
                            <div className="flex justify-between items-center w-full">
                                <div className='flex flex-col'>
                                    <div className={'textLabel'}>Favorite</div>
                                    <span className='text-xs text-gray-400'>
                                        Add this page to your favorites
                                    </span>
                                </div>
                                <button className={`w-8 h-8  flex items-center justify-center duration-200 ${page?.isFavorite ? 'dark:text-yellow-200 text-yellow-400 bg-yellow-300/40 rounded-md' : 'text-gray-300 bg-slate-300/30 rounded-[50px]'}`} onClick={setFavorite}>
                                    <Star size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between items-center w-full">
                            <div className='flex flex-col'>
                                <div className={'textLabel'}>Mark Sensitive</div>
                                <span className='text-xs text-gray-400 w-48'>
                                    Password needed to view this page and it is excluded from search
                                </span>
                            </div>
                            <button className={`w-8 h-8  flex items-center justify-center duration-200 ${page?.sensitive ? 'dark:text-rose-200 text-rose-400 bg-rose-300/40 rounded-md' : 'text-gray-300 bg-slate-300/30 rounded-[50px]'}`} onClick={setSensitive}>
                                <Lock size={14} />
                            </button>
                        </div>
                        {page?.type === 'document' && (
                            <div className="flex justify-between items-center w-full">
                                <div className='flex flex-col'>
                                    <div className={'textLabel'}>Page Width</div>
                                    <span className='text-xs text-gray-400 capitalize'>
                                        {page?.documentWidth || 'Normal'}
                                    </span>
                                </div>
                                <div className="flex gap-1 text-xs">
                                    <button className={`w-6 h-6 rounded-l-md rounded-r-sm flex items-center justify-center duration-200 text-indigo-400 ${page?.documentWidth === 'normal' ? 'bg-indigo-500 text-white' : 'bg-indigo-400/20'}`} onClick={() => setWidth('normal')}>
                                        N
                                    </button>
                                    <button className={`w-6 h-6 rounded-sm flex items-center justify-center duration-200 text-indigo-400 ${page?.documentWidth === 'wide' ? 'bg-indigo-500 text-white' : 'bg-indigo-400/20'}`} onClick={() => setWidth('wide')}>
                                        W
                                    </button>
                                    <button className={`w-6 h-6 rounded-r-md rounded-l-sm flex items-center justify-center duration-200 text-indigo-400 ${page?.documentWidth === 'full' ? 'bg-indigo-500 text-white' : 'bg-indigo-400/20'}`} onClick={() => setWidth('full')}>
                                        F
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* <CloudIndicator savedToCloud={savedToCloud} /> */}
                        <PagePreferences pageId={page?.id} updatePreferences={updatePreferences} />
                    </div>
                </PopoverPanel>
            </Popover>

            <SharePageDialog isOpen={showQuickShare} onClose={
                () => setShowQuickShare(!showQuickShare)
            } />
        </>
    );
}