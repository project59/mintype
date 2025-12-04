import { Outlet } from "react-router-dom";
import SidePanelSkeleton from "../../components/skeletons/SidePanelSkeleton.jsx";
import FunctionBar from "../../components/common/FunctionBar.jsx";
import SidePanelFooter from "../../components/common/SidePanelFooter.jsx";

export default function ProfileLayout() {
    return (
        <main className="flex h-dvh">
            <SidePanelSkeleton>
                <div className="p-1">
                    Profile
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