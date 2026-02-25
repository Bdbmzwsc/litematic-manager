import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import type { ConfirmOptions } from '../types';

interface DialogState {
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    variant: 'danger' | 'warning' | 'default';
    icon: React.ReactNode;
}

interface ConfirmContextType {
    confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = (): ((options?: ConfirmOptions) => Promise<boolean>) => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context.confirm;
};

interface ConfirmProviderProps {
    children: React.ReactNode;
}

/**
 * ConfirmProvider
 * 
 * Provides a `useConfirm()` hook that returns a Promise-based confirm function.
 * 
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *       title: 'Delete Schematic?',
 *       description: 'This action cannot be undone.',
 *       confirmLabel: 'Delete',
 *       variant: 'danger',  // 'danger' | 'warning' | 'default'
 *   });
 *   if (ok) { ... }
 */
export const ConfirmProvider: React.FC<ConfirmProviderProps> = ({ children }) => {
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog({
                title: options.title || '您确定吗？',
                description: options.description || '此操作无法撤销。',
                confirmLabel: options.confirmLabel || '确认',
                cancelLabel: options.cancelLabel || '取消',
                variant: options.variant || 'danger',
                icon: options.icon || null,
            });
        });
    }, []);

    const handleConfirm = () => {
        resolverRef.current?.(true);
        setDialog(null);
    };

    const handleCancel = () => {
        resolverRef.current?.(false);
        setDialog(null);
    };

    const getAccentColor = (variant: string): string => {
        switch (variant) {
            case 'danger': return 'var(--error)';
            case 'warning': return '#f59e0b';
            default: return 'var(--text-primary)';
        }
    };

    const getIconBg = (variant: string): string => {
        switch (variant) {
            case 'danger': return 'var(--error-bg)';
            case 'warning': return 'rgba(245, 158, 11, 0.15)';
            default: return 'var(--glass-bg)';
        }
    };

    const getDefaultIcon = (variant: string): React.ReactNode => {
        switch (variant) {
            case 'danger': return <Trash2 size={28} />;
            case 'warning': return <AlertTriangle size={28} />;
            default: return <AlertTriangle size={28} />;
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            {dialog && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.55)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={handleCancel}
                >
                    <div
                        className="glass-panel animate-fade-in-up"
                        style={{
                            padding: '2rem',
                            maxWidth: '420px',
                            width: '90%',
                            textAlign: 'center',
                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCancel}
                            aria-label="Close dialog"
                            style={{
                                position: 'absolute', top: '1rem', right: '1rem',
                                background: 'transparent', border: 'none',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                                display: 'flex', padding: '0.25rem',
                                borderRadius: 'var(--radius-sm)',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                            <X size={18} />
                        </button>

                        {/* Icon */}
                        <div style={{
                            display: 'inline-flex',
                            padding: '1rem',
                            background: getIconBg(dialog.variant),
                            borderRadius: '50%',
                            color: getAccentColor(dialog.variant),
                            marginBottom: '1.25rem',
                        }}>
                            {dialog.icon || getDefaultIcon(dialog.variant)}
                        </div>

                        {/* Title */}
                        <h3 id="confirm-dialog-title" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                            {dialog.title}
                        </h3>

                        {/* Description */}
                        {dialog.description && (
                            <p style={{
                                color: 'var(--text-secondary)',
                                marginBottom: '1.75rem',
                                lineHeight: 1.6,
                                fontSize: '0.95rem',
                            }}>
                                {dialog.description}
                            </p>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                className="glass-button secondary"
                                onClick={handleCancel}
                                style={{ flex: 1 }}
                            >
                                {dialog.cancelLabel}
                            </button>
                            <button
                                className="glass-button"
                                onClick={handleConfirm}
                                style={{
                                    flex: 1,
                                    background: getAccentColor(dialog.variant),
                                    color: 'white',
                                    border: `1px solid ${getAccentColor(dialog.variant)}`,
                                }}
                            >
                                {dialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
