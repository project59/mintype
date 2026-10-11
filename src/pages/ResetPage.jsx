import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { resetDevice } from '../utils/resetDevice.js';

// A page of its own, outside the app's providers, so it opens no databases and works even when
// Mintype cannot unlock or load. Links to it are plain anchors: a full page load closes the app's
// database connections, which would otherwise hold up the deletion.

const ERASED = [
    'All notes, whiteboards and workspaces stored in this browser',
    'Changes that have not synced to Google Drive yet',
    'Your encryption keys on this device',
    'Your sign-in and Google Drive connection on this device',
    'Your settings',
];

const KEPT = [
    'Notes already synced to your Google Drive',
    'Your Mintype account and the encrypted copy of your keys saved in it',
    'Key files, recovery keys and exports you have downloaded',
];

export default function ResetPage() {
    const [confirmed, setConfirmed] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle' | 'erasing' | 'blocked' | 'done' | 'error'

    const erase = async () => {
        setStatus('erasing');
        try {
            await resetDevice({ onBlocked: () => setStatus('blocked') });
            setStatus('done');
        } catch (error) {
            console.error('Reset failed:', error);
            setStatus('error');
        }
    };

    const busy = status === 'erasing' || status === 'blocked';

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-[#10101e]">
            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#1f1f2d]">
                {status === 'done' ? (
                    <>
                        <h1 className="text-xl font-semibold">Mintype has been reset</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Everything Mintype stored in this browser has been erased. You can set it up again as a new user, or restore your existing notes as a returning user.
                        </p>
                        <a href="/workspace" className="btnPrimary w-fit">Set up Mintype</a>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <TriangleAlert size={20} className="shrink-0 text-rose-600 dark:text-rose-400" />
                            <h1 className="text-xl font-semibold">Reset this device</h1>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            This erases everything Mintype has stored in this browser and returns it to a brand-new state. Use it if you have forgotten your password and recovery key, Mintype will not unlock, or the app has stopped working.
                        </p>

                        <div className="text-sm">
                            <p className="mb-1 font-medium text-gray-900 dark:text-white">This erases:</p>
                            <ul className="list-disc space-y-0.5 pl-5 text-gray-600 dark:text-gray-400">
                                {ERASED.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                        </div>
                        <div className="text-sm">
                            <p className="mb-1 font-medium text-gray-900 dark:text-white">This does not erase:</p>
                            <ul className="list-disc space-y-0.5 pl-5 text-gray-600 dark:text-gray-400">
                                {KEPT.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                        </div>

                        <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
                            Close any other Mintype tabs or windows first. If you can still unlock Mintype, export a backup or let sync finish before you reset.
                        </p>

                        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={confirmed}
                                disabled={busy}
                                onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            I understand that notes stored only on this device will be lost and cannot be recovered.
                        </label>

                        {status === 'blocked' && (
                            <p className="text-sm text-rose-600 dark:text-rose-400">Waiting for other Mintype tabs to close. Close them and the reset will finish.</p>
                        )}
                        {status === 'error' && (
                            <p className="text-sm text-rose-600 dark:text-rose-400">The reset could not finish. Close other Mintype tabs and try again.</p>
                        )}

                        <div className="flex justify-between">
                            <a href="/workspace" className="btnSecondary">Cancel</a>
                            <button className="btnDestructive" disabled={!confirmed || busy} onClick={erase}>
                                {busy ? 'Erasing…' : 'Erase everything'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
