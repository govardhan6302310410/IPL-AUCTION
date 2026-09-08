import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPass) {
      setLocalError('Passwords do not match');
      return;
    }
    setLocalError('');
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {}
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: 'var(--broadcast-card)', border: '1px solid var(--broadcast-border)' }}>
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gold-primary)' }} />
          <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Create Account</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Join the auction and build your dream squad</p>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={username} onChange={e => { setUsername(e.target.value); clearError(); }}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="Your username" required minLength={3} maxLength={20}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="you@example.com" required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); clearError(); }}
                className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="Min 6 characters" required minLength={6}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--broadcast-surface)', border: '1px solid var(--broadcast-border)', color: 'var(--text-primary)' }}
                placeholder="Confirm your password" required
              />
            </div>
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-lg font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)', color: '#000' }}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--gold-primary)' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
