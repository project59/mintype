// Shared building blocks so every import dialog has the same layout: description, inputs,
// status, error, then Cancel on the left and the import action on the right.

export function ImportFileInput({ file, onFileChange, disabled }) {
    return (
        <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <span className="btnSecondary shrink-0">Choose ZIP</span>
            <span className="textRegular truncate">{file ? file.name : 'No file selected'}</span>
            <input
                type="file"
                accept=".zip"
                disabled={disabled}
                onChange={(event) => {
                    onFileChange(event.target.files[0] || null);
                    event.target.value = '';
                }}
                className="hidden"
            />
        </label>
    );
}

export function ImportError({ message }) {
    if (!message) return null;
    return (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {message}
        </p>
    );
}

export function ImportActions({ onCancel, onConfirm, canConfirm, isBusy, label = 'Import', busyLabel = 'Importing...' }) {
    return (
        <div className="flex justify-between gap-2">
            <button className="btnSecondary" onClick={onCancel} disabled={isBusy}>
                Cancel
            </button>
            <button className="btnPrimary" onClick={onConfirm} disabled={!canConfirm || isBusy}>
                {isBusy ? busyLabel : label}
            </button>
        </div>
    );
}
