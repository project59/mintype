import React, { useEffect, useState } from 'react';
import FileUploader from './FileUploader';
import ImportPreview from './ImportPreview';
import { analyzeZipStructure, importSelectedPages } from './NotionImporter';
import dbService from '../../lib/dbService';

const NotionImportManager = ({ onImportComplete }) => {
    const [importState, setImportState] = useState('idle'); // idle, analyzing, previewing, importing
    const [fileStructure, setFileStructure] = useState(null);
    const [importResults, setImportResults] = useState(null);
    const [error, setError] = useState(null);
    const [roots, setRoots] = useState([]);
    const [importId, setImportId] = useState(null);


    const getRootIds = async () => {
        const roots = await dbService.getAllRootEntries();
        setRoots(roots);
    }

    useEffect(() => {
        getRootIds();
    }, [])

    const handleFileUpload = async (file) => {
        try {
            setImportState('analyzing');
            setError(null);

            const structure = await analyzeZipStructure(file, true, importId);

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

            const results = await importSelectedPages(fileStructure, selectedPages);

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
        <div className="space-y-4">


            {/* show all the worskpaces as buttons, clicking them sets the import workspaceId */}
            <div className=''>
                <h2 className='text-lg font-medium'>Select Workspace</h2>
                <p className='text-sm text-gray-500'>Click on the workspace you want to import into</p>
                <div className="mt-2 flex flex-wrap gap-1">
                    {roots.map((workspace) => (
                        <button className={`btnRound ${workspace.id === importId ? '!bg-blue-500 !text-white !font-semibold' : ''}`} key={workspace.id} onClick={() => setImportId(workspace.id)}>
                            {workspace.name}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                    <button onClick={handleReset}>Try Again</button>
                </div>
            )}

            {importState === 'idle' && importId && (
                <FileUploader onFileUpload={handleFileUpload} />
            )}

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
                    importId={importId}
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
                    <p>Successfully imported {importResults.successCount} pages</p>
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