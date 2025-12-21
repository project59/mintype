import React, { useContext, useEffect, useState } from 'react';
import { JSONImporter } from './JSONImporter';
import { X } from 'lucide-react';
import dbService from '../../lib/dbService';
import { SecureContext } from '../../layouts/secure-context/SecureContext';
import { DialogTitle } from '@headlessui/react';
import toast from 'react-hot-toast';

const ZipImportComponent = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);
    const [importResults, setImportResults] = useState(null);
    const [mode, setMode] = useState('import_upload'); // 'import_type' | 'import_upload'
    const [isImportEncrypted, setIsImportEncrypted] = useState(false);
    const { masterKey } = useContext(SecureContext)

    const handleFileSelect = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile && selectedFile.type === 'application/zip') {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please select a valid ZIP file');
            setFile(null);
        }
    };

    const analyzeFile = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const results = await JSONImporter(file, null, masterKey);
            console.log('Import results:', results);
            setImportResults(results);
            // TODO: better success and error handling needed
            toast.success(`Successfully imported`);

            // if (results.failures.length > 0) {
            //     toast.error('Failed files:', results.failures);
            // }
        } catch (err) {
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <>
            {mode === 'import_type' && (
                <>
                    <DialogTitle className="textTitle flex justify-between items-center">
                        JSON (Mintype) Import
                        <div href="https://github.com/project59/mintype" className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                            beta
                        </div>
                    </DialogTitle>
                    <p className='textRegular'>
                        Please select if your notes are encrypted or not to proceed with the import.
                    </p>
                    {/* radio options for encrypted or not encrypted */}
                    <div className="space-y-2">
                        <div>
                            <label className="inline-flex items-center">
                                <input
                                    type="radio"
                                    className="form-radio"
                                    name="importType"
                                    value="not_encrypted"
                                    checked={!isImportEncrypted}
                                    onChange={() => { setIsImportEncrypted(false); }}
                                />
                                <span className="ml-2 textLabel">Not Encrypted</span>
                            </label>
                        </div>
                        <div>
                            <label className="inline-flex items-center">
                                <input
                                    disabled
                                    type="radio"
                                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                                    name="importType"
                                    value="encrypted"
                                    checked={isImportEncrypted}
                                    onChange={() => { setIsImportEncrypted(true); }}
                                />
                                <span className="ml-2 textLabel">Encrypted (coming soon) </span>
                            </label>
                        </div>
                    </div>
                    <div className='w-full flex justify-between'>
                        <button className='btnSecondary' onClick={onClose}>
                            Cancel
                        </button>
                        <button className='btnPrimary' onClick={() => { setMode('import_upload'); }}>
                            Next
                        </button>
                    </div>
                </>
            )}

            {mode === 'import_upload' && (
                <>
                    <div className="textTitle flex justify-between items-center">
                        Upload ZIP
                        <div href="https://github.com/project59/mintype" className="text-xs rounded-full h-6 bg-blue-500 p-1 px-1.5 text-white font-medium">
                            beta
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="textRegular">
                            Upload a ZIP file containing your mintype-data.json and page JSON files.
                        </p>
                        {/* {importId && ( */}
                        <div className="flex justify-between items-center">
                            <input
                                id="zip-upload"
                                type="file"
                                accept=".zip"
                                onChange={handleFileSelect}
                                className=" w-full"
                            />
                        </div>
                        {/* )} */}
                    </div>


                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex">
                                <X className="h-5 w-5 text-red-400" />
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => setMode('import_type')}
                            className="btnSecondary invisible"
                        >
                            Back
                        </button>
                        <div className='flex gap-2'>
                            <button
                                onClick={analyzeFile}
                                disabled={!file || isAnalyzing}
                                className="btnPrimary"
                            >
                                {isAnalyzing ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default ZipImportComponent;