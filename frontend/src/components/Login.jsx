import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import { Login as LoginAPI } from '../../wailsjs/go/main/App';
import './Login.css';

export default function Login({ onLoginSuccess, onNavigate }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Username dan password harus diisi');
            return;
        }

        setLoading(true);

        try {
            // Call real Login API
            const response = await LoginAPI(username, password);

            if (!response.success) {
                setError(response.message || 'Login gagal. Silakan coba lagi.');
                setLoading(false);
                return;
            }

            // Save session token and user to localStorage
            const { token, user } = response.data;
            localStorage.setItem('sessionToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Call success callback
            onLoginSuccess(user);

        } catch (err) {
            console.error('Login error:', err);
            setError('Login gagal. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <div className="login-logo">
                        <LogIn size={48} />
                    </div>
                    <h1>Vyntory Motor</h1>
                    <p>Dealer Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="login-form-group">
                        <label htmlFor="username">Username</label>
                        <div className="login-input-wrapper">
                            <User size={20} />
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Masukkan username"
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
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Masukkan password"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="login-forgot">
                        <button
                            type="button"
                            className="login-link"
                            onClick={() => onNavigate && onNavigate('forgot-password')}
                        >
                            Lupa password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>

                    <div className="login-register">
                        <span>Belum punya akun? </span>
                        <button
                            type="button"
                            className="login-link"
                            onClick={() => onNavigate && onNavigate('register')}
                        >
                            Daftar sekarang
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
