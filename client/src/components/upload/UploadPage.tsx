import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileBox, CheckCircle, AlertCircle, Loader2, ChevronLeft, X } from 'lucide-react';
import { api } from '../../lib/api';
import Navbar from '../layout/Navbar';
import type { UploadResult } from '../../types';

const UploadPage: React.FC = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    // New Fields State
    const [description, setDescription] = useState('');
    const [type, setType] = useState('0'); // '0' or '1'
    const [configStr, setConfigStr] = useState('[\n  {\n    "name": "region_name",\n    "position": ["0", "0", "0"],\n    "generate_direct": "+x"\n  }\n]');

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
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (f: File) => {
        setUploadResult(null);
        if (!f.name.endsWith('.litematic')) {
            setUploadResult({ success: false, message: '仅支持 .litematic 文件' });
            return;
        }
        setFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;

        let parsedConfig: unknown[] = [];
        if (type === '1') {
            try {
                parsedConfig = JSON.parse(configStr);
                if (!Array.isArray(parsedConfig)) {
                    throw new Error('配置必须是一个 JSON 数组');
                }
            } catch (e) {
                setUploadResult({ success: false, message: `配置 JSON 格式错误: ${e instanceof Error ? e.message : String(e)}` });
                return;
            }
        }

        try {
            setUploading(true);
            setUploadResult(null);
            const result = await api.schematics.upload(file, {
                description,
                type: parseInt(type),
                config: parsedConfig
            }) as { name?: string; id?: number };
            setUploadResult({
                success: true,
                message: `"${result.name || file.name}" 上传成功`,
                id: result.id
            });
            setFile(null);
            setDescription('');
            setType('0');
        } catch (err) {
            console.error('Upload error:', err);
            setUploadResult({ success: false, message: err instanceof Error ? err.message : '上传失败，请重试' });
        } finally {
            setUploading(false);
        }
    };

    const handleClear = () => {
        setFile(null);
        setUploadResult(null);
        setDescription('');
        setType('0');
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
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
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
                        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="glass-panel" style={{
                                padding: '1rem 1.25rem',
                                display: 'flex', alignItems: 'center', gap: '1rem',
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

                            {/* Additional Settings */}
                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        项目说明 (README)
                                    </label>
                                    <textarea
                                        className="glass-input"
                                        placeholder="使用 Markdown 编写您的项目说明..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        style={{ width: '100%', minHeight: '120px', resize: 'vertical', padding: '0.75rem', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                                        投影类型
                                    </label>
                                    <select
                                        className="glass-input"
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                                    >
                                        <option value="0">普通投影</option>
                                        <option value="1">投影生成</option>
                                    </select>
                                </div>

                                {type === '1' && (
                                    <div className="animate-fade-in">
                                        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>
                                            配置
                                        </label>
                                        <textarea
                                            className="glass-input"
                                            value={configStr}
                                            onChange={e => setConfigStr(e.target.value)}
                                            style={{
                                                width: '100%', minHeight: '180px', resize: 'vertical',
                                                padding: '0.75rem', fontSize: '0.85rem',
                                                fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace'
                                            }}
                                            spellCheck={false}
                                        />
                                    </div>
                                )}
                            </div>
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
