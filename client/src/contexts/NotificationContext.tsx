import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type NotificationType = 'info' | 'success' | 'error';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter(n => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType = 'info', duration: number = 4000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newNotification: Notification = { id, message, type };

        setNotifications((prev) => [...prev, newNotification]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    const getIcon = (type: NotificationType): React.ReactNode => {
        switch (type) {
            case 'success': return <CheckCircle size={18} style={{ color: 'var(--success)' }} />;
            case 'error': return <AlertCircle size={18} style={{ color: 'var(--error)' }} />;
            default: return <Info size={18} style={{ color: 'var(--text-primary)' }} />;
        }
    };

    const getBgColor = (type: NotificationType): string => {
        switch (type) {
            case 'success': return 'var(--success-bg)';
            case 'error': return 'var(--error-bg)';
            default: return 'var(--glass-bg)';
        }
    };

    const getBorderColor = (type: NotificationType): string => {
        switch (type) {
            case 'success': return 'var(--success)';
            case 'error': return 'var(--error)';
            default: return 'var(--glass-border)';
        }
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}

            <div style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 9999,
                pointerEvents: 'none', // pass clicks through container
            }}>
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className="glass-panel animate-fade-in-up"
                        style={{
                            pointerEvents: 'auto',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: getBgColor(n.type),
                            border: `1px solid ${getBorderColor(n.type)}`,
                            minWidth: '300px',
                            maxWidth: '90vw',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div style={{ flexShrink: 0 }}>{getIcon(n.type)}</div>
                        <span style={{
                            flex: 1,
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            color: n.type === 'error' ? 'var(--error)' : n.type === 'success' ? 'var(--success)' : 'var(--text-primary)'
                        }}>
                            {n.message}
                        </span>
                        <button
                            onClick={() => removeNotification(n.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
