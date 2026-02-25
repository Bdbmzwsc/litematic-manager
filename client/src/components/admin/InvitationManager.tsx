import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Plus, Trash2, Clock, CheckCircle, AlertCircle, Copy, Loader2, ChevronLeft, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Invitation, User } from '../../types';

const InvitationManager: React.FC = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const confirm = useConfirm();
    const token = localStorage.getItem('jwt_token');
    const user: User | null = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;

    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Form state
    const [expiresInHours, setExpiresInHours] = useState<number | string>(24);
    const [maxUses, setMaxUses] = useState<number | string>(1);

    useEffect(() => {
        // Strict admin check
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchInvitations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const fetchInvitations = async () => {
        try {
            setLoading(true);
            const data = await api.invitations.getAll() as Invitation[];
            setInvitations(data);
        } catch (err) {
            showNotification(err instanceof Error ? err.message : '获取邀请码失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setGenerating(true);
            const res = await api.invitations.create({
                expiresInHours: Number(expiresInHours),
                maxUses: Number(maxUses)
            });
            showNotification(`已成功生成邀请码 ${res.invitation.code}！`, 'success');
            fetchInvitations(); // Refresh list
        } catch (err) {
            showNotification(err instanceof Error ? err.message : '生成邀请码失败', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async (code: string) => {
        const ok = await confirm({
            title: '删除邀请码？',
            description: <>确定要删除邀请码 <strong style={{ color: 'var(--text-primary)' }}>{code}</strong> 吗？此操作无法撤销。</>,
            confirmLabel: '删除',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await api.invitations.delete(code);
            showNotification(`邀请码 ${code} 已删除。`, 'success');
            setInvitations(prev => prev.filter(inv => inv.code !== code));
        } catch (err) {
            showNotification(err instanceof Error ? err.message : '删除邀请码失败', 'error');
        }
    };

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        showNotification('邀请码已复制到剪贴板！', 'success');
    };

    // Calculate time remaining for display
    const getTimeRemaining = (expiresAt: string): string => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return '已过期';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `剩余 ${Math.floor(hours / 24)}天 ${hours % 24}小时`;
        return `剩余 ${hours}小时 ${minutes}分钟`;
    };

    const getStatusStyle = (status: string): { bg: string; color: string; border: string } => {
        switch (status) {
            case 'active':
                return { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)' };
            case 'expired':
                return { bg: 'var(--error-bg)', color: 'var(--error)', border: 'var(--error)' };
            case 'used_up':
                return { bg: 'var(--glass-bg)', color: 'var(--text-tertiary)', border: 'var(--glass-border)' };
            default:
                return { bg: 'var(--glass-bg)', color: 'var(--text-secondary)', border: 'var(--glass-border)' };
        }
    };

    const formatStatus = (status: string): string => {
        if (status === 'used_up') return '已用完';
        if (status === 'expired') return '已过期';
        if (status === 'active') return '有效';
        return status;
    };

    if (!user || user.role !== 'admin') {
        return null; // Don't flash UI before redirect
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                                marginBottom: '1rem', fontSize: '0.9rem', padding: 0, fontWeight: '500',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                            <ChevronLeft size={16} />
                            返回
                        </button>
                        <h2 style={{ fontSize: '2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <ShieldAlert size={28} />
                            邀请码管理
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            生成并监督临时注册邀请码。
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>

                    {/* Generate Form Panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            <Plus size={20} style={{ color: 'var(--text-primary)' }} />
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>生成新邀请码</h3>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="input-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>有效期 (小时)</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>最大: 720h (30天)</span>
                                </label>
                                <input
                                    type="number"
                                    className="glass-input"
                                    min="1"
                                    max="720"
                                    value={expiresInHours}
                                    onChange={(e) => setExpiresInHours(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>最大使用次数</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>最大: 100次</span>
                                </label>
                                <input
                                    type="number"
                                    className="glass-input"
                                    min="1"
                                    max="100"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="glass-button"
                                disabled={generating}
                                style={{ marginTop: '0.5rem' }}
                            >
                                {generating ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                                生成邀请码
                            </button>
                        </form>
                    </div>

                    {/* Codes List Panel */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '400px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Key size={20} />
                                    当前及近期邀请码
                                </h3>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>共 {invitations.length} 个</span>
                            </div>

                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <Loader2 size={32} className="animate-spin" />
                                </div>
                            ) : invitations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                                    <p>未找到邀请码。</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>使用左侧面板生成一个新的邀请码。</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {invitations.map((inv) => {
                                        const styles = getStatusStyle(inv.status);
                                        return (
                                            <div key={inv.code} className="glass-panel list-item animate-fade-in" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {/* Left: Code & Status */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                                            {inv.code}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopy(inv.code)}
                                                            className="glass-button secondary hover-only"
                                                            style={{ padding: '0.3rem', width: 'auto' }}
                                                            title="复制邀请码"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.7rem', padding: '0.2rem 0.5rem', width: 'max-content',
                                                        background: styles.bg, color: styles.color,
                                                        border: `1px solid ${styles.border}`, borderRadius: '12px', fontWeight: '500'
                                                    }}>
                                                        {formatStatus(inv.status)}
                                                    </span>
                                                </div>

                                                {/* Middle: Details */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flex: 1, minWidth: '200px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>使用次数</div>
                                                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                                            <span style={{ color: inv.usedCount >= inv.maxUses ? 'var(--error)' : 'var(--text-primary)' }}>{inv.usedCount}</span> / {inv.maxUses}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>创建者</div>
                                                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{inv.createdByName}</div>
                                                    </div>
                                                    <div style={{ minWidth: '120px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>剩余时间</div>
                                                        <div style={{ fontWeight: '500', fontSize: '0.9rem', color: inv.status === 'expired' ? 'var(--error)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {inv.status !== 'expired' && <Clock size={12} />}
                                                            {getTimeRemaining(inv.expiresAt)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div>
                                                    <button
                                                        onClick={() => handleDelete(inv.code)}
                                                        className="glass-button"
                                                        style={{ padding: '0.5rem', width: 'auto', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error)' }}
                                                        title="删除邀请码"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default InvitationManager;
