import { useState } from 'react';
import { authApi } from '../../api/auth';
import type { User } from '../../types/auth';

type Tab = 'email' | 'google';
type Mode = 'login' | 'register';

interface Props {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('email');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = mode === 'register'
        ? await authApi.register(email, name, password)
        : await authApi.login(email, password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-surface border border-border rounded-lg w-full max-w-sm p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-text-primary font-semibold text-base mb-4">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>

        {/* Tab switcher */}
        <div className="flex border border-border rounded mb-4 overflow-hidden text-sm">
          <button
            className={`flex-1 py-1.5 transition-colors ${tab === 'email' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setTab('email')}
          >
            Email
          </button>
          <button
            className={`flex-1 py-1.5 transition-colors ${tab === 'google' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
            onClick={() => setTab('google')}
          >
            Google
          </button>
        </div>

        {tab === 'google' ? (
          <a
            href={authApi.loginUrl}
            className="flex items-center justify-center gap-2 w-full border border-border rounded py-2 text-sm text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-bg-base border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-white rounded py-2 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Loading…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-text-muted mt-4">
          {mode === 'login' ? (
            <>No account?{' '}
              <button className="text-accent hover:underline" onClick={() => { setMode('register'); setError(null); }}>
                Register
              </button>
            </>
          ) : (
            <>Have an account?{' '}
              <button className="text-accent hover:underline" onClick={() => { setMode('login'); setError(null); }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
