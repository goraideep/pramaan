import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenders from './pages/Tenders';
import TenderDetail from './pages/TenderDetail';
import BidderDetail from './pages/BidderDetail';
import Audit from './pages/Audit';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/tenders" element={<Protected><Tenders /></Protected>} />
      <Route path="/tenders/:id" element={<Protected><TenderDetail /></Protected>} />
      <Route path="/bidders/:id" element={<Protected><BidderDetail /></Protected>} />
      <Route path="/audit" element={<Protected><Audit /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
