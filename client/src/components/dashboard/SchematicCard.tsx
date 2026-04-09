import React from 'react';
import { Download, Clock, User as UserIcon, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Schematic } from '../../types';

interface SchematicCardProps {
    schematic: Schematic;
    onTogglePin?: (id: number, currentPinStatus: boolean) => Promise<void>;
}

const SchematicCard: React.FC<SchematicCardProps> = ({ schematic, onTogglePin }) => {
    const navigate = useNavigate();
    const [isHovering, setIsHovering] = React.useState(false);
    
    // Check if current user is admin
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isAdmin = currentUser?.role === 'admin';

    // Format date beautifully
    const formattedDate = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric'
    }).format(new Date(schematic.created_at));

    return (
        <div
            className="glass-panel schematic-card"
            style={{
                width: '100%',
                aspectRatio: '384.656 / 293.75',
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden'
            }}
            onClick={() => navigate(`/schematic/${schematic.id}`)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flex: 1,
                    minWidth: 0,
                    paddingRight: '0.5rem'
                }}>
                    {Boolean(schematic.is_pinned) ? (
                        <Pin 
                            size={16} 
                            style={{ 
                                color: 'var(--text-primary)', 
                                fill: 'currentColor', 
                                flexShrink: 0,
                                cursor: isAdmin ? 'pointer' : 'inherit',
                                opacity: 1,
                                transition: 'all 0.2s'
                            }} 
                            onClick={(e) => {
                                if (!isAdmin || !onTogglePin) return;
                                e.stopPropagation();
                                onTogglePin(schematic.id, true);
                            }}
                        />
                    ) : (isAdmin && isHovering) ? (
                        <Pin 
                            size={16} 
                            style={{ 
                                color: 'var(--text-primary)', 
                                flexShrink: 0, 
                                opacity: 0.4,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }} 
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onTogglePin) onTogglePin(schematic.id, false);
                            }}
                        />
                    ) : null}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {schematic.name}
                    </span>
                </h3>
                {schematic.is_public ? (
                    <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--success-bg)', borderRadius: '12px',
                        color: 'var(--success)', fontWeight: '500',
                        border: '1px solid var(--success)',
                        flexShrink: 0
                    }}>public   </span>
                ) : (
                    <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--glass-bg)', borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', fontWeight: '500',
                        flexShrink: 0
                    }}>private</span>
                )}
            </div>

            <div style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                wordBreak: 'break-word'
            }}>
                {schematic.description || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>暂无简介</span>}
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '1rem',
                marginTop: 'auto', paddingTop: '1rem',
                borderTop: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)', fontSize: '0.8rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '30%' }}>
                    <UserIcon size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {schematic.creator_name}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} />
                    <span>{formattedDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                    <Download size={14} />
                    <span>{schematic.download_count || 0}</span>
                </div>
            </div>
        </div>
    );
};

export default SchematicCard;
