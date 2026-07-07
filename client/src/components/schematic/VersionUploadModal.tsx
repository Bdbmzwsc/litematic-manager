import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, FileBox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';

interface VersionUploadModalProps {
    schematicId: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const VersionUploadModal: React.FC<VersionUploadModalProps> = ({ schematicId, isOpen, onClose, onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [versionName, setVersionName] = useState('');
    const [changelog, setChangelog] = useState('');
    const [uploading, setUploading] = useState(false);
    const { showNotification } = useNotification();

    const handleUpload = async () => {
        if (!file || !versionName.trim()) {
            showNotification('请选择文件并输入版本号', 'error');
            return;
        }

        setUploading(true);
        try {
            await api.schematics.reupload(schematicId, file, {
                version_name: versionName.trim(),
                changelog: changelog.trim()
            });
            showNotification('新版本上传成功', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showNotification(error instanceof Error ? error.message : '上传失败', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass-panel"
                        style={{
                            position: 'relative', width: '100%', maxWidth: '500px',
                            padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>上传新版本</h3>
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">投影文件 (.litematic)</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <button 
                                        className="glass-button secondary" 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ width: 'auto' }}
                                    >
                                        <FileBox size={16} /> 选择文件
                                    </button>
                                    <span style={{ fontSize: '0.9rem', color: file ? 'var(--text-primary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {file ? file.name : '未选择文件'}
                                    </span>
                                </div>
                                <input type="file" ref={fileInputRef} accept=".litematic" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">原版本名称备份为 (Version Name)</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="例如：v1.0.0 (将作为历史记录存档)"
                                    value={versionName}
                                    onChange={e => setVersionName(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">原版本更新日志 (Changelog - 可选)</label>
                                <textarea
                                    className="glass-input"
                                    placeholder="简述上个版本的内容或本次更新解决了什么..."
                                    value={changelog}
                                    onChange={e => setChangelog(e.target.value)}
                                    rows={3}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button className="glass-button secondary" onClick={onClose} disabled={uploading}>取消</button>
                            <button className="glass-button" onClick={handleUpload} disabled={uploading || !file || !versionName.trim()}>
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                开始上传
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VersionUploadModal;