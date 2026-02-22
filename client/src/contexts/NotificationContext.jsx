import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newNotification = { id, message, type };

        setNotifications((prev) => [...prev, newNotification]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter(n => n.id !== id));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={18} style={{ color: 'var(--success)' }} />;
            case 'error': return <AlertCircle size={18} style={{ color: 'var(--error)' }} />;
            default: return <Info size={18} style={{ color: 'var(--text-primary)' }} />;
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'success': return 'var(--success-bg)';
            case 'error': return 'var(--error-bg)';
            default: return 'var(--glass-bg)';
        }
    };

    const getBorderColor = (type) => {
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
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
