import React, { useState } from 'react';
import { UserPlus, User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import './Login.css'; // Reuse same CSS

export default function Register({ onRegisterSuccess, onNavigate }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fullName: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.username || !formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) {
            setError('Semua field harus diisi');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password minimal 8 karakter');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok');
            return;
        }

        setLoading(true);

        try {
            // Simulate registration - replace with actual API call
            // const response = await Register(formData);

            // For now, just show success and redirect to login
            setTimeout(() => {
                onNavigate && onNavigate('login');
            }, 1500);

        } catch (err) {
            setError('Registrasi gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo">
                        <UserPlus size={48} />
                    </div>
                    <h1>Daftar Akun Baru</h1>
                    <p>Vyntory Motor - Dealer Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="login-form-group">
                        <label htmlFor="fullName">Nama Lengkap</label>
                        <div className="login-input-wrapper">
                            <User size={20} />
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Masukkan nama lengkap"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="login-form-group">
                        <label htmlFor="username">Username</label>
                        <div className="login-input-wrapper">
                            <User size={20} />
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Masukkan username"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="login-form-group">
                        <label htmlFor="email">Email</label>
                        <div className="login-input-wrapper">
                            <Mail size={20} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Masukkan email"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="login-form-group">
                        <label htmlFor="password">Password</label>
                        <div className="login-input-wrapper">
                            <Lock size={20} />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Minimal 8 karakter"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="login-form-group">
                        <label htmlFor="confirmPassword">Konfirmasi Password</label>
                        <div className="login-input-wrapper">
                            <Lock size={20} />
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Ulangi password"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Memproses...' : 'Daftar'}
                    </button>

                    <div className="login-register">
                        <span>Sudah punya akun? </span>
                        <button
                            type="button"
                            className="login-link"
                            onClick={() => onNavigate && onNavigate('login')}
                        >
                            Masuk sekarang
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
