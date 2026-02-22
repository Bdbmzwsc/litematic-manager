import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, Loader2, Eye } from 'lucide-react';
import { api } from '../../lib/api';

const LoginForm = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { token, user } = await api.auth.login(formData.username, formData.password);
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            navigate('/'); // Redirect to dashboard
        } catch (err) {
            setError(err.message || '登录失败，请检查您的令牌');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>欢迎回来</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>登录以管理您的投影文件</p>
            </div>

            {error && (
                <div style={{
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="username">用户名</label>
                    <div style={{ position: 'relative' }}>
                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className="glass-input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder=""
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-group mb-6">
                    <label className="form-label" htmlFor="password">密码</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="glass-input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder=""
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="glass-button"
                    disabled={loading}
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    {loading ? '登录中...' : '登录'}
                </button>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    margin: '1.25rem 0', color: 'var(--text-tertiary)', fontSize: '0.8rem'
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                    <span>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                </div>

                <button
                    type="button"
                    className="glass-button secondary"
                    onClick={() => {
                        sessionStorage.setItem('guest_mode', 'true');
                        navigate('/');
                    }}
                >
                    <Eye size={18} />
                    以访客身份继续
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>还没有账号？ </span>
                    <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        立即注册
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default LoginForm;
