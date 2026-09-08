import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateAuction from './pages/CreateAuction';
import JoinAuction from './pages/JoinAuction';
import AuctionLobby from './pages/AuctionLobby';
import LiveAuction from './pages/LiveAuction';
import PlayerDatabase from './pages/PlayerDatabase';
import PlayerDetails from './pages/PlayerDetails';
import PlayerComparison from './pages/PlayerComparison';
import MyAuctions from './pages/MyAuctions';
import AuctionHistory from './pages/AuctionHistory';
import TeamDetails from './pages/TeamDetails';
import SquadBuilder from './pages/SquadBuilder';
import PlayingXI from './pages/PlayingXI';
import AuctionResults from './pages/AuctionResults';
import TeamComparison from './pages/TeamComparison';
import Leaderboard from './pages/Leaderboard';
import TournamentSimulation from './pages/TournamentSimulation';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

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
      </ErrorBoundary>
    </Router>
  );
}

export default App;
