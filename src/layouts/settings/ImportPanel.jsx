import toast from "react-hot-toast";
import MarkdownImporter from "../../components/importing/MarkdownImporter.jsx";
import MintypeImportDialog from "../../components/importing/MintypeImportDialog.jsx";
import NotionImportDialog from "../../components/importing/NotionImportDialog.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";
import { Link } from "react-router-dom";

export default function ImportPanel() {
    const handleImportComplete = ({ success, total, failures }) => {
        if (success > 0) toast.success(`Imported ${success} of ${total} pages`);
        if (failures.length > 0) {
            const names = failures.slice(0, 3).map((failure) => failure.name).join(', ');
            toast.error(`${failures.length} could not be imported: ${names}${failures.length > 3 ? ', ...' : ''}`);
        }
    };


    return (
        <SettingsSkeleton title="Import Notes">
            <div className="mb-4">
                <h2 className='text-lg font-medium'>Import into Mintype</h2>
                <p className='textRegular'>
                    We currently support importing from Notion, Markdown and Mintype JSON files.
                </p>
            <div className="flex gap-2 mt-4">
                <NotionImportDialog onImportComplete={handleImportComplete} />

                <MarkdownImporter onImportComplete={handleImportComplete} />
                
                <MintypeImportDialog onImportComplete={handleImportComplete} />
            </div>
            </div>
            <div>
                <h2 className='text-lg font-medium'>How do I export?</h2>
                <p className='textRegular'>
                    Workspaces can be exported to Mintype JSON or Markdown from the <Link className="text-indigo-400 underline" to={'/settings/export'}>Export</Link> settings page.
                </p>
            </div>
            <div>
                <h2 className='text-lg font-medium'>Multi-device Support?</h2>
                <p className='textRegular'>
                    There are two simple ways to access/move your notes between devices:
                    <br />
                    1. <strong>Online sync:</strong> If you have signed into Mintype and synced your notes to <Link className="text-indigo-400 underline" to={'/settings/sync'}>Google Drive</Link>, simply sign into your Mintype account on the new device and authorize Google Drive, then your notes will sync automatically between devices.
                    <br />
                    2. <strong>Offline only users:</strong> Export a JSON backup of each of your workspaces. Import them on the new device using the JSON importer above.
                </p>
            </div>
        </SettingsSkeleton>
    )
}