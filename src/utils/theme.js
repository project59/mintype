import { useSyncExternalStore } from 'react';

// The theme is a device preference kept outside the encrypted store, so it can apply before
// unlock. public/theme-init.js applies it on load; keep the key and colors in sync with it.
const STORAGE_KEY = 'themePreference';
const BACKGROUNDS = { light: '#ffffff', dark: '#10101e' };

const getTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export const setTheme = (theme) => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.backgroundColor = BACKGROUNDS[theme];
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        console.error('Failed to save theme preference:', error);
    }
};

const subscribe = (onChange) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
};

export const useTheme = () => useSyncExternalStore(subscribe, getTheme);
