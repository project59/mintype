import { Moon } from "lucide-react";
import { setTheme, useTheme } from "../../utils/theme";

export default function ThemeToggleBtn() {
    const theme = useTheme();

    return (
        <button title="Theme Toggle" className={`bg-blue-400/20 h-6 w-6 flex items-center justify-center ${theme === 'dark' ? 'rounded-lg' : 'rounded-full'} text-blue-400 dark:text-blue-200`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Moon size={12} />
        </button>
    );
}
