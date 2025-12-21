import { Button, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useState } from 'react'
import NotionImportManager from './NotionImportManager';
import ZipImportComponent from './MintypeImporter';

export default function MintypeImportDialog() {
    let [isOpen, setIsOpen] = useState(false)

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
                className="btnPrimary"
            >
                Mintype JSON
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={close}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <ZipImportComponent onClose={() => setIsOpen(false)} />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
