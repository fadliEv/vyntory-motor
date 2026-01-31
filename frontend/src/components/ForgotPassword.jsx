import React, { useState } from 'react';
import { KeyRound, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import './Login.css'; // Reuse same CSS

export default function ForgotPassword({ onNavigate }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email) {
            setError('Email harus diisi');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Format email tidak valid');
            return;
        }

        setLoading(true);

        try {
            // Simulate forgot password API call
            // const response = await ForgotPassword(email);

            // For now, just show success message
            setTimeout(() => {
                setSuccess(true);
                setLoading(false);
            }, 1500);

        } catch (err) {
            setError('Gagal mengirim email reset password. Silakan coba lagi.');
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo">
                        <KeyRound size={48} />
                    </div>
                    <h1>Lupa Password?</h1>
                    <p>Masukkan email Anda untuk reset password</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            <CheckCircle size={16} />
                            <span>Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.</span>
                        </div>
                    )}

                    {!success && (
                        <>
                            <div className="login-form-group">
                                <label htmlFor="email">Email</label>
                                <div className="login-input-wrapper">
                                    <Mail size={20} />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Masukkan email terdaftar"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="login-btn"
                                disabled={loading}
                            >
                                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
                            </button>
                        </>
                    )}

                    <div className="login-register" style={{ marginTop: success ? '0' : '20px' }}>
                        <button
                            type="button"
                            className="login-link"
                            onClick={() => onNavigate && onNavigate('login')}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                        >
                            <ArrowLeft size={16} />
                            Kembali ke Login
                        </button>
                    </div>
                </form>

                <div className="login-footer">
                    <p>© 2026 Vyntory Motor. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
