import { Outlet, useNavigate } from "react-router-dom";
import FunctionBar from "../../components/common/FunctionBar.jsx";
import SidePanelFooter from "../../components/common/SidePanelFooter.jsx";
import SidePanelSkeleton from "../../components/skeletons/SidePanelSkeleton.jsx";

export default function SettingsLayout() {
    const navigate = useNavigate();
    const pathname = window.location.pathname;

    return (
        <main className="flex h-dvh">
            <SidePanelSkeleton>
                <div className="flex flex-col items-start gap-1 p-1 text-gray-700 dark:text-gray-400">
                    <button className={`${pathname === '/settings/profile' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/profile')}>
                        My Profile
                    </button>

                    <button className={`${pathname === '/settings/security' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/security')}>
                        Security and Recovery
                    </button>

                    <button className={`${pathname === '/settings/sync' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/sync')}>
                        Accounts and Sync
                    </button>

                    <button className={`${pathname === '/settings/import' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/import')}>
                        Import
                    </button>

                    <button className={`${pathname === '/settings/experimental' ? 'font-semibold text-black dark:text-white bg-slate-400/10' : ''} w-full py-1.5 px-2 rounded-md text-left text-sm`} onClick={() => navigate('/settings/experimental')}>
                        Experimental
                    </button>
                </div>
                <SidePanelFooter />
            </SidePanelSkeleton>
            <div className="rightPane">
                <div className="sticky top-0 z-20 w-full bg-slate-100 dark:bg-[#10101e]">
                    <FunctionBar page={null} handleUndo={() => { }} handleRedo={() => { }} />
                </div>
                <Outlet />
            </div>
        </main>
    );
}