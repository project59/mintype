import { Moon } from "lucide-react";
import { useState } from "react";

export default function ThemeToggleBtn() {
    const initialTheme = localStorage.getItem('themePreference') || 'light';
    document.documentElement.classList.add(initialTheme);
    const [themePreference, setThemePreference] = useState(initialTheme);

    const handleThemeChange = () => {
        if (themePreference === 'light') {
            setThemePreference('dark');
            // set it in local storage
            localStorage.setItem('themePreference', 'dark');
            // add dark to the html
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
            // set html background color to black
            document.documentElement.style.backgroundColor = '#10101e';
        } else {
            setThemePreference('light');
            // set it in local storage
            localStorage.setItem('themePreference', 'light');
            // remove dark from the html
            document.documentElement.classList.remove('dark');
            document.documentElement.style.backgroundColor = '#ffffff';

        }
    }
    return (
        <button title="Theme Toggle" className={`bg-blue-400/20 h-6 w-6 flex items-center justify-center ${themePreference === 'dark' ? 'rounded-lg' : 'rounded-full'} text-blue-400 dark:text-blue-200`} onClick={handleThemeChange}>
            <Moon size={12} />
        </button>
    );
}