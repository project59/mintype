import toast from "react-hot-toast";
import MarkdownImporter from "../../components/importing/MarkdownImporter.jsx";
import MintypeImportDialog from "../../components/importing/MintypeImportDialog.jsx";
import NotionImportDialog from "../../components/importing/NotionImportDialog.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";
import { Link } from "react-router-dom";

export default function ImportPanel() {
    const handleImportComplete = (results) => {
        console.log('Import completed:', results);
        toast.success(`Successfully imported ${results.success} of ${results.total} files`);

        if (results.failures.length > 0) {
            toast.error('Failed files:', results.failures);
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
                
                <MintypeImportDialog />
            </div>
            </div>
            <div>
                <h2 className='text-lg font-medium'>How do I export?</h2>
                <p className='textRegular'>
                    Your workspaces can be exported from the workspace home page. You can export to Markdown and JSON formats.
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