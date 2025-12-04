import { FileCheck, FileWarning } from "lucide-react";

export default function CloudIndicator({ savedToCloud }) {
    return (
        <div className="flex justify-between items-center w-full">
            <div className='flex flex-col'>
                <div className={'textLabel'}>Cloud Save</div>
                <span className='text-xs text-gray-400'>
                    {savedToCloud ? "This page is saved on your Google Drive" : "This file is local only"}
                </span>
            </div>
            <div className={`w-8 h-8  flex items-center justify-center duration-200 ${savedToCloud ? 'dark:text-blue-200 text-blue-400 bg-blue-300/40 rounded-md' : 'text-blue-300 bg-blue-300/30 rounded-[50px]'}`} title={savedToCloud ? "Saved to cloud" : "Not saved to cloud"}>
                {savedToCloud ? <FileCheck size={14} /> : <FileWarning size={14} />}
            </div>
        </div>

    )
}