// PomodoroContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const PomodoroContext = createContext();

export function PomodoroProvider({ children }) {
    const [showTime, setShowTime] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(25 * 60);
    const [currentPhase, setCurrentPhase] = useState('work');
    const [sessionCount, setSessionCount] = useState(0); // Track which session we're in
    const [workDuration, setWorkDuration] = useState(25);
    const [shortBreakDuration, setShortBreakDuration] = useState(5);
    const [longBreakDuration, setLongBreakDuration] = useState(15);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    const intervalRef = useRef(null);

    // Request notification permission when notifications are enabled
    useEffect(() => {
        if (notificationsEnabled && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                    if (permission !== 'granted') {
                        setNotificationsEnabled(false);
                        toast.error('Notification permission denied');
                    }
                });
            } else if (Notification.permission === 'denied') {
                setNotificationsEnabled(false);
                toast.error('Notifications are blocked. Please enable them in your browser settings.');
            }
        }
    }, [notificationsEnabled]);

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const state = JSON.parse(saved);

                // Calculate time elapsed while app was closed
                if (state.isRunning && state.lastUpdate) {
                    const elapsed = Math.floor((Date.now() - state.lastUpdate) / 1000);
                    const newTimeRemaining = Math.max(0, state.timeRemaining - elapsed);
                    setTimeRemaining(newTimeRemaining);
                    
                    // If time ran out while closed, handle phase completion
                    if (newTimeRemaining === 0) {
                        setIsRunning(false);
                    }
                } else {
                    setTimeRemaining(state.timeRemaining);
                }

                setShowTime(state.showTime ?? true);
                setIsRunning(state.isRunning ?? false);
                setCurrentPhase(state.currentPhase ?? 'work');
                setSessionCount(state.sessionCount ?? 0);
                setWorkDuration(state.workDuration ?? 25);
                setShortBreakDuration(state.shortBreakDuration ?? 5);
                setLongBreakDuration(state.longBreakDuration ?? 15);
                setNotificationsEnabled(state.notificationsEnabled ?? false);
            } catch (e) {
                console.error('Failed to load pomodoro state:', e);
            }
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const state = {
            showTime,
            isRunning,
            timeRemaining,
            currentPhase,
            sessionCount,
            workDuration,
            shortBreakDuration,
            longBreakDuration,
            notificationsEnabled,
            lastUpdate: isRunning ? Date.now() : null,
        };
        localStorage.setItem('pomodoroState', JSON.stringify(state));
    }, [
        showTime,
        isRunning,
        timeRemaining,
        currentPhase,
        sessionCount,
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        notificationsEnabled,
    ]);

    // Timer effect
    useEffect(() => {
        if (isRunning) {
            if (intervalRef.current) clearInterval(intervalRef.current);

            intervalRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        setTimeout(() => handlePhaseComplete(), 0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning]);

    const handlePhaseComplete = () => {
        toast.success("Time's up!");
        setIsRunning(false);

        let nextPhase;
        let nextSessionCount = sessionCount;

        // Simple cycle: work -> short break -> work -> long break
        if (currentPhase === 'work') {
            nextSessionCount = sessionCount + 1;
            setSessionCount(nextSessionCount);
            // After first work session: short break
            // After second work session: long break, then reset
            nextPhase = nextSessionCount % 2 === 1 ? 'shortBreak' : 'longBreak';
            
            // Reset counter after long break
            if (nextPhase === 'longBreak') {
                nextSessionCount = 0;
                setSessionCount(0);
            }
        } else {
            // Any break -> back to work
            nextPhase = 'work';
        }

        setCurrentPhase(nextPhase);
        const durations = {
            work: workDuration * 60,
            shortBreak: shortBreakDuration * 60,
            longBreak: longBreakDuration * 60,
        };
        setTimeRemaining(durations[nextPhase]);

        // Show notification
        if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            const messages = {
                work: { title: 'Break Complete!', body: 'Ready to get back to work?' },
                shortBreak: { title: 'Work Complete!', body: 'Time for a short break!' },
                longBreak: { title: 'Work Complete!', body: 'Great job! Time for a long break!' },
            };
            const msg = messages[nextPhase];

            try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(msg.title, {
                            body: msg.body,
                            icon: '/favicon.svg',
                            badge: '/favicon.svg',
                            vibrate: [200, 100, 200],
                            tag: 'pomodoro-notification',
                            requireInteraction: false,
                        });
                    });
                } else {
                    new Notification(msg.title, { 
                        body: msg.body, 
                        icon: '/favicon.svg',
                        tag: 'pomodoro-notification',
                    });
                }
            } catch (error) {
                console.error('Failed to show notification:', error);
            }
        }
    };

    const value = {
        showTime,
        setShowTime,
        isRunning,
        setIsRunning,
        timeRemaining,
        setTimeRemaining,
        currentPhase,
        setCurrentPhase,
        sessionCount,
        setSessionCount,
        workDuration,
        setWorkDuration,
        shortBreakDuration,
        setShortBreakDuration,
        longBreakDuration,
        setLongBreakDuration,
        notificationsEnabled,
        setNotificationsEnabled,
        handlePhaseComplete,
    };

    return (
        <PomodoroContext.Provider value={value}>
            {children}
        </PomodoroContext.Provider>
    );
}

export function usePomodoro() {
    const context = useContext(PomodoroContext);
    if (!context) {
        throw new Error('usePomodoro must be used within PomodoroProvider');
    }
    return context;
}