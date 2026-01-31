import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import './DocumentPreview.css';

export default function DocumentPreview({ document, fileData, onClose }) {
    const [zoom, setZoom] = useState(100);

    const isPDF = document.mime_type === 'application/pdf';
    const isImage = document.mime_type.startsWith('image/');

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = fileData;
        link.download = document.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    return (
        <div className="document-preview-overlay" onClick={onClose}>
            <div className="document-preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="document-preview-header">
                    <div className="document-preview-info">
                        <h3>{document.file_name}</h3>
                        <p>{document.document_type.toUpperCase()} • {(document.file_size / 1024).toFixed(2)} KB</p>
                    </div>
                    <div className="document-preview-actions">
                        {isImage && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleZoomOut}
                                    className="preview-btn"
                                    title="Zoom Out"
                                >
                                    <ZoomOut size={20} />
                                </button>
                                <span className="zoom-level">{zoom}%</span>
                                <button
                                    type="button"
                                    onClick={handleZoomIn}
                                    className="preview-btn"
                                    title="Zoom In"
                                >
                                    <ZoomIn size={20} />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="preview-btn"
                            title="Download"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="preview-btn close-btn"
                            title="Tutup"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="document-preview-content">
                    {isPDF && (
                        <iframe
                            src={fileData}
                            className="pdf-viewer"
                            title={document.file_name}
                        />
                    )}
                    {isImage && (
                        <div className="image-viewer">
                            <img
                                src={fileData}
                                alt={document.file_name}
                                style={{ transform: `scale(${zoom / 100})` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
