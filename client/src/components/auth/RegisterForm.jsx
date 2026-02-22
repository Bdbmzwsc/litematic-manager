import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Key, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        invitationCode: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            return setError('密码不匹配');
        }

        setLoading(true);

        try {
            await api.auth.register(
                formData.username,
                formData.email,
                formData.password,
                formData.invitationCode
            );
            setSuccess('注册成功！您现在可以登录了。');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.message || '注册失败，请稍后重试。');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>创建账号</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>使用邀请码注册</p>
            </div>

            {error && (
                <div style={{
                    background: 'var(--error-bg)', color: 'var(--error)', padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    background: 'var(--success-bg)', color: 'var(--success)', padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">用户名</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                id="username" name="username" type="text" className="glass-input"
                                style={{ paddingLeft: '2.5rem' }} placeholder=""
                                value={formData.username} onChange={handleChange} required minLength={3}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="email">电子邮箱</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                id="email" name="email" type="email" className="glass-input"
                                style={{ paddingLeft: '2.5rem' }} placeholder=""
                                value={formData.email} onChange={handleChange} required
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="password">密码</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            id="password" name="password" type="password" className="glass-input"
                            style={{ paddingLeft: '2.5rem' }} placeholder=""
                            value={formData.password} onChange={handleChange} required minLength={6}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">确认密码</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            id="confirmPassword" name="confirmPassword" type="password" className="glass-input"
                            style={{ paddingLeft: '2.5rem' }} placeholder=""
                            value={formData.confirmPassword} onChange={handleChange} required minLength={6}
                        />
                    </div>
                </div>

                <div className="form-group mb-6">
                    <label className="form-label" htmlFor="invitationCode">邀请码</label>
                    <div style={{ position: 'relative' }}>
                        <Key size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            id="invitationCode" name="invitationCode" type="text" className="glass-input"
                            style={{ paddingLeft: '2.5rem', fontFamily: 'monospace', letterSpacing: '1px' }} placeholder=""
                            value={formData.invitationCode} onChange={handleChange} required
                        />
                    </div>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        需要管理员提供的有效邀请码。
                    </p>
                </div>

                <button type="submit" className="glass-button" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                    {loading ? '正在创建账号...' : '注册'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>已有账号？ </span>
                    <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        立即登录
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default RegisterForm;
