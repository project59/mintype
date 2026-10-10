// gapi rejects with its raw response ({ status, result: { error } }) rather than an Error.
export const driveErrorStatus = (error) => error?.status ?? error?.result?.error?.code;

const driveErrorReason = (error) => error?.reason ?? error?.result?.error?.errors?.[0]?.reason;

// The Drive metadata file exists but this device's master key cannot decrypt it: the account's
// notes were encrypted with another key (e.g. this device was set up again instead of restored).
export const DRIVE_KEY_MISMATCH = 'DRIVE_KEY_MISMATCH';

export const isDriveNotFound = (error) => [404, 410].includes(driveErrorStatus(error));

const RETRYABLE_REASONS = new Set(['rateLimitExceeded', 'userRateLimitExceeded', 'backendError']);

// Rate limits arrive as 429 or as 403 with a rate-limit reason; a plain 403 is a permission error.
export function isRetryableDriveError(error) {
    const status = driveErrorStatus(error);
    if (status === 429 || status >= 500) return true;
    return status === 403 && RETRYABLE_REASONS.has(driveErrorReason(error));
}

export function toDriveError(error) {
    if (error instanceof Error) return error;
    const status = driveErrorStatus(error);
    const driveError = new Error(error?.result?.error?.message || `Drive request failed (${status ?? 'network error'})`);
    driveError.status = status;
    driveError.reason = driveErrorReason(error);
    return driveError;
}
