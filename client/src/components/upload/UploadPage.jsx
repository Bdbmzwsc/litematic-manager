import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileBox, CheckCircle, AlertCircle, Loader2, ChevronLeft, X } from 'lucide-react';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';

const UploadPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null); // { success: bool, message: string, id?: number }

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (f) => {
        setUploadResult(null);
        if (!f.name.endsWith('.litematic')) {
            setUploadResult({ success: false, message: '仅支持 .litematic 文件' });
            return;
        }
        setFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        try {
            setUploading(true);
            setUploadResult(null);
            const result = await api.schematics.upload(file);
            setUploadResult({
                success: true,
                message: `"${result.name || file.name}" 上传成功`,
                id: result.id
            });
            setFile(null);
        } catch (err) {
            console.error('Upload error:', err);
            setUploadResult({ success: false, message: err.message || '上传失败，请重试' });
        } finally {
            setUploading(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setUploadResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, padding: '2rem', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                        marginBottom: '1.5rem', fontSize: '0.9rem', padding: 0, fontWeight: '500',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <ChevronLeft size={16} />
                    返回
                </button>

                <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        上传投影
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
                        选择一个 <code style={{ background: 'var(--glass-bg)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>.litematic</code> 文件进行上传
                    </p>

                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${dragActive ? 'var(--text-primary)' : 'var(--glass-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: dragActive ? 'var(--glass-highlight)' : 'transparent',
                            transition: 'all 0.3s ease',
                            marginBottom: '1.5rem'
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".litematic"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <Upload size={40} style={{ color: dragActive ? 'var(--text-primary)' : 'var(--text-tertiary)', marginBottom: '1rem', transition: 'color 0.3s' }} />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                            {dragActive ? '请松开鼠标...' : '将 .litematic 文件拖放到此处'}
                        </p>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                            或点击浏览文件
                        </p>
                    </div>

                    {/* Selected File Info */}
                    {file && (
                        <div className="glass-panel" style={{
                            padding: '1rem 1.25rem',
                            display: 'flex', alignItems: 'center', gap: '1rem',
                            marginBottom: '1.5rem',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            <FileBox size={24} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
                                    cursor: 'pointer', padding: '0.25rem', display: 'flex'
                                }}
                                title="移除文件"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        className="glass-button"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        style={{
                            padding: '0.85rem',
                            fontSize: '1rem',
                            opacity: (!file || uploading) ? 0.5 : 1,
                            cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                正在上传...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                上传投影
                            </>
                        )}
                    </button>

                    {/* Result Message */}
                    {uploadResult && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1rem 1.25rem',
                            borderRadius: 'var(--radius-md)',
                            background: uploadResult.success ? 'var(--success-bg)' : 'var(--error-bg)',
                            border: `1px solid ${uploadResult.success ? 'var(--success)' : 'var(--error)'}`,
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {uploadResult.success ? (
                                <CheckCircle size={20} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            ) : (
                                <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
                            )}
                            <span style={{ color: uploadResult.success ? 'var(--success)' : 'var(--error)', fontWeight: '500', flex: 1 }}>
                                {uploadResult.message}
                            </span>
                            {uploadResult.success && uploadResult.id && (
                                <button
                                    className="glass-button"
                                    onClick={() => navigate(`/schematic/${uploadResult.id}`)}
                                    style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                                >
                                    查看详情
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
};

export default UploadPage;
