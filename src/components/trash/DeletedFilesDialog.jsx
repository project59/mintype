import { Button, Dialog, DialogBackdrop, DialogPanel, DialogTitle, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useEffect, useState } from 'react'
import { FolderOutput, Trash } from 'lucide-react';
import dbService from '../../lib/dbService';

export default function DeletedFilesDialog() {
    let [isOpen, setIsOpen] = useState(false)
    const [deletedFiles, setDeletedFiles] = useState([]);

    const getDeletedFiles = async () => {
        const deletedFiles = await dbService.getDeletedFiles();
        setDeletedFiles(deletedFiles);
    }

    const restoreDeleteFile = async (id, rootId) => {
        await dbService.restoreTrashedFile(id, rootId);
        await getDeletedFiles();
    }

    const deletePermanently = async (id) => {
        await dbService.deleteEntry({ id, addToQueue: true });
        await getDeletedFiles();
    }

    useEffect(() => {
        getDeletedFiles();
    }, [isOpen])

    function open() {
        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
    }

    return (
        <>
            <Button
                onClick={open}
                className="hover:bg-indigo-400/10 duration-200 text-xs flex p-2 rounded-lg items-center w-full justify-between"
            >
                Trash
                <Trash size={12} />
            </Button>

            <Dialog open={isOpen} className="relative z-50" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <DialogTitle as="h3" className="textTitle">
                            Your trashed files
                        </DialogTitle>
                        <p className="textRegular">
                            Permanently deleting files will remove them from your workspace and Google Drive.
                        </p>
                        <div className='flex flex-col gap-2'>
                            {deletedFiles.map((file) => {
                                return (
                                    <div key={file.id} className='flex items-center justify-between bg-slate-50 dark:bg-slate-500/20 p-2 text-sm rounded-lg'>
                                        <div className='flex flex-col gap-1'>
                                            <span className='textLabel'>{file.name}</span>
                                            <span className='textRegular !text-xs'>Workspace ID: {file.rootId}</span>
                                        </div>
                                        <div className='flex gap-1'>

                                            <button className='btnChip h-6' title='Restore' onClick={() => restoreDeleteFile(file.id, file.rootId)}>
                                                <FolderOutput size={12} />
                                            </button>
                                            {/* <button className='btnDestructiveSm' title='Delete permanently' onClick={() => deletePermanently(file.id)}>
                                            <Trash size={12} />
                                        </button> */}
                                            <Popover>
                                                <PopoverButton className="btnDestructiveSm">
                                                    <Trash size={12} />
                                                </PopoverButton>
                                                <PopoverPanel
                                                    transition
                                                    anchor={{ to: 'bottom', gap: '14px', padding: '16px' }}
                                                    className="rounded-xl bg-white dark:bg-zinc-900 shadow transition duration-200 ease-in-out data-[closed]:-translate-y-1 data-[closed]:opacity-0 w-52 p-3"
                                                >
                                                    <p className='textRegular pb-2'>Are you sure you want to permanently delete this file?</p>
                                                    <button className='btnDestructiveSm' title='Delete permanently' onClick={() => deletePermanently(file.id)}>
                                                        Confirm 
                                                    </button>
                                                </PopoverPanel>
                                            </Popover>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {/* if empty */}
                        {deletedFiles.length === 0 && <p className='textRegular'>You have no trashed files</p>}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
