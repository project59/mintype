import { FolderClosed } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function WorkspaceButton({ entry }) {
    const navigate = useNavigate();
    const { workspaceId } = useParams();

    return (
        <button key={entry.id} onClick={() => { navigate(`/workspace/${entry.rootId}`); }}>
            <div className={`flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-300/20 dark:hover:bg-indigo-800/20 text-sm  duration-200 ${workspaceId === entry.rootId ? 'bg-slate-300/40 dark:bg-indigo-800/30 text-black dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                <FolderClosed size={14} />
                <span className=' truncate'>
                    {entry.name}
                </span>
            </div>
        </button>
    )
}
