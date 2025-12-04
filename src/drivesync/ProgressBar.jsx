import { useState } from "react";
import { useSyncProgress } from "./GoogleDriveContext";

export default function ProgressBar() {
    const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });

    useSyncProgress(setProgress);

    if (progress.total === 0) return null;

    return (
        <div className="flex gap-2 items-center w-full max-w-md">
            <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                    className="bg-indigo-400 h-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {progress.percentage}%
            </span>
        </div>
    );
}