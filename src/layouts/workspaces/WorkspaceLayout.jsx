import { Outlet } from 'react-router-dom';
import { EditorProvider } from '../../render/editor/EditorContext.jsx';
import SidePanelSkeleton from '../../components/skeletons/SidePanelSkeleton.jsx';
import SidePanelFooter from '../../components/common/SidePanelFooter.jsx';
import FileStructureWithDnd from '../../components/common/FileStructure.jsx';

export default function WorkspaceLayout() {
    return (
        <main className="flex h-dvh">
            <EditorProvider>
                <SidePanelSkeleton>
                    <FileStructureWithDnd />
                    <SidePanelFooter />
                </SidePanelSkeleton>
                <div className="rightPane">
                    <Outlet />
                </div>
            </EditorProvider>
        </main>
    );
}
