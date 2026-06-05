import { BiSun, BiMoon } from 'react-icons/bi';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setDarkMode } from '../features/ui/uiSlice';

const ThemeToggle = () => {
    const dispatch = useAppDispatch();
    const { theme } = useAppSelector(state => state.ui);
    const isDarkMode = theme.darkMode;

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <button
            onClick={() => dispatch(setDarkMode(!isDarkMode))}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
        >
            {isDarkMode ? <BiSun size={20} /> : <BiMoon size={20} />}
        </button>
    );
};

export default ThemeToggle;
