import { Button, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useState } from 'react'
import MintypeImporter from './MintypeImporter';

export default function MintypeImportDialog({ onImportComplete }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="btnPrimary"
            >
                Mintype JSON
            </Button>

            <Dialog open={isOpen} className="relative z-20 focus:outline-none" onClose={() => setIsOpen(false)}>
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel
                        transition
                        className="dialogPanel"
                    >
                        <MintypeImporter onClose={() => setIsOpen(false)} onImportComplete={onImportComplete} />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}
