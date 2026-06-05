import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    React.useEffect(() => {
        if (isHovered) return;

        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isHovered, toast.id, onRemove]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 min-w-[200px] ${
                toast.type === 'success'
                    ? 'bg-green-500/90 border-green-400 text-white'
                    : toast.type === 'error'
                    ? 'bg-primary/90 border-red-400 text-white'
                    : 'bg-gray-800/90 border-gray-700 text-white'
            }`}>
                <span className="text-sm font-medium">{toast.message}</span>
                <button
                    onClick={() => onRemove(toast.id)}
                    className="ml-auto hover:opacity-70"
                >
                    ✕
                </button>
            </div>
        </motion.div>
    );
};

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-24 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
