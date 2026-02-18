import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Typography, Box, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, Tooltip, Alert, alpha, useTheme, MenuItem, Select,
    FormControl, InputLabel, CircularProgress
} from '@mui/material';
import {
    ContentCopy as CopyIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Close as CloseIcon,
    CardGiftcard as InviteIcon
} from '@mui/icons-material';
import invitationService from '../services/invitation';
import { useConfirm } from '../contexts/NotificationContext';

const InvitationManager = ({ open, onClose }) => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [expiresInHours, setExpiresInHours] = useState(24);
    const [maxUses, setMaxUses] = useState(1);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [copiedCode, setCopiedCode] = useState('');
    const theme = useTheme();
    const showConfirm = useConfirm();

    const loadInvitations = useCallback(async () => {
        setLoading(true);
        try {
            const list = await invitationService.listInvitations();
            setInvitations(list);
        } catch (err) {
            setError('加载邀请码列表失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadInvitations();
            setError('');
            setSuccessMsg('');
        }
    }, [open, loadInvitations]);

    const handleCreate = async () => {
        setCreating(true);
        setError('');
        setSuccessMsg('');
        try {
            const result = await invitationService.createInvitation(expiresInHours, maxUses);
            setSuccessMsg(`邀请码已创建: ${result.invitation.code}`);
            loadInvitations();
        } catch (err) {
            setError(err.response?.data?.error || '创建邀请码失败');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (code) => {
        const confirmed = await showConfirm({
            title: '删除确认',
            message: `确定要删除邀请码 ${code} 吗？`,
            confirmText: '删除',
            cancelText: '取消'
        });
        if (!confirmed) return;
        try {
            await invitationService.deleteInvitation(code);
            loadInvitations();
        } catch (err) {
            setError(err.response?.data?.error || '删除失败');
        }
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(''), 2000);
        });
    };

    const getStatusChip = (status) => {
        switch (status) {
            case 'active':
                return <Chip label="有效" color="success" size="small" />;
            case 'expired':
                return <Chip label="已过期" color="error" size="small" />;
            case 'used_up':
                return <Chip label="已用完" color="warning" size="small" />;
            default:
                return <Chip label="未知" size="small" />;
        }
    };

    const formatDate = (isoStr) => {
        return new Date(isoStr).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 1
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InviteIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>邀请码管理</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {successMsg && (
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccessMsg('')}>
                        {successMsg}
                    </Alert>
                )}

                {/* 创建区域 */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2.5, mb: 3, borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        borderColor: alpha(theme.palette.primary.main, 0.15)
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                        生成新邀请码
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>有效期</InputLabel>
                            <Select
                                value={expiresInHours}
                                label="有效期"
                                onChange={(e) => setExpiresInHours(e.target.value)}
                            >
                                <MenuItem value={1}>1 小时</MenuItem>
                                <MenuItem value={6}>6 小时</MenuItem>
                                <MenuItem value={12}>12 小时</MenuItem>
                                <MenuItem value={24}>24 小时</MenuItem>
                                <MenuItem value={48}>48 小时</MenuItem>
                                <MenuItem value={72}>3 天</MenuItem>
                                <MenuItem value={168}>7 天</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            label="最大使用次数"
                            type="number"
                            value={maxUses}
                            onChange={(e) => setMaxUses(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                            inputProps={{ min: 1, max: 100 }}
                            sx={{ width: 140 }}
                        />

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreate}
                            disabled={creating}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                boxShadow: `0 3px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
                                },
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {creating ? '生成中...' : '生成邀请码'}
                        </Button>
                    </Box>
                </Paper>

                {/* 列表区域 */}
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    邀请码列表 ({invitations.length})
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : invitations.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                            暂无邀请码，请点击上方按钮生成
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableCell sx={{ fontWeight: 600 }}>邀请码</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>已用 / 总量</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>到期时间</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invitations.map((inv) => (
                                    <TableRow
                                        key={inv.code}
                                        sx={{
                                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                                            opacity: inv.status === 'active' ? 1 : 0.6
                                        }}
                                    >
                                        <TableCell>
                                            <Typography
                                                variant="body2"
                                                fontFamily="monospace"
                                                fontWeight={700}
                                                sx={{ letterSpacing: '1.5px' }}
                                            >
                                                {inv.code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{getStatusChip(inv.status)}</TableCell>
                                        <TableCell>
                                            {inv.usedCount} / {inv.maxUses}
                                        </TableCell>
                                        <TableCell>{formatDate(inv.expiresAt)}</TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={copiedCode === inv.code ? "已复制!" : "复制邀请码"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleCopy(inv.code)}
                                                    color={copiedCode === inv.code ? "success" : "default"}
                                                >
                                                    <CopyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="删除">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(inv.code)}
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>关闭</Button>
            </DialogActions>
        </Dialog>
    );
};

export default InvitationManager;
