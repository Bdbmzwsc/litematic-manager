import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Check,
    ChevronLeft,
    Clock,
    Download,
    FileBox,
    Loader2,
    Pencil,
    Settings,
    Share2,
    Shield,
    Upload,
    User as UserIcon,
    X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import ConfigModal from './ConfigModal';
import AssemblyModal from './AssemblyModal';
import VersionUploadModal from './VersionUploadModal';
import type { Schematic, SchematicVersion, User } from '../../types';

const formatDate = (date: string) =>
    new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));

const parseTags = (tags: Schematic['tags']): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;

    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const SchematicDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const confirm = useConfirm();

    const [schematic, setSchematic] = useState<Schematic | null>(null);
    const [versions, setVersions] = useState<SchematicVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'details' | 'versions'>('details');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [savingName, setSavingName] = useState(false);

    const [isEditingVisibility, setIsEditingVisibility] = useState(false);
    const [editVisibility, setEditVisibility] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showAssemblyModal, setShowAssemblyModal] = useState(false);
    const [showVersionModal, setShowVersionModal] = useState(false);

    const token = localStorage.getItem('jwt_token');
    const user: User | null = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const canEdit = Boolean(user && schematic && (user.role === 'admin' || user.id === schematic.user_id));

    const fetchSchematicDetail = async () => {
        if (!id) return;

        try {
            setError('');
            const data = await api.schematics.getById(id) as Schematic;
            const versionData = await api.schematics.getVersions(id);
            setSchematic(data);
            setVersions(versionData);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : '加载投影详情失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchematicDetail();
    }, [id]);

    const handleEditStart = () => {
        setEditContent(schematic?.readme || '');
        setIsEditing(true);
    };

    const handleEditSave = async () => {
        if (!id) return;

        try {
            setSaving(true);
            await api.schematics.update(id, { readme: editContent });
            setSchematic(prev => prev ? { ...prev, readme: editContent } : prev);
            setIsEditing(false);
            showNotification('README 已保存', 'success');
        } catch (err) {
            console.error('Failed to save README', err);
            showNotification(`保存 README 失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleEditNameSave = async () => {
        if (!id || !schematic) return;
        if (!editName.trim()) {
            showNotification('名称不能为空', 'error');
            return;
        }

        try {
            setSavingName(true);
            const nextName = editName.trim();
            await api.schematics.update(id, { name: nextName });
            setSchematic({ ...schematic, name: nextName });
            setIsEditingName(false);
            showNotification('投影名称已更新', 'success');
        } catch (err) {
            console.error('Failed to save name', err);
            showNotification(`保存名称失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error');
        } finally {
            setSavingName(false);
        }
    };

    const handleEditVisibilitySave = async () => {
        if (!id || !schematic) return;

        try {
            setSavingVisibility(true);
            await api.schematics.update(id, { is_public: editVisibility });
            setSchematic({ ...schematic, is_public: editVisibility });
            setIsEditingVisibility(false);
            showNotification(`可见性已更改为 ${editVisibility ? 'public' : 'private'}`, 'success');
        } catch (err) {
            console.error('Failed to save visibility', err);
            showNotification(`保存可见性失败: ${err instanceof Error ? err.message : '未知错误'}`, 'error');
        } finally {
            setSavingVisibility(false);
        }
    };

    const executeDownload = (x?: number, z?: number, versionId?: number) => {
        const downloadToken = localStorage.getItem('jwt_token');
        let url = versionId ? `/api/schematics/versions/${versionId}/download` : `/api/schematics/${id}/download`;
        if (x && z) url += `?x=${x}&z=${z}`;

        const headers = new Headers();
        if (downloadToken) headers.append('Authorization', `Bearer ${downloadToken}`);

        fetch(url, { headers })
            .then(response => {
                if (!response.ok) throw new Error('下载失败');
                const disposition = response.headers.get('Content-Disposition');
                let filename = `${schematic?.name || 'download'}.litematic`;
                if (disposition && disposition.includes('filename=')) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                    if (matches?.[1]) filename = matches[1].replace(/['"]/g, '');
                }
                return response.blob().then(blob => ({ blob, filename }));
            })
            .then(({ blob, filename }) => {
                const objectUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(objectUrl);
                document.body.removeChild(a);

                if (!versionId) {
                    setSchematic(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : prev);
                }
                setShowAssemblyModal(false);
            })
            .catch(err => {
                console.error('Download error:', err);
                showNotification('下载文件失败。', 'error');
            });
    };

    const handleDownloadClick = () => {
        if (schematic?.schematic_type === 1) {
            setShowAssemblyModal(true);
            return;
        }

        executeDownload();
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        showNotification('链接已复制到剪贴板！', 'success');
    };

    const handleDelete = async () => {
        if (!id || !schematic) return;

        const ok = await confirm({
            title: '删除投影？',
            description: <>确定要删除 <strong style={{ color: 'var(--text-primary)' }}>{schematic.name}</strong> 吗？此操作无法撤销。</>,
            confirmLabel: '删除',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await api.schematics.delete(id);
            showNotification(`投影 "${schematic.name}" 已成功删除`, 'success');
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Delete error:', err);
            showNotification(err instanceof Error ? err.message : '删除投影失败', 'error');
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

    const tags = parseTags(schematic.tags);
    const formattedDate = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(schematic.created_at));

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: 0,
                        fontWeight: 500,
                        marginBottom: '1.5rem',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                    <ChevronLeft size={16} />
                    返回
                </button>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
                        <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: '1 1 min-content' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{
                                            background: 'var(--text-primary)',
                                            color: 'var(--bg-primary)',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                        }}>
                                            <FileBox size={32} />
                                        </div>

                                        {isEditingName ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '300px' }}>
                                                <input
                                                    type="text"
                                                    className="glass-input"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    style={{ fontSize: '2rem', padding: '0.5rem 1rem', width: '100%', fontWeight: 'bold' }}
                                                    disabled={savingName}
                                                    autoFocus
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleEditNameSave();
                                                        if (e.key === 'Escape') setIsEditingName(false);
                                                    }}
                                                />
                                                <button className="glass-button" onClick={handleEditNameSave} disabled={savingName} style={{ padding: '0.5rem', width: 'auto', background: 'var(--success)' }}>
                                                    {savingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                                </button>
                                                <button className="glass-button secondary" onClick={() => setIsEditingName(false)} disabled={savingName} style={{ padding: '0.5rem', width: 'auto' }}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                                                <h1 style={{ fontSize: '2.5rem', margin: 0, letterSpacing: '-0.03em', wordBreak: 'break-word' }}>
                                                    {schematic.name}
                                                </h1>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setEditName(schematic.name);
                                                            setIsEditingName(true);
                                                        }}
                                                        className="glass-button secondary"
                                                        style={{ padding: '0.4rem', width: 'auto', opacity: 0.7 }}
                                                        title="编辑名称"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {!isEditingName && (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '-0.25rem', paddingLeft: '4.5rem', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                            {schematic.description || <span style={{ opacity: 0.6, fontStyle: 'italic' }}>暂无简介</span>}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '240px', paddingTop: '1rem' }}>
                                    <button className="glass-button" onClick={handleDownloadClick} style={{ padding: '1rem', fontSize: '1.05rem', width: '100%' }}>
                                        <Download size={20} />
                                        下载最新版本
                                    </button>
                                    {canEdit && (
                                        <button className="glass-button secondary" onClick={() => setShowVersionModal(true)} style={{ padding: '0.75rem', width: '100%' }}>
                                            <Upload size={18} />
                                            上传新版本
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <button
                                onClick={() => setActiveTab('details')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    color: activeTab === 'details' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    borderBottom: activeTab === 'details' ? '2px solid var(--text-primary)' : '2px solid transparent',
                                    padding: '0.5rem 1rem',
                                }}
                            >
                                详情说明
                            </button>
                            <button
                                onClick={() => setActiveTab('versions')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    color: activeTab === 'versions' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    borderBottom: activeTab === 'versions' ? '2px solid var(--text-primary)' : '2px solid transparent',
                                    padding: '0.5rem 1rem',
                                }}
                            >
                                版本历史 ({versions.length})
                            </button>
                        </div>

                        {activeTab === 'details' ? (
                            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.5rem', margin: 0 }}>项目说明</h3>
                                    {canEdit && !isEditing && (
                                        <button onClick={handleEditStart} className="glass-button secondary" style={{ padding: '0.4rem 0.75rem', width: 'auto', fontSize: '0.85rem' }}>
                                            <Pencil size={14} />
                                            编辑
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
                                        <textarea
                                            className="glass-input"
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            style={{
                                                flex: 1,
                                                minHeight: '350px',
                                                resize: 'vertical',
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.6,
                                                padding: '1rem',
                                            }}
                                            placeholder="使用 Markdown 编写您的 README..."
                                            disabled={saving}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button className="glass-button secondary" onClick={() => setIsEditing(false)} style={{ width: 'auto', padding: '0.5rem 1rem' }} disabled={saving}>
                                                <X size={16} />
                                                取消
                                            </button>
                                            <button className="glass-button" onClick={handleEditSave} style={{ width: 'auto', padding: '0.5rem 1.5rem', background: 'var(--success)' }} disabled={saving}>
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                保存更改
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="markdown-body" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', overflow: 'hidden', maxWidth: '100%', wordBreak: 'break-word' }}>
                                        {schematic.readme ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[
                                                    rehypeRaw,
                                                    [rehypeSanitize, {
                                                        ...defaultSchema,
                                                        tagNames: [...(defaultSchema.tagNames || []), 'video', 'source'],
                                                        attributes: {
                                                            ...defaultSchema.attributes,
                                                            video: ['src', 'controls', 'width', 'height', 'autoPlay', 'loop', 'muted', 'poster', 'preload', 'style'],
                                                            source: ['src', 'type'],
                                                        },
                                                    }],
                                                ]}
                                                components={{
                                                    img: ({ node: _node, ...props }) => (
                                                        <img {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--radius-md)', margin: '1rem 0' }} />
                                                    ),
                                                }}
                                            >
                                                {schematic.readme}
                                            </ReactMarkdown>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                                                <FileBox size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>此投影没有 README 或说明。</p>
                                                {canEdit && (
                                                    <button onClick={handleEditStart} className="glass-button secondary mt-4" style={{ width: 'auto' }}>
                                                        <Pencil size={16} />
                                                        添加说明
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="glass-panel animate-fade-in" style={{ padding: '2rem', minHeight: '400px' }}>
                                <h3 style={{ fontSize: '1.5rem', margin: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>历史版本</h3>
                                {versions.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {versions.map((version, index) => (
                                            <div key={version.id} style={{
                                                padding: '1.5rem',
                                                background: 'var(--glass-bg)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--glass-border)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '1rem',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{version.version_name}</h4>
                                                            {index === 0 && (
                                                                <span style={{ fontSize: '0.7rem', background: 'var(--accent)', color: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                                                                    最新历史
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <Clock size={14} />
                                                            {formatDate(version.created_at)}
                                                        </div>
                                                    </div>
                                                    <button className="glass-button secondary" onClick={() => executeDownload(undefined, undefined, version.id)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                                                        <Download size={16} />
                                                        下载此版本
                                                    </button>
                                                </div>
                                                {version.changelog && (
                                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                                                        <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: 0 }}>更新日志:</h5>
                                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                            {version.changelog}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)' }}>
                                        <Clock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                        <p>该投影目前没有历史版本记录。</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <aside style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', width: '100%' }} className="animate-fade-in">
                        <div style={{ padding: '0 0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>投影信息</h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleShare} className="glass-button secondary" style={{ padding: '0.4rem', width: 'auto', background: 'transparent' }} title="分享链接">
                                        <Share2 size={16} />
                                    </button>
                                    {canEdit && (
                                        <button onClick={() => setShowConfigModal(true)} className="glass-button secondary" style={{ padding: '0.4rem', width: 'auto', background: 'transparent' }} title="投影管理">
                                            <Settings size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <UserIcon size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>作者</div>
                                        <div
                                            style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}
                                            onClick={() => navigate(`/user/${schematic.creator_name}`)}
                                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                        >
                                            {schematic.creator_name}
                                        </div>
                                    </div>
                                </li>

                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <FileBox size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>类型</div>
                                        <div style={{ fontWeight: 500 }}>
                                            {schematic.schematic_type === 1 ? <span style={{ color: '#3b82f6' }}>投影生成</span> : <span>普通投影</span>}
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

                                {tags.length > 0 && (
                                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                        <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>#</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>标签</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                {tags.map(tag => (
                                                    <span key={tag} style={{
                                                        background: 'var(--glass-highlight)',
                                                        padding: '0.15rem 0.4rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--glass-border)',
                                                    }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </li>
                                )}

                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minHeight: '42px' }}>
                                    <Shield size={18} style={{ color: 'var(--text-tertiary)', marginTop: '2px' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>可见性</div>
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
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: schematic.is_public ? 'var(--success)' : 'var(--error)',
                                                }} />
                                                {schematic.is_public ? 'Public' : 'Private'}
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            setEditVisibility(Boolean(schematic.is_public));
                                                            setIsEditingVisibility(true);
                                                        }}
                                                        className="glass-button secondary"
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
                                        <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{schematic.download_count || 0}</div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>
            </main>

            {showConfigModal && (
                <ConfigModal
                    schematic={schematic}
                    onClose={() => setShowConfigModal(false)}
                    onUpdate={newType => setSchematic(prev => prev ? { ...prev, schematic_type: newType } : prev)}
                    onDelete={handleDelete}
                    onRefresh={fetchSchematicDetail}
                />
            )}

            {showAssemblyModal && (
                <AssemblyModal
                    schematicName={schematic.name}
                    onCancel={() => setShowAssemblyModal(false)}
                    onConfirm={(x, z) => executeDownload(x, z)}
                />
            )}

            {showVersionModal && (
                <VersionUploadModal
                    schematicId={schematic.id}
                    isOpen={showVersionModal}
                    onClose={() => setShowVersionModal(false)}
                    onSuccess={fetchSchematicDetail}
                />
            )}
        </div>
    );
};

export default SchematicDetail;
