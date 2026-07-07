import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User as UserIcon, Calendar, Loader2, Inbox, ChevronLeft } from 'lucide-react';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import SchematicCard from '../dashboard/SchematicCard';
import type { Schematic } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const AuthorProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<{ id: number; username: string; role: string; avatar_url?: string; bio?: string; created_at: string } | null>(null);
    const [schematics, setSchematics] = useState<Schematic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!username) return;
            setLoading(true);
            try {
                const profileData = await api.auth.getPublicProfile(username);
                setProfile(profileData);
                const schematicsData = await api.schematics.search(username) as Schematic[];
                setSchematics(schematicsData);
            } catch (error) {
                console.error("Failed to load author profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [username]);

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

    if (!profile) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--text-secondary)' }}>找不到该用户</h2>
                </div>
            </div>
        );
    }

    const joinDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(new Date(profile.created_at));

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                        fontSize: '0.9rem', padding: 0, fontWeight: '500', marginBottom: '1.5rem',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                    <ChevronLeft size={16} /> 返回
                </button>

                {/* Profile Header */}
                <div className="glass-panel animate-fade-in" style={{ padding: '3rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: 'var(--glass-bg)', border: '2px solid var(--glass-border)',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '3rem', color: 'var(--text-tertiary)' }}>
                                {profile.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <h1 style={{ fontSize: '2rem', margin: 0 }}>{profile.username}</h1>
                            {profile.role === 'admin' && (
                                <span style={{
                                    fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                                    background: 'var(--success-bg)', borderRadius: '12px',
                                    color: 'var(--success)', border: '1px solid var(--success)', fontWeight: 'bold'
                                }}>ADMIN</span>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><UserIcon size={14} /> 投影数量: {schematics.length}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> 加入于 {joinDate}</span>
                        </div>
                        
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, maxWidth: '600px' }}>
                            {profile.bio || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>这家伙很懒，什么都没写。</span>}
                        </p>
                    </div>
                </div>

                {/* Schematics List */}
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{profile.username} 的公开投影</h3>
                
                {schematics.length > 0 ? (
                    <motion.div 
                        layout
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}
                    >
                        <AnimatePresence mode="popLayout">
                            {schematics.map(schematic => (
                                <motion.div
                                    key={schematic.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                                >
                                    <SchematicCard schematic={schematic} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Inbox size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>暂无投影</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>该用户还没有上传任何公开的投影。</p>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AuthorProfile;