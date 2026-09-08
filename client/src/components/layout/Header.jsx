import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, User, LogOut, Trophy, Plus, Users, Layers, Shield } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Players', path: '/players' },
    { name: 'Compare', path: '/players/compare' },
    ...(isAuthenticated ? [{ name: 'My Auctions', path: '/my-auctions' }] : [])
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-[var(--broadcast-border)]/80 bg-[var(--broadcast-surface)]/90 select-none transition-all">
      {/* Top subtle broadcast LED edge */}
      <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-amber-400 to-indigo-500 opacity-90" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <Trophy className="w-5 h-5 fill-black/30" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-white leading-none flex items-center gap-1">
                IPL <span className="text-amber-400">AUCTION</span>
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400/90 leading-tight">
                Live Broadcast Arena
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm border border-white/10'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-all"
              title={theme === 'dark' ? 'Switch to Light Stadium' : 'Switch to Dark Arena'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                {/* Profile Pill */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                    {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.displayName || user?.username}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white hover:bg-white/10 border border-white/10 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md shadow-amber-500/15 hover:brightness-110 transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle (Min 44px Touch Target) */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl border border-white/10 bg-white/5 text-white active:scale-95 transition"
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--broadcast-border)] bg-[var(--broadcast-surface)]/95 backdrop-blur-2xl animate-fade-in">
          <div className="px-5 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.name}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-white/10">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white font-medium hover:bg-white/5 transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs">
                      {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
                    </div>
                    <span>{user?.displayName || user?.username} (Profile)</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-rose-400 font-medium hover:bg-rose-500/10 transition text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    className="py-3 text-center text-sm font-semibold rounded-xl text-white bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="py-3 text-center text-sm font-bold rounded-xl text-black bg-gradient-to-r from-amber-400 to-amber-500 shadow-md transition"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
