import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowDown, Check, Cloud, CloudOff, Loader, X } from "lucide-react";
import { useGoogleDrive } from "./GoogleDriveContext.jsx";
import { useEffect, useState } from "react";
import syncService from "../lib/syncService.js";
import { Link } from "react-router-dom";
import { useSync } from "./SyncProvider.jsx";
import { useOnlineStatus } from "../layouts/root/OnlineStatusContext.jsx";
import ProgressBar from './ProgressBar.jsx'

export default function DriveSyncPopup() {
    const { canSync } = useGoogleDrive();

    const [syncQueueLength, setSyncQueueLength] = useState(0);
    const [isOpen, setIsOpen] = useState(false)
    const { syncFiles, syncStatus, pullStatus, pullRemoteState } = useSync();

    const getSyncQueueLength = async () => {
        const queue = await syncService.getAllOperations();
        setSyncQueueLength(queue.length);
    };

    useEffect(() => {
        getSyncQueueLength();
    }, [isOpen]);

    const isOnline = useOnlineStatus();

    if (!isOnline) {
        return (
            <>
                <Button
                    onClick={() => setIsOpen(true)} className={`btnBase rounded-full h-7 w-8 bg-orange-400 hover:bg-orange-500`}>
                    <div className={`rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold`}>
                        <CloudOff className="!text-white" size={14} />
                    </div>
                </Button>
                <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-20 focus:outline-none">
                    <DialogBackdrop transition className="dialogBackdrop" />
                    <div className="dialogWrapper text-gray-400 text-sm">
                        <DialogPanel transition className="dialogPanel">
                            <DialogTitle as="h3" className="textTitle">
                                Google Drive Sync
                            </DialogTitle>
                            <div className="textRegular">
                                You are offline. Please check your internet connection and try again.
                            </div>
                        </DialogPanel>
                    </div>
                </Dialog >
            </>
        );
    }

    return (
        <div>
            <Button
                onClick={() => setIsOpen(true)} className={`btnBase rounded-full h-7 ${pullStatus === 'pulling' ? 'w-16' : 'w-8'}
                    ${pullStatus === 'pulling' ? '!bg-emerald-500 hover:!bg-emerald-400' : 'bg-indigo-500 hover:bg-indigo-400'} 
                ${syncStatus === 'syncing' ? 'bg-blue-500 hover:bg-blue-400' :
                        syncStatus === 'error' ? 'bg-red-500 hover:bg-red-400' : 'bg-indigo-500 hover:bg-indigo-400'}  text-white`}>
                <div className={`rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}>
                    {syncStatus === 'syncing' ? (<Loader size={12} className="animate-spin" />) : syncStatus === 'success' ? (<Check size={12} />) : syncStatus === 'error' ? (<X size={12} />) : pullStatus === 'pulling' ? (<div className="flex gap-1 items-center"> <ArrowDown size={12} /> Syncing </div>) : (<Cloud size={14} />)}
                </div>
            </Button>
            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-20 focus:outline-none">
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper text-gray-400 text-sm">
                    <DialogPanel transition className="dialogPanel">
                        <DialogTitle as="h3" className="textTitle">
                            Google Drive Sync
                        </DialogTitle>
                        <div className="flex items-center gap-3">
                            <div className="text-black dark:text-white text-5xl font-medium">
                                {syncQueueLength}
                            </div>
                            <div className="text-black dark:text-white text-lg">
                                <p className="">Changes Pending Sync</p>
                                <div className="textRegular">
                                    Auto-sync runs every 30 seconds
                                </div>
                            </div>
                        </div>
                        {canSync ? (
                            <div className="flex flex-col">
                                <p className="textLabel">Status</p>
                                <div className="textRegular flex flex-col capitalize">
                                    <div>
                                        Push: {syncStatus}
                                    </div>
                                    <div>
                                        Pull: {pullStatus}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <p className="font-semibold text-black dark:text-white">Status</p>
                                <div className="text-sm text-gray-500">
                                    Allow Google Drive Access in Settings
                                </div>
                            </div>
                        )}
                        <ProgressBar />
                        <div className="flex gap-2">
                            <Link to="/settings/sync" className="btnSecondary">
                                Settings
                            </Link>
                            <button title="Pull Files" disabled={!canSync} onClick={pullRemoteState} className="btnPrimary w-full flex items-center justify-center gap-2">
                                Force Pull
                            </button>
                            <button title="Pull Files" disabled={!canSync} onClick={syncFiles} className="btnPrimary w-full flex items-center justify-center gap-2">
                                Force Push
                            </button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </div>
    )
}