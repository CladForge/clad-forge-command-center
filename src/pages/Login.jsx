import { useState } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../../images/cladforge-logo.svg';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-gradient" />
      <div className="login-glow" />

      <div className="login-card">
        <div className="login-logo">
          <img src={logo} alt="Clad Forge" />
        </div>
        <h1>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p>
          {mode === 'login'
            ? 'Sign in to your Command Center'
            : 'Set up your Clad Forge account'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="login-field">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <div className="login-btn-wrap">
            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="login-switch">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button type="button" onClick={() => { setMode('signup'); setError(''); }}>
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setError(''); }}>
                Sign in
              </button>
            </span>
          )}
        </div>

        <div className="login-footer">
          Clad Forge — Industrial Digital Engineering
        </div>
      </div>
    </div>
  );
}
