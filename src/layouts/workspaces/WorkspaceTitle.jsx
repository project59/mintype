import { Edit } from 'lucide-react';
import { useState } from 'react';

const WorkspaceTitle = ({ workspace, hasBg, allPages, formatDate, handleTitleChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(workspace.name);

    const handleEdit = () => {
        setIsEditing(true);
        setEditValue(workspace.name);
    };

    const handleConfirm = () => {
        handleTitleChange(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(workspace.name);
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div className="z-10">
            <div className="flex items-center gap-3 mb-2">
                {isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={handleConfirm}
                        className={`text-5xl font-bold ${hasBg ? 'text-white' : 'text-gray-800 dark:text-white'} bg-transparent border-b-2 border-blue-500 outline-none w-full`}
                        autoFocus
                    />
                ) : (
                    <>
                        <h1 className={`text-5xl font-bold ${hasBg ? 'text-white' : 'text-gray-800 dark:text-white'} mb-1`}>
                            {workspace.name}
                        </h1>
                        <button
                            onClick={handleEdit}
                            className="bg-indigo-500 text-white rounded-xl p-1.5 btnBase"
                            title="Edit workspace name"
                            aria-label="Edit workspace name"
                        >
                            <Edit size={14} />
                        </button>
                    </>
                )}
            </div>
            <div className={`flex flex-wrap items-center gap-1 text-sm ${hasBg ? 'text-white' : 'text-gray-800 dark:text-white'} font-medium`}>
                <span>{allPages.length} pages</span>
                <span className='text-xs'>-</span>
                <span>Created: {workspace.created ? formatDate(workspace.created) : 'Unknown'}</span>
            </div>
        </div>
    );
};

export default WorkspaceTitle;