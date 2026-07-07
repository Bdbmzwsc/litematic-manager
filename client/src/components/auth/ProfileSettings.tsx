import React, { useState, useRef } from 'react';
import { Camera, Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import type { User } from '../../types';

interface ProfileSettingsProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (user: User) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, isOpen, onClose, onUpdate }) => {
    const [bio, setBio] = useState(user.bio || '');
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await api.auth.updateProfile({ bio });
            showNotification('个人资料已更新', 'success');
            onUpdate({ ...user, bio: res.bio });
            onClose();
        } catch (error) {
            console.error(error);
            showNotification('更新失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('只能上传图片文件', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('图片不能超过5MB', 'error');
            return;
        }

        setUploadingAvatar(true);
        try {
            const res = await api.auth.uploadAvatar(file);
            showNotification('头像上传成功', 'success');
            onUpdate({ ...user, avatar_url: res.avatar_url });
        } catch (error) {
            console.error(error);
            showNotification('头像上传失败', 'error');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
                        }}
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="glass-panel"
                        style={{
                            position: 'relative', width: '100%', maxWidth: '400px',
                            padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>编辑个人资料</h3>
                            <button 
                                onClick={onClose}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                    cursor: 'pointer', padding: '0.25rem'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    background: 'var(--glass-bg)', border: '2px solid var(--glass-border)',
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {uploadingAvatar ? (
                                        <Loader2 className="animate-spin text-secondary" size={32} />
                                    ) : user.avatar_url ? (
                                        <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '2rem', color: 'var(--text-tertiary)' }}>
                                            {user.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        background: 'var(--text-primary)', color: 'var(--bg-primary)',
                                        border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Camera size={16} />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    style={{ display: 'none' }} 
                                />
                            </div>
                            <span style={{ fontWeight: '500' }}>{user.username}</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">个人简介</label>
                            <textarea
                                className="glass-input"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="介绍一下你自己..."
                                rows={3}
                                style={{ resize: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button className="glass-button secondary" onClick={onClose}>
                                取消
                            </button>
                            <button className="glass-button" onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                保存修改
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProfileSettings;