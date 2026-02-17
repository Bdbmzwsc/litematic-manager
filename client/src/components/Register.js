import React, { useState } from 'react';
import {
    Box, TextField, Button, Typography, Alert,
    InputAdornment, IconButton, alpha, useTheme,
    Grid
} from '@mui/material';
import {
    AccountCircle as UserIcon,
    VpnKey as PasswordIcon,
    Email as EmailIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    PersonAdd as RegisterIcon,
    CardGiftcard as InviteIcon
} from '@mui/icons-material';
import authService from '../services/auth';

const Register = ({ onRegisterSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [invitationCode, setInvitationCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const theme = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!invitationCode.trim()) {
            setError('请输入邀请码');
            return;
        }

        setIsLoading(true);

        try {
            await authService.register(username, password, email, invitationCode.trim().toUpperCase());
            setSuccess('注册成功！请登录账号');
            if (onRegisterSuccess) {
                setTimeout(() => {
                    onRegisterSuccess();
                }, 1500);
            }
        } catch (error) {
            setError(error.response?.data?.error || '注册失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {error && (
                <Alert
                    severity="error"
                    sx={{
                        mb: 3,
                        borderRadius: 2,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.2)}`
                    }}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    severity="success"
                    sx={{
                        mb: 3,
                        borderRadius: 2,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.success.main, 0.2)}`
                    }}
                >
                    {success}
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="邀请码"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        required
                        autoFocus
                        placeholder="请输入 8 位邀请码"
                        variant="outlined"
                        inputProps={{ maxLength: 8, style: { letterSpacing: '2px', fontWeight: 600 } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <InviteIcon color="primary" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <UserIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="邮箱"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>

                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="密码"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PasswordIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handleTogglePasswordVisibility}
                                        edge="end"
                                        aria-label="toggle password visibility"
                                        size="small"
                                    >
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Grid>
            </Grid>

            <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading || success}
                startIcon={<RegisterIcon />}
                sx={{
                    mt: 3,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                        transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                }}
            >
                {isLoading ? '注册中...' : success ? '注册成功' : '注册账号'}
            </Button>

            {!success && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: 'block',
                        mt: 2,
                        textAlign: 'center'
                    }}
                >
                    注册需要有效的邀请码，请联系管理员获取
                </Typography>
            )}
        </Box>
    );
};

export default Register;