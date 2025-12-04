import { useContext, useEffect } from "react";
import { useState } from "react";
import dbService from "../lib/dbService";
import { Link, useNavigate } from "react-router-dom";
import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import FunctionBar from "../components/common/FunctionBar";
import { ArrowRight } from "lucide-react";
import SidePanelSkeleton from "../components/skeletons/SidePanelSkeleton";
import SidePanelFooter from "../components/common/SidePanelFooter";
import PageHeaderWrapper from "../components/skeletons/PageHeaderWrapper";
import PageSectionWrapper from "../components/skeletons/PageSectionWrapper";
import { SecureContext } from "../layouts/secure-context/SecureContext";

export default function WorkspaceHome() {
    const [allWorkspaces, setAllWorkspaces] = useState([]);

    const { masterKey } = useContext(SecureContext);

    let [isOpen, setIsOpen] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [message, setMessage] = useState("");

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel('db-updates');
        const handleUpdate = () => {
            fetchWorkspaces(); // Refresh entries when notified
        };
        broadcastChannel.addEventListener('message', handleUpdate);
        return () => {
            broadcastChannel.removeEventListener('message', handleUpdate);
            broadcastChannel.close(); // Clean up
        };
    }, []);

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        const workspaces = await dbService.getAllRootEntries(masterKey);
        console.log("Fetched workspaces:", workspaces);
        // filter to only return those with parentId = null
        // const filteredWorkspaces = workspaces.filter(workspace => workspace.parentId === null);
        setAllWorkspaces(workspaces);
    };

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) {
            setMessage("Workspace name cannot be empty.");
            return;
        }
        if (newWorkspaceName.length > 50) {
            setMessage("Workspace name cannot exceed 50 characters.");
            return;
        }
        setMessage(""); // Clear any previous messages

        await dbService.addRootEntry(
            {
                id: null,
                newContent: {
                    name: newWorkspaceName,
                },
                password: masterKey,
            }
        )

        close(); // Close the dialog after creating the workspace
    }
    const pathname = window.location.pathname;

    const navigate = useNavigate();
    return (
        <main className="flex h-dvh">
            <SidePanelSkeleton>
                <div className="flex flex-col items-start gap-1 p-1 text-gray-700 dark:text-gray-400">
                    <button className={`${pathname === '/settings/profile' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/profile')}>
                        My Profile
                    </button>

                    <button className={`${pathname === '/settings/security' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/security')}>
                        Security and Recovery
                    </button>

                    <button className={`${pathname === '/settings/sync' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/sync')}>
                        Accounts and Sync
                    </button>

                    <button className={`${pathname === '/settings/import' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/import')}>
                        Import
                    </button>

                    <button className={`${pathname === '/settings/experimental' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/experimental')}>
                        Experimental
                    </button>
                </div>
                <SidePanelFooter />
            </SidePanelSkeleton>

            <div className="rightPane">
                <div className="sticky top-0 z-20 w-full bg-slate-100 dark:bg-[#10101e]">
                    <FunctionBar page={null} handleUndo={() => { }} handleRedo={() => { }} />
                </div>
                <PageHeaderWrapper>
                    <h1 className="text-5xl font-semibold text-black dark:text-white">Workspaces</h1>
                    <Button
                        onClick={open} className="btnPrimary w-fit" >
                        New Workspace
                    </Button>
                </PageHeaderWrapper>

                <PageSectionWrapper>
                    <div className="space-y-1">
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">My Workspaces</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 pb-2">
                            You have {allWorkspaces.length} workspaces.
                        </p>
                    </div>
                    <div className="text-black w-full space-y-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-4 pb-2">
                            {allWorkspaces.map(workspace => (
                                <Link to={`/workspace/${workspace.id}`} className="relative group w-full flex flex-col justify-between md:min-w-52 h-44 md:h-72 rounded-xl overflow-hidden"
                                    key={workspace.id}>
                                    {workspace.background ?
                                        (
                                            <div className="">
                                                <div className="absolute h-32 w-full bottom-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
                                                <img src={`${workspace.background}`} className="h-72 object-cover w-full" alt="" />
                                            </div>
                                        ) : (
                                            <div className="">
                                                <div className="absolute h-72 w-full bg-gray-900"></div>
                                                {/* <div className="absolute h-24 w-full bottom-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div> */}
                                            </div>
                                        )}
                                    <div className="flex justify-between items-end absolute bottom-0 left-0 right-0 p-3">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <h2 className="text-white font-semibold text-xl md:text-2xl">{workspace.name}</h2>
                                            <span className="text-xs text-gray-200">
                                                {new Date(workspace.created).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="w-10 h-10 hidden md:flex items-center justify-center bg-teal-200 rounded-full group-hover:translate-x-1 duration-200">
                                            <ArrowRight size={18} className="text-black" />
                                        </div>

                                    </div>
                                </Link>
                            ))}

                        </div>
                    </div>

                    <div className="text-black w-full md:max-w-sm space-y-1 mt-4">
                        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Helpful Links</h2>
                        <div className="flex flex-col justify-between bg-slate-50 dark:bg-slate-500/10 p-2 rounded-lg w-full">
                            <div className="pb-4">
                                <h4 className="font-semibold">Import</h4>
                                <p className="textRegular">
                                    Import your notes as MD or JSON files.
                                </p>
                            </div>
                            <Link to="/settings/import" className="btnChip w-fit">
                                Import Notes
                            </Link>
                        </div>
                        <div className="flex flex-col justify-between bg-slate-50 dark:bg-slate-500/10 p-2 rounded-lg w-full">
                            <div className="pb-4">
                                <h4 className="font-semibold">Syncing</h4>
                                <p className="textRegular">
                                    Connet Google Drive to sync your notes across devices.
                                </p>
                            </div>
                            <Link to="/settings/sync" className="btnChip w-fit">
                                Sync Settings
                            </Link>
                        </div>


                    </div>
                </PageSectionWrapper>
                <Dialog open={isOpen} as="div" className="relative z-20 focus:outline-none" onClose={close}>
                    <DialogBackdrop transition className="dialogBackdrop" />
                    <div className="dialogWrapper">
                        <DialogPanel
                            transition
                            className="dialogPanel"
                        >
                            <DialogTitle as="h3" className="text-base/7 font-medium text-black dark:text-white">
                                Create a new workspace
                            </DialogTitle>
                            <p>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Enter a name for your new workspace.
                                </span>
                            </p>

                            <div className="mt-2">
                                <input
                                    type="text"
                                    className="baseInput"
                                    placeholder="Workspace Name"
                                    value={newWorkspaceName}
                                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                                />
                            </div>

                            <div className="mt-4 flex justify-between">
                                <Button
                                    className="btnSecondary"
                                    onClick={close}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="btnPrimary"
                                    onClick={handleCreateWorkspace}
                                >
                                    Create
                                </Button>
                            </div>
                            {message && (
                                <p className="mt-2 text-red-500 text-sm">{message}</p>
                            )}
                        </DialogPanel>

                    </div>
                </Dialog>
            </div>
        </main>
    );
}
