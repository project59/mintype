import { Outlet } from 'react-router-dom';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.jsx';
import { PomodoroProvider } from '../../components/pomodoro/PomodoroContext.jsx';
import SecureProvider from '../secure-context/SecureContext.jsx';
import { SidebarProvider } from './SidebarContext.jsx';
import { GoogleDriveProvider } from '../../drivesync/GoogleDriveContext.jsx';
import { SyncProvider } from '../../drivesync/SyncProvider.jsx';
import { OnlineStatusProvider } from './OnlineStatusContext.jsx';

export default function RootLayout() {
    return (
        <div className={`app`}>
            <OnlineStatusProvider>
                <SupabaseAuthProvider>
                    <SecureProvider>
                        <PomodoroProvider>
                            <GoogleDriveProvider>
                                <SyncProvider autoSyncEnabled={true} syncInterval={30000}>
                                    <SidebarProvider>
                                        <Outlet />
                                    </SidebarProvider>
                                </SyncProvider>
                            </GoogleDriveProvider>
                        </PomodoroProvider>
                    </SecureProvider>
                </SupabaseAuthProvider>
            </OnlineStatusProvider>
        </div>
    );
}
