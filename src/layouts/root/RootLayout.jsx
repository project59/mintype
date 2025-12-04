import { Outlet } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.jsx';
import { PomodoroProvider } from '../../components/pomodoro/PomodoroContext.jsx';
import { UndoRedoProvider } from '../page/HistroyContext.jsx';
import SecureProvider from '../secure-context/SecureContext.jsx';
import { SidebarProvider } from './SidebarContext.jsx';
import { GoogleDriveProvider } from '../../drivesync/GoogleDriveContext.jsx';
import { SyncProvider } from '../../drivesync/SyncProvider.jsx';
import { useEffect } from 'react';
import { OnlineStatusProvider } from './OnlineStatusContext.jsx';

export default function RootLayout() {
    useEffect(() => {
        localStorage.setItem('pullComplete', false);
    })

    return (
        <div className={`app`}>
            <OnlineStatusProvider>
                <DndProvider backend={HTML5Backend}>
                    <SecureProvider>
                        <UndoRedoProvider>
                            <PomodoroProvider>
                                <SupabaseAuthProvider>
                                    <GoogleDriveProvider>
                                        <SyncProvider autoSyncEnabled={true} syncInterval={30000} maxRetriesPerHour={120}>
                                            <SidebarProvider>
                                                <Outlet />
                                            </SidebarProvider>
                                        </SyncProvider>
                                    </GoogleDriveProvider>
                                </SupabaseAuthProvider>
                            </PomodoroProvider>
                        </UndoRedoProvider>
                    </SecureProvider>
                </DndProvider>
            </OnlineStatusProvider>
        </div>
    );
}