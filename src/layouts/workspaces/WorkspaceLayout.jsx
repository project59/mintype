import { Outlet } from 'react-router-dom';
import { QuillProvider } from '../../render/shared/RichTextToolbar.jsx';
import { CommentsProvider } from '../../render/whiteboard/contexts/CommentsContext.jsx';
import SidePanelSkeleton from '../../components/skeletons/SidePanelSkeleton.jsx';
import SidePanelFooter from '../../components/common/SidePanelFooter.jsx';
import FileStructureWithDnd from '../../components/common/FileStructure.jsx';

export default function WorkspaceLayout() {
    return (
        <main className="flex h-dvh">
            <QuillProvider>
                <CommentsProvider>
                    <SidePanelSkeleton>
                        <FileStructureWithDnd />
                        <SidePanelFooter />
                    </SidePanelSkeleton>
                    <div className="rightPane">
                        {/* TODO: only the id need be passed? */}
                        <Outlet />
                    </div>
                </CommentsProvider>
            </QuillProvider>
        </main>
    );
}