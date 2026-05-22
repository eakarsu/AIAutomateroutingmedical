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
// Analytics + 8 NEW custom features
import Analytics from './pages/Analytics';
import AITrafficAdjust from './pages/AITrafficAdjust';
import AIAcuityAlert from './pages/AIAcuityAlert';
import AIMedicationCheck from './pages/AIMedicationCheck';
import AISkillMatch from './pages/AISkillMatch';
import AIOutcomePredict from './pages/AIOutcomePredict';
import AIFamilyPortal from './pages/AIFamilyPortal';
import AIShiftSwap from './pages/AIShiftSwap';
import AIPreauth from './pages/AIPreauth';
import AINoShowPredict from './pages/AINoShowPredict';
import Integrations from './pages/Integrations';
import CustomViewsPage from './pages/CustomViewsPage';
import CaregiverCredentialExpiry from './pages/CaregiverCredentialExpiry';
import { api } from './api';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function ProtectedLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.getNotifications().then(result => {
      const notifs = Array.isArray(result) ? result : (result.data || []);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, []);

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <main className="main-content">
        <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nurses" element={<Nurses />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/visits" element={<Visits />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/visit-notes" element={<VisitNotes />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* Existing AI tools */}
          <Route path="/ai/route-optimizer" element={<AIRouteOptimizer />} />
          <Route path="/ai/order-processor" element={<AIOrderProcessor />} />
          <Route path="/ai/visit-notes" element={<AIVisitNotes />} />
          <Route path="/ai/scheduler" element={<AIScheduler />} />
          <Route path="/ai/risk-assessment" element={<AIRiskAssessment />} />
          <Route path="/ai/chat" element={<AIChat />} />
          <Route path="/ai/logs" element={<AILogs />} />
          {/* 8 NEW custom features */}
          <Route path="/ai/traffic-adjust" element={<AITrafficAdjust />} />
          <Route path="/ai/acuity-alert" element={<AIAcuityAlert />} />
          <Route path="/ai/medication-check" element={<AIMedicationCheck />} />
          <Route path="/ai/skill-match" element={<AISkillMatch />} />
          <Route path="/ai/outcome-predict" element={<AIOutcomePredict />} />
          <Route path="/ai/family-portal" element={<AIFamilyPortal />} />
          <Route path="/ai/shift-swap" element={<AIShiftSwap />} />
          <Route path="/ai/preauth" element={<AIPreauth />} />
          <Route path="/ai/no-show-predict" element={<AINoShowPredict />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="/caregiver-credential-expiry" element={<CaregiverCredentialExpiry />} />
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
