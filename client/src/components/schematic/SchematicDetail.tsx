import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Share2, Clock, User as UserIcon, Shield, ChevronLeft, Loader2, FileBox, Pencil, Check, X, Trash2, Settings, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import ConfigModal from './ConfigModal';
import AssemblyModal from './AssemblyModal';
import type { Schematic, User } from '../../types';

const SchematicDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const confirm = useConfirm();
    const [schematic, setSchematic] = useState<Schematic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Description Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Name Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Visibility Edit State
    const [isEditingVisibility, setIsEditingVisibility] = useState(false);
    const [editVisibility, setEditVisibility] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    // Modal states
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showAssemblyModal, setShowAssemblyModal] = useState(false);

    // Get current user and determine if they can edit
    const token = localStorage.getItem('jwt_token');
    const user: User | null = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const canEdit = user && schematic && (user.role === 'admin' || user.id === schematic.user_id);

    useEffect(() => {
        const fetchSchematicDetail = async () => {
            try {
                const data = await api.schematics.getById(id!) as Schematic;
                setSchematic(data);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : '加载投影详情失败');
            } finally {
                setLoading(false);
            }
        };
        fetchSchematicDetail();
    }, [id]);

    const handleEditStart = () => {
        setEditContent(schematic?.description || '');
        setIsEditing(true);
    };

    const handleEditSave = async () => {
        try {
            setSaving(true);
            await api.schematics.update(id!, { description: editContent });
            setSchematic(prev => prev ? { ...prev, description: editContent } : prev);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save README", err);
            alert("保存 README 失败: " + (err instanceof Error ? err.message : '未知错误'));
        } finally {
            setSaving(false);
        }
    };

    const handleEditNameSave = async () => {
        if (!editName.trim()) return showNotification("名称不能为空", 'error');
        try {
            setSavingName(true);
            await api.schematics.update(id!, { name: editName.trim() });
            setSchematic(prev => prev ? { ...prev, name: editName.trim() } : prev);
            setIsEditingName(false);
            showNotification('投影名称已更新', 'success');
        } catch (err) {
            console.error("Failed to save Name", err);
            showNotification("保存名称失败: " + (err instanceof Error ? err.message : '未知错误'), 'error');
        } finally {
            setSavingName(false);
        }
    };

    const handleEditVisibilitySave = async () => {
        try {
            setSavingVisibility(true);
            await api.schematics.update(id!, { is_public: editVisibility });
            setSchematic(prev => prev ? { ...prev, is_public: editVisibility } : prev);
            setIsEditingVisibility(false);
            showNotification(`可见性已更改为 ${editVisibility ? 'public' : 'private'}`, 'success');
        } catch (err) {
            console.error("Failed to save Visibility", err);
            showNotification("保存可见性失败: " + (err instanceof Error ? err.message : '未知错误'), 'error');
        } finally {
            setSavingVisibility(false);
        }
    };

    const handleDownloadClick = () => {
        if (schematic?.schematic_type === 1) {
            setShowAssemblyModal(true);
        } else {
            executeDownload();
        }
    };

    const executeDownload = (x?: number, z?: number) => {
        const token = localStorage.getItem('jwt_token');

        let url = `/api/schematics/${id}/download`;
        if (x && z) {
            url += `?x=${x}&z=${z}`;
        }

        // We can't easily use standard fetch for file downloads if we want the browser to handle Saving.
        // Wait, since we are proxying, we can just navigate or open a new window
        // But if it requires Auth, we must pass the token. 
        // The backend uses optionalAuth for download though, meaning guests can download too.
        // If the user has a token, we should probably fetch it as a blob and save it, or pass token in URL (not secure).
        // Since download is "optionalAuth", a direct window.open works for both guests and logged-in users 
        // if they are authorized by default (public schematics).

        // Let's do the robust Blob approach to ensure the auth token is sent if present.
        api.fetch(`/schematics/${id}/download${x && z ? `?x=${x}&z=${z}` : ''}`, {
            // Need to specify we expect a blob, but our api wrapper assumes JSON.
            // So we bypass the api wrapper for the download to handle the blob correctly.
        }).catch(() => { }); // Dummy catch, actual logic below

        const headers = new Headers();
        if (token) headers.append('Authorization', `Bearer ${token}`);

        fetch(url, { headers })
            .then(response => {
                if (!response.ok) throw new Error('下载失败');
                const disposition = response.headers.get('Content-Disposition');
                let filename = `${schematic?.name || 'download'}.litematic`;
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                return response.blob().then(blob => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Optimistically update download count in UI
                setSchematic(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : prev);
                if (showAssemblyModal) setShowAssemblyModal(false);
            })
            .catch(err => {
                console.error("Download error:", err);
                showNotification("下载文件失败。", "error");
            });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        showNotification('链接已复制到剪贴板！', 'success');
    };

    const handleDelete = async () => {
        if (!schematic) return;
        const ok = await confirm({
            title: '删除投影？',
            description: <>确定要删除 <strong style={{ color: 'var(--text-primary)' }}>{schematic.name}</strong> 吗？此操作无法撤销。</>,
            confirmLabel: '删除',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await api.schematics.delete(id!);
            showNotification(`投影 "${schematic.name}" 已成功删除`, 'success');
            navigate('/', { replace: true });
        } catch (err) {
            console.error("Delete error:", err);
            showNotification(err instanceof Error ? err.message : "删除投影失败", 'error');
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                </div>
            </div>
        );
    }

    if (error || !schematic) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
                        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>加载投影出错</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error}</p>
                        <button className="glass-button secondary" onClick={() => navigate('/')} style={{ maxWidth: '200px', margin: '0 auto' }}>
                            <ChevronLeft size={18} />
                            返回
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const formattedDate = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(schematic.created_at));

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                        marginBottom: '1.5rem', fontSize: '0.9rem', padding: 0, fontWeight: '500',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                    <ChevronLeft size={16} />
                    返回
                </button>

                {/* PyPI Style Top Header */}
                <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem', marginBottom: '2rem', position: 'relative' }}>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                        <div style={{ flex: '1 1 min-content' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    background: 'var(--text-primary)', color: 'var(--bg-primary)',
                                    padding: '0.75rem', borderRadius: 'var(--radius-md)'
                                }}>
                                    <FileBox size={32} />
                                </div>
                                {isEditingName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            style={{ fontSize: '2rem', padding: '0.5rem 1rem', width: '100%', fontWeight: 'bold' }}
                                            disabled={savingName}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleEditNameSave();
                                                if (e.key === 'Escape') setIsEditingName(false);
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="glass-button" onClick={handleEditNameSave} disabled={savingName} style={{ padding: '0.5rem', width: 'auto', background: 'var(--success)' }}>
                                                {savingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                            </button>
                                            <button className="glass-button secondary" onClick={() => setIsEditingName(false)} disabled={savingName} style={{ padding: '0.5rem', width: 'auto' }}>
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h1 style={{ fontSize: '2.5rem', margin: 0, letterSpacing: '-0.03em', wordBreak: 'break-all' }}>
                                            {schematic.name}
                                        </h1>
                                        {canEdit && (
                                            <button
                                                onClick={() => {
                                                    setEditName(schematic.name);
                                                    setIsEditingName(true);
                                                }}
                                                className="glass-button secondary hover-only"
                                                style={{ padding: '0.4rem', width: 'auto', opacity: 0.6 }}
                                                title="编辑名称"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '240px', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                            <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="glass-button secondary hover-only"
                                    onClick={handleShare}
                                    style={{ padding: '0.5rem', width: 'auto' }}
                                    title="分享投影链接"
                                >
                                    <Share2 size={18} />
                                </button>
                                {canEdit && (
                                    <button
                                        className="glass-button secondary hover-only"
                                        onClick={() => setShowConfigModal(true)}
                                        style={{ padding: '0.5rem', width: 'auto' }}
                                        title="投影配置与管理"
                                    >
                                        <Settings size={18} />
                                    </button>
                                )}
                            </div>
                            <button className="glass-button" onClick={handleDownloadClick} style={{ padding: '1rem', fontSize: '1.05rem' }}>
                                <Download size={20} />
                                下载文件
                            </button>
                        </div>
                    </div>
                </div>


                {/* PyPI Style Split Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                    {/* Left Column: Metadata */}
                    <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                                投影信息
                            </h3>

                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <UserIcon size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>作者</div>
                                        <div style={{ fontWeight: '500' }}>{schematic.creator_name}</div>
                                    </div>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <FileBox size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>类型</div>
                                        <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {schematic.schematic_type === 1 ? (
                                                <><span style={{ color: '#3b82f6' }}>投影生成</span></>
                                            ) : (
                                                <span>普通投影</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <Clock size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>上传时间</div>
                                        <div>{formattedDate}</div>
                                    </div>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minHeight: '42px' }}>
                                    <Shield size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>可见性</span>
                                        </div>

                                        {isEditingVisibility ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <select
                                                    className="glass-input"
                                                    value={editVisibility ? 'true' : 'false'}
                                                    onChange={e => setEditVisibility(e.target.value === 'true')}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                                    disabled={savingVisibility}
                                                >
                                                    <option value="true">Public</option>
                                                    <option value="false">Private</option>
                                                </select>
                                                <button className="glass-button" onClick={handleEditVisibilitySave} disabled={savingVisibility} style={{ padding: '0.4rem', width: 'auto', background: 'var(--success)' }}>
                                                    {savingVisibility ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                </button>
                                                <button className="glass-button secondary" onClick={() => setIsEditingVisibility(false)} disabled={savingVisibility} style={{ padding: '0.4rem', width: 'auto' }}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{
                                                    width: '8px', height: '8px', borderRadius: '50%',
                                                    background: schematic.is_public ? 'var(--success)' : 'var(--error)'
                                                }}></span>
                                                {schematic.is_public ? 'Public' : 'Private'}

                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setEditVisibility(!!schematic.is_public);
                                                            setIsEditingVisibility(true);
                                                        }}
                                                        className="glass-button secondary hover-only"
                                                        style={{ padding: '0.2rem', width: 'auto', opacity: 0.6, marginLeft: '0.5rem' }}
                                                        title="编辑可见性"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <Download size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>总下载次数</div>
                                        <div style={{ fontWeight: '600', fontSize: '1.25rem' }}>{schematic.download_count || 0}</div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Project Description (README) */}
                    <div style={{ gridColumn: 'span 2' }} className="animate-fade-in">
                        <div className="glass-panel" style={{ padding: '2rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>
                                    项目说明
                                </h3>
                                {canEdit && !isEditing && (
                                    <button
                                        onClick={handleEditStart}
                                        className="glass-button secondary"
                                        style={{ padding: '0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}
                                    >
                                        <Pencil size={14} />
                                        编辑
                                    </button>
                                )}
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
                                        <textarea
                                            className="glass-input"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            style={{
                                                flex: 1,
                                                minHeight: '350px',
                                                resize: 'vertical',
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                padding: '1rem'
                                            }}
                                            placeholder="使用 Markdown 编写您的 README..."
                                            disabled={saving}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button
                                                className="glass-button secondary"
                                                onClick={() => setIsEditing(false)}
                                                style={{ width: 'auto', padding: '0.5rem 1rem' }}
                                                disabled={saving}
                                            >
                                                <X size={16} />
                                                取消
                                            </button>
                                            <button
                                                className="glass-button"
                                                onClick={handleEditSave}
                                                style={{ width: 'auto', padding: '0.5rem 1.5rem', background: 'var(--success)' }}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                保存更改
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="markdown-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                        {schematic.description ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    img: ({ node, ...props }) => (
                                                        <img {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-md)', margin: '1rem 0' }} />
                                                    )
                                                }}
                                            >
                                                {schematic.description}
                                            </ReactMarkdown>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                                                <FileBox size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>此投影没有 README 或说明。</p>
                                                {canEdit && (
                                                    <button
                                                        onClick={handleEditStart}
                                                        className="glass-button secondary mt-4"
                                                        style={{ width: 'auto' }}
                                                    >
                                                        <Pencil size={16} />
                                                        添加说明
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main >

            {showConfigModal && (
                <ConfigModal
                    schematic={schematic}
                    onClose={() => setShowConfigModal(false)}
                    onUpdate={(newType) => setSchematic(prev => prev ? { ...prev, schematic_type: newType } : prev)}
                    onDelete={handleDelete}
                    onRefresh={async () => {
                        try {
                            const data = await api.schematics.getById(id!) as Schematic;
                            setSchematic(data);
                        } catch (err) {
                            console.error("Failed to refresh schematic data", err);
                        }
                    }}
                />
            )}

            {showAssemblyModal && (
                <AssemblyModal
                    schematicName={schematic.name}
                    onCancel={() => setShowAssemblyModal(false)}
                    onConfirm={(x, z) => executeDownload(x, z)}
                />
            )}
        </div >
    );
};

export default SchematicDetail;
