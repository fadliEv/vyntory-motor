import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess }) {
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
            // Simulate login - replace with actual API call
            // const response = await Login(username, password);

            // For now, accept any credentials and create mock session
            const mockUser = {
                id: 'USR-1',
                username: username,
                fullName: 'Demo User',
                role: 'owner',
                email: 'demo@example.com'
            };

            const mockSessionToken = 'mock-session-' + Date.now();

            // Save to localStorage
            localStorage.setItem('sessionToken', mockSessionToken);
            localStorage.setItem('user', JSON.stringify(mockUser));

            // Call success callback
            onLoginSuccess(mockUser);

        } catch (err) {
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

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2026 Vyntory Motor. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
