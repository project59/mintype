import { useEffect, useState } from "react";
import dbService from "../../lib/dbService.js"
import syncService from "../../lib/syncService.js";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

export default function ExperimentalSettings() {
    const [syncQueue, setSyncQueue] = useState([]);
    const [notes, setNotes] = useState([]);
    const wipeSyncQueue = async () => {
        await dbService.clearSyncQueue();
    }

    const wipeNotes = async () => {
        await dbService.clearNotes();
    }

    const getAllEntries = async () => {
        const operations = await syncService.getAllOperations();
        setSyncQueue(operations);
    }

    const getAllNotes = async () => {
        const notes = await dbService.getAllEntries();
        setNotes(notes);
    }

    useEffect(() => {
        getAllEntries();
        getAllNotes();
    }, [])

    return (
        <SettingsSkeleton title="Experimental">
            <p className="textRegular max-w-md">
                    These are experimental features available during the open beta. Use at your own risk.
                </p>
            <div className="space-y-3 text-gray-400 mb-4">
                <h2 className="textTitle">
                    Clear the Sync Queue
                </h2>
                <p className="textRegular max-w-md">
                    This will clear the sync queue of all pending operations. This will not delete your notes, but it will remove any operations that are currently in the queue from being processed into Google Drive.
                </p>

                <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <p className="text-sm">{syncQueue.length} operations in queue</p>
                </div>
                {/* current queue */}
                {syncQueue.length > 0 && (
                    <div className="max-h-64 overflow-auto space-y-1">
                        {syncQueue.map((operation, index) => (
                            <div key={index} className="text-xs">
                                <p className="font-medium">ID: {operation.id}</p>
                                <div className="flex gap-1 text-indigo-400">
                                    <p>Operation: {operation.operation}</p>
                                    <p>at</p>
                                    <p>
                                        {new Date(operation.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button className="btnPrimary" onClick={wipeSyncQueue}>Clear Sync Queue</button>
            </div>

            <div className="space-y-3 text-gray-400">
                <h2 className="textTitle">
                    Delete All Local Notes
                </h2>
                <p className="textRegular max-w-md">
                    This will delete all notes from Mintype local storage! This will not delete your notes from Google Drive. This action cannot be undone. Any notes that have not been synced to Google Drive or exported will be lost and cannot be recovered.
                </p>

                <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <p className="text-sm">{notes.length} notes in storage</p>
                </div>
                <button className="btnPrimary" onClick={wipeNotes}>Erase Notes</button>
            </div>
        </SettingsSkeleton>
    )
}