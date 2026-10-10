import { Outlet } from 'react-router-dom';
import { SupabaseAuthProvider } from '../auth/SupabaseAuthProvider.jsx';
import { PomodoroProvider } from '../../components/pomodoro/PomodoroContext.jsx';
import { SidebarProvider } from './SidebarContext.jsx';

export default function AnonRootLayout() {

    return (
        <div className={`app`}>
            <PomodoroProvider>
                <SupabaseAuthProvider>
                    <SidebarProvider>
                        <Outlet />
                    </SidebarProvider>
                </SupabaseAuthProvider>
            </PomodoroProvider>
        </div>
    );
}
