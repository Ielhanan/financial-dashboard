import { useDashboard } from '../../store/dashboardStore';
import { authApi } from '../../api/auth';
import TickerSearch from '../search/TickerSearch';

export default function Header() {
  const { state, dispatch } = useDashboard();
  const { user } = state;

  const handleLogout = async () => {
    await authApi.logout();
    dispatch({ type: 'SET_USER', payload: null });
  };

  return (
    <header className="bg-bg-surface border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-text-primary font-semibold text-sm tracking-wider uppercase">
          Financial Dashboard
        </span>
      </div>
      <TickerSearch />
      <div className="flex items-center gap-3 ml-4">
        {user ? (
          <>
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-text-secondary text-sm hidden sm:block">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-text-muted text-xs hover:text-text-secondary transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <a
            href={authApi.loginUrl}
            className="text-xs bg-accent text-white px-3 py-1.5 rounded hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </header>
  );
}
