import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL || '';
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || '';
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const autoFill = async () => {
    if (demoEmail && demoPassword) { setEmail(demoEmail); setPassword(demoPassword); return; }
    try {
      const res = await fetch('/api/auth/demo-credentials', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.email && data?.password) { setEmail(data.email); setPassword(data.password); return; }
    } catch {}
    toast.error('Demo credentials are not configured for this environment.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>HomeHealth Pro</h1>
        <p className="login-subtitle">Route & Order Management Platform</p>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <button type="button" className="auto-fill-btn" aria-label="Fill demo credentials" onClick={autoFill} disabled={loading}>
            Fill demo credentials
          </button>
        </form>
      </div>
    </div>
  );
}
