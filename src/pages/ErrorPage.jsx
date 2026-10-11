import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

// Shown when a route fails to render, with a way out if the problem is data stored on this device.
export default function ErrorPage() {
    const error = useRouteError();
    const notFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-[#10101e]">
            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-[#1f1f2d]">
                {notFound ? (
                    <>
                        <h1 className="text-xl font-semibold">Page not found</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">There is nothing at this address.</p>
                        <a href="/workspace" className="btnPrimary w-fit">Go to your workspaces</a>
                    </>
                ) : (
                    <>
                        <h1 className="text-xl font-semibold">Something went wrong</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Mintype ran into a problem. Reloading usually fixes it. If it keeps happening, the data stored in this browser may be damaged, and resetting this device will start Mintype fresh.
                        </p>
                        {error?.message && (
                            <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">{error.message}</pre>
                        )}
                        <div className="flex justify-between">
                            <a href="/reset" className="btnSecondary">Reset this device</a>
                            <button className="btnPrimary" onClick={() => window.location.reload()}>Reload</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
