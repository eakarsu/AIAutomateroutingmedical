import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, CalendarDays, FileText,
  MapPin, Clock, Sparkles, Bell, MessageSquare, LogOut, ClipboardList, History,
  TrafficCone, AlertTriangle, Pill, Activity, Mail, ArrowRightLeft, ShieldCheck, BarChart3,
  CalendarX,
} from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ]},
  { section: 'Management', items: [
    { path: '/nurses', label: 'Nurses', icon: UserCheck },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/visits', label: 'Visits', icon: CalendarDays },
    { path: '/orders', label: 'Medical Orders', icon: FileText },
    { path: '/schedules', label: 'Schedules', icon: Clock },
    { path: '/routes', label: 'Routes', icon: MapPin },
    { path: '/visit-notes', label: 'Visit Notes', icon: ClipboardList },
  ]},
  { section: 'AI Tools', items: [
    { path: '/ai/route-optimizer', label: 'Route Optimizer', icon: MapPin },
    { path: '/ai/order-processor', label: 'Order Processor', icon: FileText },
    { path: '/ai/visit-notes', label: 'Visit Notes AI', icon: CalendarDays },
    { path: '/ai/scheduler', label: 'Smart Scheduler', icon: Clock },
    { path: '/ai/risk-assessment', label: 'Risk Assessment', icon: Users },
    { path: '/ai/chat', label: 'AI Assistant', icon: MessageSquare },
    { path: '/ai/logs', label: 'AI Logs', icon: History },
  ]},
  { section: 'Advanced AI', items: [
    { path: '/ai/traffic-adjust', label: 'Traffic Adjust', icon: TrafficCone },
    { path: '/ai/acuity-alert', label: 'Acuity Alerts', icon: AlertTriangle },
    { path: '/ai/medication-check', label: 'Med Interactions', icon: Pill },
    { path: '/ai/skill-match', label: 'Skill Matching', icon: Sparkles },
    { path: '/ai/outcome-predict', label: 'Outcome Predict', icon: Activity },
    { path: '/ai/family-portal', label: 'Family Portal', icon: Mail },
    { path: '/ai/shift-swap', label: 'Shift Swaps', icon: ArrowRightLeft },
    { path: '/ai/preauth', label: 'Pre-Auth', icon: ShieldCheck },
    { path: '/ai/no-show-predict', label: 'No-Show Predict', icon: CalendarX },
  ]},
  { section: 'System', items: [
    { path: '/notifications', label: 'Notifications', icon: Bell, badge: true },
  ]},
];

export default function Sidebar({ unreadCount }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>HomeHealth Pro</h1>
        <span>Route & Order Management</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map((item) => (
              <div
                key={item.path}
                className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.badge && unreadCount > 0 && (
                  <span className="sidebar-badge">{unreadCount}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="sidebar-link" onClick={handleLogout}>
          <LogOut />
          <span>Sign Out</span>
        </div>
      </div>
    </aside>
  );
}
