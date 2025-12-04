import { Menu } from "lucide-react";
import AppTitle from "./AppTitle";
import { Dialog, DialogPanel } from "@headlessui/react";
import { useSidebar } from "../../layouts/root/SidebarContext";

export default function SidePanelSkeleton({ children }) {
    const { isDrawerOpen, setIsDrawerOpen, isNavOpen, setIsNavOpen } = useSidebar();

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsDrawerOpen(true)}
                className="fixed top-1.5 left-2 z-50 p-2 md:hidden"
            >
                <Menu size={20} className="text-gray-900 dark:text-white" />
            </button>

            {/* Desktop Side Panel */}
            <div className={`hidden ${isNavOpen ? 'md:flex w-[20%]' : 'md:hidden'} flex-col pb-1 no-printme overflow-auto bg-slate-100 dark:bg-[#10101E]`}>
                <AppTitle closeNav={() => setIsNavOpen(false)} />
                <div className="p-2 flex-1 flex flex-col justify-between">
                    {children}
                </div>
            </div>

            {/* Mobile Drawer */}
            <Dialog
                open={isDrawerOpen}
                onClose={setIsDrawerOpen}
                className="relative z-50 md:hidden"
            >
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

                <div className="fixed inset-0 flex">
                    <DialogPanel className="w-80 max-w-[80vw] transform transition-transform duration-300 ease-in-out bg-slate-100 dark:bg-[#10101E] overflow-auto">
                        <AppTitle hideNavToggle />
                        <div className="p-2 flex-1 flex flex-col justify-between">
                            {children}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}