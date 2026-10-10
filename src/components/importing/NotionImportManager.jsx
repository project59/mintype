import { useContext, useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import ImportPreview from './ImportPreview';
import { analyzeZipStructure, importSelectedPages } from './NotionImporter';
import { isZipFile } from './importUtils';
import { ImportActions, ImportError, ImportFileInput } from './ImportDialogParts';
import { SecureContext } from '../../layouts/secure-context/SecureContext';

const MAX_ZIP_SIZE = 100 * 1024 * 1024;

const NotionImportManager = ({ onClose, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [importState, setImportState] = useState('idle'); // idle, analyzing, previewing, importing
    const [fileStructure, setFileStructure] = useState(null);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    const handleFileChange = (selectedFile) => {
        setFile(null);
        if (!selectedFile) return setError(null);
        if (!isZipFile(selectedFile)) return setError('Please select a ZIP file.');
        if (selectedFile.size > MAX_ZIP_SIZE) return setError('File is too large. Please upload a ZIP smaller than 100MB.');
        setError(null);
        setFile(selectedFile);
    };

    const handleAnalyze = async () => {
        try {
            setImportState('analyzing');
            setError(null);
            const structure = await analyzeZipStructure(file);
            setFileStructure(structure);
            setSelectedPages(new Set(structure.pages.map((page) => page.id)));
            setImportState('previewing');
        } catch (err) {
            setError(err.message);
            setImportState('idle');
        }
    };

    const handleImport = async () => {
        try {
            setImportState('importing');
            setError(null);
            const results = await importSelectedPages(fileStructure, Array.from(selectedPages), masterKey);
            onImportComplete?.(results);
            onClose();
        } catch (err) {
            setError(err.message);
            setImportState('previewing');
        }
    };

    const isPreview = importState === 'previewing' || importState === 'importing';

    return (
        <>
            <DialogTitle className="textTitle">Notion Import</DialogTitle>
            <p className="textRegular">
                Upload a ZIP exported from Notion. A new workspace will be created for the import.
            </p>

            {isPreview ? (
                <ImportPreview
                    fileStructure={fileStructure}
                    selectedPages={selectedPages}
                    setSelectedPages={setSelectedPages}
                />
            ) : (
                <>
                    <p className="infoBox">
                        In Notion's export settings, select 'HTML', 'Include subpages' and 'Create folders for subpages'.
                    </p>
                    <ImportFileInput file={file} onFileChange={handleFileChange} disabled={importState === 'analyzing'} />
                </>
            )}

            <ImportError message={error} />
            {isPreview ? (
                <ImportActions
                    onCancel={onClose}
                    onConfirm={handleImport}
                    canConfirm={selectedPages.size > 0}
                    isBusy={importState === 'importing'}
                    label={`Import ${selectedPages.size} Page${selectedPages.size !== 1 ? 's' : ''}`}
                />
            ) : (
                <ImportActions
                    onCancel={onClose}
                    onConfirm={handleAnalyze}
                    canConfirm={!!file}
                    isBusy={importState === 'analyzing'}
                    label="Next"
                    busyLabel="Reading ZIP..."
                />
            )}
        </>
    );
};

export default NotionImportManager;
