import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    IconButton
} from '@mui/material';
import {
    CheckCircleOutline as SuccessIcon,
    ErrorOutline as ErrorIcon,
    WarningAmber as WarningIcon,
    InfoOutlined as InfoIcon,
    Close as CloseIcon
} from '@mui/icons-material';

const NotificationContext = createContext(null);

// Snackbar 样式配置
const severityConfig = {
    success: {
        bgcolor: 'rgba(46, 125, 50, 0.95)',
        icon: SuccessIcon,
    },
    error: {
        bgcolor: 'rgba(211, 47, 47, 0.95)',
        icon: ErrorIcon,
    },
    warning: {
        bgcolor: 'rgba(237, 108, 2, 0.95)',
        icon: WarningIcon,
    },
    info: {
        bgcolor: 'rgba(2, 136, 209, 0.95)',
        icon: InfoIcon,
    },
};

export const NotificationProvider = ({ children }) => {
    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        confirmText: '确认',
        cancelText: '取消',
    });
    const confirmResolveRef = useRef(null);

    // showSnackbar
    const showSnackbar = useCallback((message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleSnackbarClose = useCallback((_, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar(prev => ({ ...prev, open: false }));
    }, []);

    // showConfirm — returns Promise<boolean>
    const showConfirm = useCallback(({ title = '确认', message = '', confirmText = '确认', cancelText = '取消' } = {}) => {
        return new Promise((resolve) => {
            confirmResolveRef.current = resolve;
            setConfirmDialog({ open: true, title, message, confirmText, cancelText });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        confirmResolveRef.current?.(true);
        confirmResolveRef.current = null;
    }, []);

    const handleCancel = useCallback(() => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        confirmResolveRef.current?.(false);
        confirmResolveRef.current = null;
    }, []);

    const config = severityConfig[snackbar.severity] || severityConfig.info;
    const SeverityIcon = config.icon;

    return (
        <NotificationContext.Provider value={{ showSnackbar, showConfirm }}>
            {children}

            {/* 全局 Snackbar 提示 */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        pl: 2.5,
                        pr: 1,
                        py: 1.2,
                        borderRadius: 3,
                        bgcolor: config.bgcolor,
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
                        backdropFilter: 'blur(12px)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                        maxWidth: 480,
                    }}
                >
                    <SeverityIcon sx={{ fontSize: '1.3rem', flexShrink: 0 }} />
                    <Box sx={{ flex: 1, mr: 0.5 }}>{snackbar.message}</Box>
                    <IconButton
                        size="small"
                        onClick={handleSnackbarClose}
                        sx={{
                            color: 'rgba(255,255,255,0.7)',
                            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' },
                            flexShrink: 0,
                        }}
                    >
                        <CloseIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                </Box>
            </Snackbar>

            {/* 全局确认对话框 */}
            <Dialog
                open={confirmDialog.open}
                onClose={handleCancel}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                    }
                }}
            >
                <DialogTitle sx={{
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    pb: 0.5,
                    pt: 2.5,
                    px: 3,
                }}>
                    {confirmDialog.title}
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 1 }}>
                    <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                        {confirmDialog.message}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={handleCancel}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 2.5,
                            fontWeight: 500,
                            color: 'text.secondary',
                        }}
                    >
                        {confirmDialog.cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        color="error"
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 2.5,
                            fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                            '&:hover': {
                                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.4)',
                            },
                        }}
                        autoFocus
                    >
                        {confirmDialog.confirmText}
                    </Button>
                </DialogActions>
            </Dialog>
        </NotificationContext.Provider>
    );
};

export const useSnackbar = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useSnackbar must be used within NotificationProvider');
    return context.showSnackbar;
};

export const useConfirm = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useConfirm must be used within NotificationProvider');
    return context.showConfirm;
};

export default NotificationContext;
