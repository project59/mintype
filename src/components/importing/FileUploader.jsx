import { Upload } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';

const FileUploader = ({ onFileUpload }) => {
    const fileInputRef = useRef(null);


    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
            toast.error('Please upload a ZIP file');
            return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB limit
            toast.error('File is too large. Please upload a file smaller than 100MB');
            return;
        }

        onFileUpload(file);
    };

    const onButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            <div className="space-y-3 text-sm text-gray-600">
                <div className='flex gap-2 items-center justify-between'>
                    <p className='infoBox'>
                        Please make sure that 'HTML', 'Include subpages' and 'Create folders for subpages' are selected in Notion export settings.
                    </p>
                    <div className="btnPrimary cursor-pointer" onClick={onButtonClick} >
                        <Upload size={14} />
                    </div>
                </div>
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