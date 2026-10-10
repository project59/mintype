import { useEffect } from 'react';

const listeners = new Set();

export function reportSyncProgress({ total, completed, current = null }) {
    const progress = {
        total,
        completed,
        current,
        percentage: total ? Math.round((completed / total) * 100) : 0,
    };
    listeners.forEach((listener) => listener(progress));
}

export function useSyncProgress(callback) {
    useEffect(() => {
        listeners.add(callback);
        return () => listeners.delete(callback);
    }, [callback]);
}
