import { Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';

const FileUploader = ({ onFileUpload }) => {
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
            alert('Please upload a ZIP file');
            return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            alert('File is too large. Please upload a file smaller than 100MB');
            return;
        }

        onFileUpload(file);
    };

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className={`max-w-xl border border-dashed bg-gray-50 p-4 rounded-xl hover:bg-blue-50 ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
        >
            <div className="space-y-3 text-sm text-gray-600">
                <div className="rounded-xl bg-emerald-200 w-fit p-2">
                    <Upload size={40} />
                </div>
                <p className="upload-text">
                    Drop your Notion export ZIP file here, or click to browse. For now, you can only upload page exports with subpages from Notion, not whole workspace exports.
                </p>
                <p className='p-1 text-red-600 bg-red-100 rounded-lg w-fit px-2 text-xs'>
                    Please make sure 'Inlucde subpages' and 'Create folders for subpages' are checked in the export settings.
                </p>
                <p className="upload-subtext">
                    Maximum file size: 100MB
                </p>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleChange}
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default FileUploader;