import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useContext } from 'react';
import dbService from '../../lib/dbService.js';
import { ChevronDownIcon } from 'lucide-react';
import { SecureContext } from '../secure-context/SecureContext.jsx';
import { safeFileName, WHITEBOARD_EXTENSION } from '../../components/exporting/archiveFormat.js';
import { downloadBlob } from '../../components/exporting/markdownExport.js';

// Exports the page in the form a workspace export stores it: documents as Markdown (the
// editor's current text, which may be newer than the saved copy), whiteboards as JSON.
export default function PageExportOptions({ pageId, name, markdown, type }) {
    const { masterKey } = useContext(SecureContext);
    const isWhiteboard = type === 'whiteboard';

    const exportPage = async () => {
        const fileName = safeFileName(name);
        if (isWhiteboard) {
            const content = await dbService.getContent(pageId, masterKey);
            downloadBlob(new Blob([JSON.stringify(content)], { type: 'application/json' }), `${fileName}${WHITEBOARD_EXTENSION}`);
        } else {
            downloadBlob(new Blob([markdown || ''], { type: 'text/markdown;charset=utf-8' }), `${fileName}.md`);
        }
    };

    return (
        <div className="w-full space-y-4">
            <Disclosure as="div" className="" defaultOpen={false}>
                <DisclosureButton className="group flex w-full items-center justify-between">
                    <span className="textLabel">
                        Page Export Options
                    </span>
                    <ChevronDownIcon className="size-5 group-data-[open]:rotate-180 duration-200" />
                </DisclosureButton>
                <DisclosurePanel className="mt-2">
                    <div className='flex justify-between items-center'>
                        <p className='text-xs'>
                            {isWhiteboard ? 'Export this whiteboard as JSON (.whiteboard.json)' : 'Export this page as Markdown'}
                        </p>
                        <button className='btnAction' onClick={exportPage}>
                            Export
                        </button>
                    </div>
                </DisclosurePanel>
            </Disclosure>


        </div>
    );
}
