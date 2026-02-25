import React from 'react';
import { Download, Clock, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Schematic } from '../../types';

interface SchematicCardProps {
    schematic: Schematic;
}

const SchematicCard: React.FC<SchematicCardProps> = ({ schematic }) => {
    const navigate = useNavigate();

    // Format date beautifully
    const formattedDate = new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: 'short', day: 'numeric'
    }).format(new Date(schematic.created_at));

    return (
        <div
            className="glass-panel schematic-card"
            style={{
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={() => navigate(`/schematic/${schematic.id}`)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.3,
                    wordBreak: 'break-word'
                }}>
                    {schematic.name}
                </h3>
                {schematic.is_public ? (
                    <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--success-bg)', borderRadius: '12px',
                        color: 'var(--success)', fontWeight: '500',
                        border: '1px solid var(--success)'
                    }}>public   </span>
                ) : (
                    <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: 'var(--glass-bg)', borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', fontWeight: '500'
                    }}>private</span>
                )}
            </div>

            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '1rem',
                marginTop: 'auto', paddingTop: '1rem',
                borderTop: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)', fontSize: '0.8rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserIcon size={14} />
                    <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
