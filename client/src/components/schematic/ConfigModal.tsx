import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, Settings, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import type { Schematic } from '../../types';

interface ConfigModalProps {
    schematic: Schematic;
    onClose: () => void;
    onUpdate: (newType: number) => void;
    onDelete?: () => void;
    onRefresh?: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ schematic, onClose, onUpdate, onDelete, onRefresh }) => {
    const { showNotification } = useNotification();
    const [type, setType] = useState(schematic.schematic_type?.toString() || '0');
    const [configStr, setConfigStr] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isReuploading, setIsReuploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data = await api.schematics.getConfig(schematic.id);
                setType(data.type.toString());
                setConfigStr(JSON.stringify(data.config, null, 2));
            } catch (err) {
                showNotification('加载配置失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [schematic.id, onClose, showNotification]);

    const handleSave = async () => {
        let parsedConfig: unknown[] = [];
        if (type === '1') {
            try {
                parsedConfig = JSON.parse(configStr);
                if (!Array.isArray(parsedConfig)) {
                    throw new Error('配置必须是一个 JSON 数组');
                }
            } catch (e) {
                showNotification(`配置错误: ${e instanceof Error ? e.message : String(e)}`, 'error');
                return;
            }
        }

        try {
            setSaving(true);
            await api.schematics.updateConfig(schematic.id, {
                type: parseInt(type),
                config: parsedConfig
            });
            showNotification('配置已保存', 'success');
            onUpdate(parseInt(type));
            // Removed onClose() here so modal stays open after save
        } catch (err) {
            showNotification('保存失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (f: File) => {
        if (!f.name.endsWith('.litematic')) {
            showNotification('只能上传 .litematic 格式的文件', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setSelectedFile(f);
    };

    const handleUploadConfirm = async () => {
        if (!selectedFile) return;

        try {
            setIsReuploading(true);
            await api.schematics.reupload(schematic.id, selectedFile);
            showNotification('投影文件更新成功！', 'success');
            setSelectedFile(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Re-upload error:", err);
            showNotification(err instanceof Error ? err.message : "重新上传投影失败", 'error');
        } finally {
            setIsReuploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, animation: 'fadeIn 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                className="glass-panel animate-fade-in-up"
                style={{
                    padding: '2rem', width: '90%', maxWidth: '600px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
                        <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
                        投影管理
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', padding: '0.25rem', display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <Loader2 className="animate-spin" style={{ color: 'var(--text-secondary)' }} size={32} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem', flex: 1 }}>

                        {/* Section 1: Basic Config */}
                        <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>配置文件</h4>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    投影类型
                                </label>
                                <select
                                    className="glass-input"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                >
                                    <option value="0">普通投影</option>
                                    <option value="1">单层生成 (Assembly)</option>
                                </select>
                            </div>

                            {type === '1' && (
                                <div className="animate-fade-in" style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Assembly JSON 配置
                                    </label>
                                    <textarea
                                        className="glass-input"
                                        value={configStr}
                                        onChange={e => setConfigStr(e.target.value)}
                                        style={{
                                            width: '100%', minHeight: '150px', resize: 'vertical',
                                            padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem'
                                        }}
                                        spellCheck={false}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button
                                    className="glass-button"
                                    onClick={handleSave}
                                    disabled={saving || isReuploading}
                                    style={{ width: 'auto', padding: '0.5rem 1.5rem', background: 'var(--success)' }}
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    保存配置
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Upload File */}
                        <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>更新文件</h4>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".litematic"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            {!selectedFile ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragActive ? 'var(--text-primary)' : 'var(--glass-border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        padding: '2rem 1.5rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        background: dragActive ? 'var(--glass-highlight)' : 'transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Upload size={32} style={{ color: dragActive ? 'var(--text-primary)' : 'var(--text-tertiary)', margin: '0 auto 1rem auto', transition: 'color 0.3s' }} />

                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 0.25rem 0', fontWeight: 500 }}>
                                        {dragActive ? '松开鼠标以选择文件' : '点击或拖拽文件到此处'}
                                    </p>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', margin: 0 }}>
                                        支持 .litematic 格式。更新后之前的渲染缓存会被重新生成。
                                    </p>
                                </div>
                            ) : (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{
                                        padding: '1rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative'
                                    }}>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem', paddingRight: '2rem' }}>
                                                {selectedFile.name}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            disabled={isReuploading}
                                            style={{
                                                position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                                                cursor: isReuploading ? 'not-allowed' : 'pointer', padding: '0.25rem', display: 'flex',
                                                opacity: isReuploading ? 0.5 : 1
                                            }}
                                            title="取消并重新选择文件"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                        <button
                                            className="glass-button"
                                            onClick={handleUploadConfirm}
                                            disabled={isReuploading}
                                            style={{ width: 'auto', padding: '0.5rem 1.5rem' }}
                                        >
                                            {isReuploading ? (
                                                <><Loader2 size={16} className="animate-spin" /> 更新中...</>
                                            ) : (
                                                <><Upload size={16} /> 确认更新</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Danger Zone */}
                        {onDelete && (
                            <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: 'var(--error)' }}>危险操作</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>删除此投影将无法恢复，相关文件也将被永久移除。</span>
                                    <button
                                        className="glass-button secondary"
                                        onClick={onDelete}
                                        disabled={saving || isReuploading}
                                        style={{ width: 'auto', padding: '0.5rem 1rem', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.3)', flexShrink: 0 }}
                                    >
                                        删除投影
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfigModal;
