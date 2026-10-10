import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { useContext } from 'react';
import dbService from '../../lib/dbService.js';
import { ChevronDownIcon } from 'lucide-react';
import { SecureContext } from '../secure-context/SecureContext.jsx';

export default function PageExportOptions({ pageId, markdown, type }) {
    const { masterKey } = useContext(SecureContext);

    const exportToJSON = async () => {
        await dbService.getContent(pageId, masterKey).then((page) => {
            const json = JSON.stringify(page, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${pageId}.json`;
            link.click();
            URL.revokeObjectURL(url);
        })
    };

    const exportToMarkdown = () => {
        const blob = new Blob([markdown || ''], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pageId}.md`;
        link.click();
        URL.revokeObjectURL(url);
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
                            Export this page as JSON
                        </p>
                        <button className='btnAction' onClick={exportToJSON}>
                            Export
                        </button>
                    </div>
                    {type === 'document' && (
                        <div className='flex justify-between items-center mt-2'>
                            <p className='text-xs'>
                                Export this page as Markdown
                            </p>
                            <button className='btnAction' onClick={exportToMarkdown}>
                                Export
                            </button>
                        </div>
                    )}
                </DisclosurePanel>
            </Disclosure>


        </div>
    );
}
