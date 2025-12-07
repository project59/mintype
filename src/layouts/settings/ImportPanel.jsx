import MintypeImportDialog from "../../components/importing/MintypeImportDialog.jsx";
import NotionImportDialog from "../../components/importing/NotionImportDialog.jsx";
import SettingsSkeleton from "./SettingsSkeleton.jsx";

export default function ImportPanel() {

    const handleImportComplete = (results) => {
        console.log('Import completed:', results);
    };


    return (
        <SettingsSkeleton title="Import Notes">
            <div className="mb-4">
                <h2 className='text-lg font-medium'>Import into Mintype</h2>
                <p className='text-sm text-gray-400'>
                    We currently support importing from Notion and also Mintype JSON files. More support coming soon, such as Markdown files.
                </p>
            </div>
            <div className="flex gap-2">
                <NotionImportDialog onImportComplete={handleImportComplete} />

                <MintypeImportDialog />
            </div>
        </SettingsSkeleton>
    )
}