import { useContext, useState } from 'react';
import FileUploader from './FileUploader';
import ImportPreview from './ImportPreview';
import { analyzeZipStructure, importSelectedPages } from './NotionImporter';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { nanoid } from 'nanoid';

const NotionImportManager = ({ onImportComplete }) => {
    const [importState, setImportState] = useState('idle'); // idle, analyzing, previewing, importing
    const [fileStructure, setFileStructure] = useState(null);
    const [importResults, setImportResults] = useState(null);
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    const handleFileUpload = async (file) => {
        try {
            setImportState('analyzing');
            setError(null);

            // first we create a new workspace for this import
            const newId = nanoid()
            await dbService.addRootEntry(
                {
                    id: newId,
                    newContent: {
                        name: 'New Notion Import',
                    },
                    password: masterKey,
                }
            )

            const structure = await analyzeZipStructure(file, true, newId);
            console.log(structure)
            setFileStructure(structure);
            setImportState('previewing');
        } catch (err) {
            setError(err.message);
            setImportState('idle');
        }
    };

    const handleImportConfirm = async (selectedPages) => {
        try {
            setImportState('importing');

            const results = await importSelectedPages(fileStructure, selectedPages, masterKey);

            setImportResults(results);
            setImportState('idle');

            if (onImportComplete) {
                onImportComplete(results);
            }
        } catch (err) {
            setError(err.message);
            setImportState('idle');
        }
    };

    const handleReset = () => {
        setImportState('idle');
        setFileStructure(null);
        setImportResults(null);
        setError(null);
    };

    return (
        <div className="space-y-2">
            <div className="textTitle flex justify-between items-center">
                Notion Import
                <div href="https://github.com/project59/mintype" className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                    beta
                </div>
            </div>
            <p className='textRegular'>A new workspace will be created for this import. You can move your files out from there later if you wish.</p>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                    <button onClick={handleReset}>Try Again</button>
                </div>
            )}

            <FileUploader onFileUpload={handleFileUpload} />

            {importState === 'analyzing' && (
                <div className="analyzing-state">
                    <div className="spinner"></div>
                    <p>Analyzing file structure...</p>
                </div>
            )}

            {importState === 'previewing' && fileStructure && (
                <ImportPreview
                    fileStructure={fileStructure}
                    onImport={handleImportConfirm}
                    onCancel={handleReset}
                />
            )}

            {importState === 'importing' && (
                <div className="importing-state">
                    <div className="spinner"></div>
                    <p>Importing pages...</p>
                </div>
            )}

            {importResults && (
                <div className="space-y-2 text-sm text-gray-500">
                    <h3>Import Complete!</h3>
                    <p className='textRegular'>Successfully imported {importResults.successCount} pages</p>
                    {importResults.errors.length > 0 && (
                        <div className="import-errors">
                            <p>Errors encountered:</p>
                            <ul>
                                {importResults.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <button className='btnPrimary' onClick={handleReset}>Import Another</button>
                </div>
            )}
        </div>
    );
};

export default NotionImportManager;