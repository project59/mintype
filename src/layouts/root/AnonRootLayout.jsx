import { Outlet } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.jsx';
import { PomodoroProvider } from '../../components/pomodoro/PomodoroContext.jsx';
import { UndoRedoProvider } from '../page/HistroyContext.jsx';
import { SidebarProvider } from './SidebarContext.jsx';

export default function AnonRootLayout() {

    return (
        <div className={`app`}>
            <DndProvider backend={HTML5Backend}>
                <UndoRedoProvider>
                    <PomodoroProvider>
                        <SupabaseAuthProvider>
                                    <SidebarProvider>
                                        <Outlet />
                                    </SidebarProvider>
                        </SupabaseAuthProvider>
                    </PomodoroProvider>
                </UndoRedoProvider>
            </DndProvider>
        </div>
    );
}