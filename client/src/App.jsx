import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Lazy-loaded pages for fast initial mobile and browser loading
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateAuction = lazy(() => import('./pages/CreateAuction'));
const JoinAuction = lazy(() => import('./pages/JoinAuction'));
const AuctionLobby = lazy(() => import('./pages/AuctionLobby'));
const LiveAuction = lazy(() => import('./pages/LiveAuction'));
const PlayerDatabase = lazy(() => import('./pages/PlayerDatabase'));
const PlayerDetails = lazy(() => import('./pages/PlayerDetails'));
const PlayerComparison = lazy(() => import('./pages/PlayerComparison'));
const MyAuctions = lazy(() => import('./pages/MyAuctions'));
const AuctionHistory = lazy(() => import('./pages/AuctionHistory'));
const TeamDetails = lazy(() => import('./pages/TeamDetails'));
const SquadBuilder = lazy(() => import('./pages/SquadBuilder'));
const PlayingXI = lazy(() => import('./pages/PlayingXI'));
const AuctionResults = lazy(() => import('./pages/AuctionResults'));
const TeamComparison = lazy(() => import('./pages/TeamComparison'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const TournamentSimulation = lazy(() => import('./pages/TournamentSimulation'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingSpinner size="lg" text="Loading..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { fetchUser, token } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply theme on mount
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    if (token) fetchUser();
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner size="lg" text="Loading IPL Arena..." />}>
          <Routes>
            <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/players" element={<PlayerDatabase />} />
            <Route path="/players/compare" element={<PlayerComparison />} />
            <Route path="/players/:id" element={<PlayerDetails />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/join" element={<JoinAuction />} />
            <Route path="/join/:roomId" element={<JoinAuction />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateAuction /></ProtectedRoute>} />
            <Route path="/room/:roomId/lobby" element={<ProtectedRoute><AuctionLobby /></ProtectedRoute>} />
            <Route path="/room/:roomId" element={<ProtectedRoute><LiveAuction /></ProtectedRoute>} />
            <Route path="/room/:id/results" element={<ProtectedRoute><AuctionResults /></ProtectedRoute>} />
            <Route path="/my-auctions" element={<ProtectedRoute><MyAuctions /></ProtectedRoute>} />
            <Route path="/auction/:id/history" element={<ProtectedRoute><AuctionHistory /></ProtectedRoute>} />
            <Route path="/auction/:id/results" element={<ProtectedRoute><AuctionResults /></ProtectedRoute>} />
            <Route path="/team/:id" element={<ProtectedRoute><TeamDetails /></ProtectedRoute>} />
            <Route path="/squad-builder/:id" element={<ProtectedRoute><SquadBuilder /></ProtectedRoute>} />
            <Route path="/playing-xi/:id" element={<ProtectedRoute><PlayingXI /></ProtectedRoute>} />
            <Route path="/teams/compare" element={<ProtectedRoute><TeamComparison /></ProtectedRoute>} />
            <Route path="/tournament/:roomId" element={<ProtectedRoute><TournamentSimulation /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
