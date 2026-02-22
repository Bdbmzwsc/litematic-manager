import React, { useState, useEffect } from 'react';
import { Layers, LogOut, LogIn, Upload, Key, User, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('jwt_token');
    const user = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const isGuest = !token && sessionStorage.getItem('guest_mode') === 'true';

    // Initialize theme from DOM state (in case of re-render)
    const [theme, setTheme] = useState(
        () => document.documentElement.classList.contains('light-theme') ? 'light' : 'dark'
    );

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        // Toggle class on body or html tag for CSS variables later if needed
        document.documentElement.classList.toggle('light-theme');
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('guest_mode');
        navigate('/login');
    };

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            width: '100%',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease'
        }}>
            {/* Logo area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
                <div style={{
                    background: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Layers size={20} />
                </div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.03em', margin: 0 }}>
                    SGU Server
                </h1>
            </div>

            {/* Actions & Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem',
                        transition: 'color 0.2s', borderRadius: '50%'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    title="切换主题"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {user ? (
                    <>
                        <button className="glass-button secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }} title="上传投影" onClick={() => navigate('/upload')}>
                            <Upload size={16} />
                            <span style={{ fontSize: '0.85rem' }}>上传</span>
                        </button>

                        {user.role === 'admin' && (
                            <button className="glass-button secondary" style={{ padding: '0.5rem 1rem', width: 'auto' }} title="管理邀请码" onClick={() => navigate('/admin/invitations')}>
                                <Key size={16} />
                                <span style={{ fontSize: '0.85rem' }}>邀请码管理</span>
                            </button>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user.username}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {user.role === 'admin' ? 'ADMIN' : 'USER'}
                                </div>
                            </div>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)'
                            }}>
                                <User size={18} />
                            </div>
                            <button
                                onClick={handleLogout}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem', marginLeft: '0.25rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                title="退出登录"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>访客</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                只读模式
                            </div>
                        </div>
                        <button className="glass-button" style={{ padding: '0.5rem 1.25rem', width: 'auto' }} onClick={handleLogout}>
                            <LogIn size={16} />
                            <span style={{ fontSize: '0.85rem' }}>登录</span>
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
