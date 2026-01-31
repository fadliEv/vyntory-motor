import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import './DocumentUploader.css';

const DOCUMENT_TYPES = [
    { value: 'bpkb', label: 'BPKB' },
    { value: 'stnk', label: 'STNK' },
    { value: 'faktur', label: 'Faktur' },
    { value: 'kwitansi', label: 'Kwitansi' },
    { value: 'ktp', label: 'KTP Pemilik' },
    { value: 'foto', label: 'Foto Motor' },
    { value: 'lainnya', label: 'Lainnya' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export default function DocumentUploader({ onFilesChange, maxFiles = 10, existingCount = 0 }) {
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');

    const maxAllowed = maxFiles - existingCount;

    const validateFile = (file) => {
        if (file.size > MAX_FILE_SIZE) {
            return `File ${file.name} terlalu besar. Maksimal 10MB`;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return `File ${file.name} tidak didukung. Hanya PDF, JPG, dan PNG`;
        }
        return null;
    };

    const handleFiles = (newFiles) => {
        setError('');

        const fileArray = Array.from(newFiles);
        const totalFiles = files.length + fileArray.length;

        if (totalFiles > maxAllowed) {
            setError(`Maksimal ${maxAllowed} file (sudah ada ${existingCount} dokumen)`);
            return;
        }

        const validatedFiles = [];
        for (const file of fileArray) {
            const error = validateFile(file);
            if (error) {
                setError(error);
                return;
            }

            validatedFiles.push({
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                documentType: 'lainnya',
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            });
        }

        const updatedFiles = [...files, ...validatedFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [files]);

    const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const removeFile = (index) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    const updateDocumentType = (index, documentType) => {
        const updatedFiles = [...files];
        updatedFiles[index].documentType = documentType;
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="document-uploader">
            <div
                className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleChange}
                    className="file-input"
                />
                <label htmlFor="file-upload" className="upload-label">
                    <Upload size={48} />
                    <p className="upload-text">
                        Drag & drop file atau <span className="upload-link">pilih file</span>
                    </p>
                    <p className="upload-hint">
                        PDF, JPG, PNG (Max 10MB per file, max {maxAllowed} files)
                    </p>
                </label>
            </div>

            {error && (
                <div className="upload-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {files.length > 0 && (
                <div className="files-list">
                    <h4>File yang akan diupload ({files.length}/{maxAllowed})</h4>
                    {files.map((fileItem, index) => (
                        <div key={index} className="file-item">
                            <div className="file-icon">
                                {fileItem.type === 'application/pdf' ? (
                                    <FileText size={24} color="#dc2626" />
                                ) : (
                                    <ImageIcon size={24} color="#059669" />
                                )}
                            </div>
                            <div className="file-info">
                                <p className="file-name">{fileItem.name}</p>
                                <p className="file-size">{formatFileSize(fileItem.size)}</p>
                            </div>
                            <select
                                value={fileItem.documentType}
                                onChange={(e) => updateDocumentType(index, e.target.value)}
                                className="doc-type-select"
                            >
                                {DOCUMENT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="remove-btn"
                                title="Hapus"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
