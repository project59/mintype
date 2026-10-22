import toast from "react-hot-toast";
import MarkdownImporter from "../../components/importing/MarkdownImporter.jsx";
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
            <div className="mb-4 max-w-xl">
                <h2 className='text-lg font-medium'>Import into Mintype</h2>
                <p className='textRegular'>
                    Import a Mintype export, an Obsidian vault or a Notion export. Your folders become pages and sub-pages.
                </p>
                <div className="flex gap-2 mt-4">
                    <NotionImportDialog onImportComplete={handleImportComplete} />

                    <MarkdownImporter onImportComplete={handleImportComplete} />
                </div>
            </div>
        </SettingsSkeleton>
    )
}