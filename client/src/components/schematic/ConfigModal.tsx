import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Settings } from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import type { Schematic } from '../../types';

interface ConfigModalProps {
    schematic: Schematic;
    onClose: () => void;
    onUpdate: (newType: number) => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ schematic, onClose, onUpdate }) => {
    const { showNotification } = useNotification();
    const [type, setType] = useState(schematic.schematic_type?.toString() || '0');
    const [configStr, setConfigStr] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
            onClose();
        } catch (err) {
            showNotification('保存失败: ' + (err instanceof Error ? err.message : String(err)), 'error');
        } finally {
            setSaving(false);
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
                    padding: '2rem', width: '90%', maxWidth: '500px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.25rem' }}>
                        <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
                        编辑投影配置
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
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" style={{ color: 'var(--text-secondary)' }} size={32} />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
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
                                <option value="1">投影生成</option>
                            </select>
                        </div>

                        {type === '1' && (
                            <div className="animate-fade-in">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    配置
                                </label>
                                <textarea
                                    className="glass-input"
                                    value={configStr}
                                    onChange={e => setConfigStr(e.target.value)}
                                    style={{
                                        width: '100%', minHeight: '200px', resize: 'vertical',
                                        padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem'
                                    }}
                                    spellCheck={false}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                            <button className="glass-button secondary" onClick={onClose} disabled={saving} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                                取消
                            </button>
                            <button className="glass-button" onClick={handleSave} disabled={saving} style={{ width: 'auto', padding: '0.5rem 1.5rem', background: 'var(--success)' }}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                保存
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfigModal;
