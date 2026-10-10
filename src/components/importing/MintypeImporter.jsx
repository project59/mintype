import { useContext, useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import { importMintypeZip } from './JSONImporter';
import { isZipFile } from './importUtils';
import { ImportActions, ImportError, ImportFileInput } from './ImportDialogParts';
import { SecureContext } from '../../layouts/secure-context/SecureContext';

const MintypeImporter = ({ onClose, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState(null);
    const { masterKey } = useContext(SecureContext);

    const handleFileChange = (selectedFile) => {
        setFile(isZipFile(selectedFile) ? selectedFile : null);
        setError(selectedFile && !isZipFile(selectedFile) ? 'Please select a ZIP file.' : null);
    };

    const handleImport = async () => {
        setIsImporting(true);
        setError(null);
        try {
            const results = await importMintypeZip(file, masterKey);
            onImportComplete?.(results);
            onClose();
        } catch (err) {
            console.error('Mintype import failed:', err);
            setError(err.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <DialogTitle className="textTitle">JSON (Mintype) Import</DialogTitle>
            <p className="textRegular">
                Upload a workspace ZIP exported from Mintype. It is imported as a new workspace.
            </p>
            <p className="infoBox">
                Exports are encrypted, so they can only be imported while Mintype is unlocked with the same keys they were exported from.
            </p>

            <ImportFileInput file={file} onFileChange={handleFileChange} disabled={isImporting} />
            <ImportError message={error} />
            <ImportActions onCancel={onClose} onConfirm={handleImport} canConfirm={!!file} isBusy={isImporting} />
        </>
    );
};

export default MintypeImporter;
