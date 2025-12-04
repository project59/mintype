import { Bolt, ChevronsLeft, Lock } from "lucide-react";
import ThemeToggleBtn from "../common/ThemeToggleBtn";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { SecureContext } from "../../layouts/secure-context/SecureContext";

export default function AppTitle({ closeNav, hideNavToggle = false }) {
    const navigate = useNavigate();
    const { handleLockApp } = useContext(SecureContext);


    return (
        <div className="flex items-center justify-between gap-2 p-2.5 h-12 text-sm font-medium z-10 bg-slate-100 dark:bg-[#10101E] sticky top-0">
            <div className='flex justify-between w-full px-1'>
                <div className='flex gap-2 text-lg font-semibold items-center text-black dark:text-white'>
                    <img src="/favicon.svg" className='h-4' alt="logo" />
                    Mintype
                </div>

                <div className='flex items-center gap-1'>
                    <button title="Lock App" className="bg-rose-400/20 h-6 w-6 flex items-center justify-center rounded-lg text-rose-400 dark:text-rose-200" onClick={handleLockApp}>
                        <Lock size={12} />
                    </button>
                    <button title="Settings" className="bg-slate-400/20 h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-200" onClick={() => navigate('/settings/profile')}>
                        <Bolt size={12} />
                    </button>
                    <ThemeToggleBtn />
                    {!hideNavToggle && <button title="Hide Sidebar" onClick={closeNav} className="bg-slate-400/20 h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-200" >
                        <ChevronsLeft size={12} />
                    </button>}
                </div>
            </div>
        </div>
    );
}