import React from 'react';
import { FileText, Image as ImageIcon, Eye, Trash2 } from 'lucide-react';
import './DocumentList.css';

export default function DocumentList({
    documents,
    onDocumentClick,
    onDocumentDelete,
    editable = false
}) {
    const getDocTypeLabel = (type) => {
        const labels = {
            bpkb: 'BPKB',
            stnk: 'STNK',
            faktur: 'Faktur',
            kwitansi: 'Kwitansi',
            ktp: 'KTP',
            foto: 'Foto Motor',
            lainnya: 'Lainnya',
        };
        return labels[type] || type.toUpperCase();
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const getFileIcon = (mimeType) => {
        if (mimeType === 'application/pdf') {
            return <FileText size={24} color="#dc2626" />;
        }
        return <ImageIcon size={24} color="#059669" />;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (!documents || documents.length === 0) {
        return (
            <div className="document-list-empty">
                <FileText size={48} color="#d1d5db" />
                <p>Belum ada dokumen</p>
            </div>
        );
    }

    return (
        <div className="document-list">
            <div className="document-list-header">
                <h4>📄 Dokumen Motor ({documents.length})</h4>
            </div>
            <div className="document-grid">
                {documents.map((doc) => (
                    <div key={doc.id} className="document-card">
                        <div className="document-card-icon">
                            {getFileIcon(doc.mime_type)}
                        </div>
                        <div className="document-card-content">
                            <span className="document-type-badge">
                                {getDocTypeLabel(doc.document_type)}
                            </span>
                            <h5 className="document-name">{doc.file_name}</h5>
                            <div className="document-meta">
                                <span>{formatFileSize(doc.file_size)}</span>
                                <span>•</span>
                                <span>{formatDate(doc.uploaded_at)}</span>
                            </div>
                        </div>
                        <div className="document-card-actions">
                            <button
                                type="button"
                                className="doc-action-btn view"
                                onClick={() => onDocumentClick(doc)}
                                title="Lihat"
                            >
                                <Eye size={16} />
                            </button>
                            {editable && onDocumentDelete && (
                                <button
                                    type="button"
                                    className="doc-action-btn delete"
                                    onClick={() => onDocumentDelete(doc)}
                                    title="Hapus"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
