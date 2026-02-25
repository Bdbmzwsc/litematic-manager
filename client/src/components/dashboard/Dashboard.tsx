import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Loader2, Inbox } from 'lucide-react';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import SchematicCard from './SchematicCard';
import type { Schematic, User } from '../../types';

const Dashboard: React.FC = () => {
    const [schematics, setSchematics] = useState<Schematic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'my'>('all');

    const token = localStorage.getItem('jwt_token');
    const user: User | null = token ? JSON.parse(localStorage.getItem('user') || '{}') : null;
    const isGuest = sessionStorage.getItem('guest_mode') === 'true';

    // Route Guard
    if (!token && !isGuest) {
        return <Navigate to="/login" replace />;
    }

    useEffect(() => {
        fetchSchematics();
    }, []);

    const fetchSchematics = async (query: string = '') => {
        setLoading(true);
        try {
            const data = await api.schematics.search(query) as Schematic[];
            setSchematics(data);
        } catch (error) {
            console.error('Failed to fetch schematics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        fetchSchematics(searchQuery);
    };

    const filteredSchematics = schematics.filter(s => {
        if (filter === 'my' && user) {
            return s.user_id === user.id;
        }
        return true;
    });

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{
                flex: 1,
                padding: '3rem 2rem',
                maxWidth: '1200px',
                margin: '0 auto',
                width: '100%'
            }}>
                {/* Header Controls */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    marginBottom: '3rem'
                }}>
                    <h2 style={{ fontSize: '2rem', margin: 0 }}>浏览投影</h2>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        {/* Search Bar */}
                        <form
                            onSubmit={handleSearch}
                            style={{
                                display: 'flex',
                                flex: 1,
                                minWidth: '300px',
                                maxWidth: '500px',
                                position: 'relative'
                            }}
                        >
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="搜索名称..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingRight: '3rem', borderRadius: 'var(--radius-lg)' }}
                            />
                            <button
                                type="submit"
                                style={{
                                    position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                    background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                    cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <Search size={18} />
                            </button>
                        </form>

                        {/* Filters */}
                        <div style={{
                            display: 'flex',
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '0.25rem',
                            gap: '0.25rem'
                        }}>
                            <button
                                onClick={() => setFilter('all')}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: 'calc(var(--radius-lg) - 4px)',
                                    border: 'none',
                                    background: filter === 'all' ? 'var(--text-primary)' : 'transparent',
                                    color: filter === 'all' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                所有投影
                            </button>
                            {user && (
                                <button
                                    onClick={() => setFilter('my')}
                                    style={{
                                        padding: '0.5rem 1.25rem',
                                        borderRadius: 'calc(var(--radius-lg) - 4px)',
                                        border: 'none',
                                        background: filter === 'my' ? 'var(--text-primary)' : 'transparent',
                                        color: filter === 'my' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontSize: '0.9rem',
                                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                                    }}
                                >
                                    我的投影
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        <Loader2 size={32} className="animate-spin" />
                    </div>
                ) : filteredSchematics.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {filteredSchematics.map(schematic => (
                            <SchematicCard key={schematic.id} schematic={schematic} />
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel" style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '4rem 2rem', textAlign: 'center'
                    }}>
                        <Inbox size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>未找到投影</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {searchQuery ? `未找到匹配 "${searchQuery}" 的结果` : '目前没有可显示的投影'}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
