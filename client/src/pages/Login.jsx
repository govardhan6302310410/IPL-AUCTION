import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, guestLogin, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {}
  };

  const handleGuest = async () => {
    try {
      await guestLogin();
      navigate('/');
    } catch (err) {}
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gold-primary)' }} />
          <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome Back</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in to your auction account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none transition"
                style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="you@example.com" required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); clearError(); }}
                className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition"
                style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="••••••••" required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit" disabled={isLoading}
            className="w-full py-3 rounded-lg font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)', color: '#000' }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--broadcast-border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>OR</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--broadcast-border)' }} />
        </div>

        <button
          onClick={handleGuest} disabled={isLoading}
          className="w-full mt-4 py-3 rounded-lg text-sm font-medium transition hover:opacity-80"
          style={{ border: '1px solid var(--broadcast-border)', color: 'var(--text-secondary)' }}
        >
          <UserPlus className="w-4 h-4 inline mr-2" />
          Continue as Guest
        </button>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-medium" style={{ color: 'var(--gold-primary)' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
