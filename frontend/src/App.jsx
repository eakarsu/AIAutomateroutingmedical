import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Nurses from './pages/Nurses';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Orders from './pages/Orders';
import Schedules from './pages/Schedules';
import RoutesPage from './pages/Routes';
import Notifications from './pages/Notifications';
import AIRouteOptimizer from './pages/AIRouteOptimizer';
import AIOrderProcessor from './pages/AIOrderProcessor';
import AIVisitNotes from './pages/AIVisitNotes';
import AIScheduler from './pages/AIScheduler';
import AIRiskAssessment from './pages/AIRiskAssessment';
import AIChat from './pages/AIChat';
import VisitNotes from './pages/VisitNotes';
import AILogs from './pages/AILogs';
import { api } from './api';

function ProtectedLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.getNotifications().then(notifs => {
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nurses" element={<Nurses />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/visits" element={<Visits />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/visit-notes" element={<VisitNotes />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ai/route-optimizer" element={<AIRouteOptimizer />} />
          <Route path="/ai/order-processor" element={<AIOrderProcessor />} />
          <Route path="/ai/visit-notes" element={<AIVisitNotes />} />
          <Route path="/ai/scheduler" element={<AIScheduler />} />
          <Route path="/ai/risk-assessment" element={<AIRiskAssessment />} />
          <Route path="/ai/chat" element={<AIChat />} />
          <Route path="/ai/logs" element={<AILogs />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const location = useLocation();
  const isLoggedIn = localStorage.getItem('token');

  if (location.pathname === '/login') {
    return <Login />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return <ProtectedLayout />;
}

export default App;
