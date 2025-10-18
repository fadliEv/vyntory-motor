import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import './Modal.css';

// Alert Modal Component (Success, Error, Info)
export function AlertModal({ isOpen, onClose, type = 'success', title, message }) {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle size={48} className="modal-alert-icon-success" />,
    error: <AlertCircle size={48} className="modal-alert-icon-error" />,
    info: <Info size={48} className="modal-alert-icon-info" />,
  };

  const titles = {
    success: title || 'Berhasil!',
    error: title || 'Terjadi Kesalahan',
    info: title || 'Informasi',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-alert-icon-wrapper modal-alert-type-${type}`}>
          {icons[type]}
        </div>
        <h3 className="modal-alert-title">{titles[type]}</h3>
        <p className="modal-alert-message">{message}</p>
        <button onClick={onClose} className="modal-alert-btn">
          OK
        </button>
      </div>
    </div>
  );
}

// Confirm Modal Component (Yes/No)
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Ya', cancelText = 'Batal', type = 'danger' }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-confirm-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-confirm-header">
          <h3 className="modal-confirm-title">{title || 'Konfirmasi'}</h3>
          <button onClick={onClose} className="modal-confirm-close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-confirm-body">
          <p className="modal-confirm-message">{message}</p>
        </div>
        <div className="modal-confirm-footer">
          <button onClick={onClose} className="modal-confirm-btn modal-confirm-btn-cancel">
            {cancelText}
          </button>
          <button onClick={handleConfirm} className={`modal-confirm-btn modal-confirm-btn-${type}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
