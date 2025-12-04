import { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, Field, Label, Switch } from '@headlessui/react';
import { usePomodoro } from './PomodoroContext';
import { FastForward, Pause, Play, RotateCcw, Soup, Timer, TreeDeciduous, X } from 'lucide-react';

export default function PomodoroTimer() {
    // Timer states
    const [isOpen, setIsOpen] = useState(false);
    const {
        showTime,
        setShowTime,
        isRunning,
        setIsRunning,
        timeRemaining,
        setTimeRemaining,
        currentPhase,
        workDuration,
        setWorkDuration,
        shortBreakDuration,
        setShortBreakDuration,
        longBreakDuration,
        setLongBreakDuration,
        notificationsEnabled,
        setNotificationsEnabled,
        handlePhaseComplete,
    } = usePomodoro();

    // Permission state
    const [notificationPermission, setNotificationPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    // Phase configurations
    const phaseConfig = {
        work: {
            color: 'bg-sky-400',
            textColor: 'text-sky-500',
            borderColor: 'border-sky-500',
            hoverColor: 'hover:bg-sky-600',
            label: 'Work',
            duration: workDuration * 60,
        },
        shortBreak: {
            color: 'bg-green-400',
            textColor: 'text-green-500',
            borderColor: 'border-green-500',
            hoverColor: 'hover:bg-green-600',
            label: 'Short Break',
            duration: shortBreakDuration * 60,
        },
        longBreak: {
            color: 'bg-blue-400',
            textColor: 'text-blue-500',
            borderColor: 'border-blue-500',
            hoverColor: 'hover:bg-blue-600',
            label: 'Long Break',
            duration: longBreakDuration * 60,
        },
    };

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Request notification permission
    const requestNotificationPermission = async () => {
        if (typeof Notification === 'undefined') {
            alert('Notifications are not supported in this browser');
            return;
        }

        if (Notification.permission === 'granted') {
            setNotificationPermission('granted');
            return;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    // Control functions
    const handleStart = () => {
        setIsRunning(true);
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleCancel = () => {
        setIsRunning(false);
        setTimeRemaining(phaseConfig[currentPhase].duration);
    };

    // Update duration when settings change
    useEffect(() => {
        if (!isRunning) {
            setTimeRemaining(phaseConfig[currentPhase].duration);
        }
    }, [workDuration, shortBreakDuration, longBreakDuration, currentPhase]);

    const currentConfig = phaseConfig[currentPhase];

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`bg-slate-200 dark:bg-slate-400/20 hover:bg-slate-400/30 dark:hover:bg-slate-400/30 duration-200 text-black dark:text-white font-semibold h-7 px-2 min-w-6 flex items-center justify-center rounded-full`}
            >
                <div className={`flex items-center gap-1 text-sm ${isRunning ? currentConfig.textColor : ''}`}>
                    {currentPhase === 'work' ? <Timer size={14} /> : currentPhase === 'shortBreak' ? <Soup size={14} /> : <TreeDeciduous size={14} />}
                    
                    {!showTime && (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatTime(timeRemaining)}</span>
                    )}
                </div>
            </button>

            {/* Dialog */}
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                className="relative z-50"
            >
                <DialogBackdrop transition className="dialogBackdrop" />
                <div className="dialogWrapper">
                    <DialogPanel transition className="dialogPanel">
                        {/* Header */}
                        {/* Current Timer Display */}
                        <div className="flex justify-between items-start">
                            <div className={`text-7xl font-semibold dark:text-emerald-300 text-indigo-400`}>
                                {formatTime(timeRemaining)}
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex gap-1">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    className="btnPrimary"
                                >
                                    <Play size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={handlePause}
                                    className="btnPrimary"
                                >
                                    <Pause size={14} />
                                </button>
                            )}
                            <button
                                onClick={handleCancel}
                                className="btnSecondary"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button
                                onClick={handlePhaseComplete}
                                className="btnSecondary"
                            >
                                <FastForward size={14} />
                            </button>
                        </div>

                        <h3 className="textTitle pt-3">Timer Settings</h3>

                        <div className="w-full flex gap-6">
                            <div className="flex flex-col gap-1 w-1/2">
                                {/* Work Duration */}
                                <div className='flex justify-between'>
                                    <label className="textRegular flex items-center gap-1">
                                        <Timer size={14} />
                                        Work Duration
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="120"
                                        value={workDuration}
                                        onChange={(e) => setWorkDuration(parseInt(e.target.value) || 1)}
                                        disabled={isRunning}
                                        className="smallInput w-10"
                                    />
                                </div>

                                {/* Short Break Duration */}
                                <div className='flex justify-between'>
                                    <label className="textRegular textRegular flex items-center gap-1">
                                        <Soup size={14} />
                                        Short Break
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={shortBreakDuration}
                                        onChange={(e) => setShortBreakDuration(parseInt(e.target.value) || 1)}
                                        disabled={isRunning}
                                        className="smallInput w-10"
                                    />
                                </div>

                                {/* Long Break Duration */}
                                <div className='flex justify-between'>
                                    <label className="textRegular textRegular flex items-center gap-1">
                                        <TreeDeciduous size={14} />
                                        Long Break
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={longBreakDuration}
                                        onChange={(e) => setLongBreakDuration(parseInt(e.target.value) || 1)}
                                        disabled={isRunning}
                                        className="smallInput w-10"
                                    />
                                </div>
                            </div>
                            {/* Notifications Toggle */}
                            <div className="flex flex-col w-1/2 gap-1">
                                <Field className="flex justify-between items-center">
                                    <Label className={'textRegular'}>Show Push</Label>
                                    <Switch
                                        checked={notificationsEnabled}
                                        onChange={(enabled) => {
                                            if (enabled && notificationPermission !== 'granted') {
                                                requestNotificationPermission().then(() => {
                                                    if (notificationPermission === 'granted') {
                                                        setNotificationsEnabled(true);
                                                    }
                                                });
                                            } else {
                                                setNotificationsEnabled(enabled);
                                            }
                                        }}
                                        className="switchGroup group"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="switchSpan"
                                        />
                                    </Switch>
                                </Field>

                                <Field className="flex justify-between items-center">
                                    <Label className={'textRegular'}>Hide Time</Label>
                                    <Switch
                                        checked={showTime}
                                        onChange={(enabled) => setShowTime(enabled)}
                                        className="switchGroup group"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="switchSpan"
                                        />
                                    </Switch>
                                </Field>
                            </div>
                        </div>
                        {notificationPermission === 'denied' && (
                            <p className="text-xs text-red-600 mt-1">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}