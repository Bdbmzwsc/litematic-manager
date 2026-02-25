import React, { useState } from 'react';
import { X, Download, Box } from 'lucide-react';

interface AssemblyModalProps {
    onConfirm: (x: number, z: number) => void;
    onCancel: () => void;
    schematicName: string;
}

const AssemblyModal: React.FC<AssemblyModalProps> = ({ onConfirm, onCancel, schematicName }) => {
    const [x, setX] = useState<number | string>(1);
    const [z, setZ] = useState<number | string>(1);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const parsedX = parseInt(String(x));
        const parsedZ = parseInt(String(z));

        if (isNaN(parsedX) || isNaN(parsedZ) || parsedX <= 0 || parsedZ <= 0) {
            setError('x 和 z 必须为正整数');
            return;
        }

        onConfirm(parsedX, parsedZ);
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
            onClick={onCancel}
        >
            <div
                className="glass-panel animate-fade-in-up"
                style={{
                    padding: '2rem', width: '90%', maxWidth: '400px',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)', textAlign: 'center'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onCancel}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', padding: '0.25rem', display: 'flex'
                    }}
                >
                    <X size={18} />
                </button>

                <div style={{
                    display: 'inline-flex', padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%',
                    color: '#3b82f6', marginBottom: '1.25rem',
                }}>
                    <Box size={28} />
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    投影生成
                </h3>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    此投影支持投影生成，请输入大小
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            X
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={x}
                            onChange={(e) => {
                                setX(e.target.value);
                                setError('');
                            }}
                            className="glass-input"
                            style={{ width: '100%', textAlign: 'center', fontSize: '1.1rem', padding: '0.6rem' }}
                        />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            Z
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={z}
                            onChange={(e) => {
                                setZ(e.target.value);
                                setError('');
                            }}
                            className="glass-input"
                            style={{ width: '100%', textAlign: 'center', fontSize: '1.1rem', padding: '0.6rem' }}
                        />
                    </div>
                </div>

                {error && (
                    <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="glass-button secondary" onClick={onCancel} style={{ flex: 1 }}>
                        取消
                    </button>
                    <button className="glass-button" onClick={handleConfirm} style={{ flex: 1, background: '#3b82f6' }}>
                        <Download size={18} style={{ marginRight: '0.5rem' }} />
                        下载
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssemblyModal;
