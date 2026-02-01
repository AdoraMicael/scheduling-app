import { useState } from 'react';
import { login, signup } from '../utils/auth';

function Login() {
  const [loginTab, setLoginTab] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    
    try {
      if (loginTab === 'login') {
        await login(authForm.email, authForm.password);
      } else {
        await signup(authForm.email, authForm.password);
      }
      setAuthForm({ email: '', password: '' });
    } catch (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Schedule App</h1>
          <p>Sign in to manage your schedules</p>
        </div>
        <form className="login-form" onSubmit={handleAuthSubmit}>
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${loginTab === 'login' ? 'active' : ''}`}
              onClick={() => setLoginTab('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab ${loginTab === 'signup' ? 'active' : ''}`}
              onClick={() => setLoginTab('signup')}
            >
              Sign Up
            </button>
          </div>
          {authError && <div className="login-error">{authError}</div>}
          <div className="form-row">
            <label>Email</label>
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              placeholder="your@email.com"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              placeholder="Enter password"
              required
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            className="btn primary login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? 'Please wait...' 
              : loginTab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
