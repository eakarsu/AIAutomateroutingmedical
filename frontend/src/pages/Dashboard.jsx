import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  UserCheck, Users, CalendarDays, FileText, MapPin, Clock, Bell, TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) return <div className="page-body"><p>Loading dashboard...</p></div>;

  const cards = [
    { title: 'Active Nurses', value: stats.nurses.active, sub: `${stats.nurses.total} total`, icon: UserCheck, color: 'blue', path: '/nurses' },
    { title: 'Active Patients', value: stats.patients.active, sub: `${stats.patients.total} total`, icon: Users, color: 'green', path: '/patients' },
    { title: "Today's Visits", value: stats.visits.total, sub: `${stats.visits.completed} completed, ${stats.visits.in_progress} in progress`, icon: CalendarDays, color: 'purple', path: '/visits' },
    { title: 'Medical Orders', value: stats.orders.total, sub: `${stats.orders.high_priority} high priority`, icon: FileText, color: 'yellow', path: '/orders' },
    { title: "Today's Routes", value: stats.routes.total, sub: `Avg score: ${Number(stats.routes.avg_score).toFixed(1)}%`, icon: MapPin, color: 'red', path: '/routes' },
    { title: 'Schedules Today', value: stats.schedules.total, sub: 'Nurse shifts active', icon: Clock, color: 'blue', path: '/schedules' },
    { title: 'Unread Alerts', value: stats.notifications.unread, sub: 'Notifications pending', icon: Bell, color: 'red', path: '/notifications' },
    { title: 'Route Efficiency', value: `${Number(stats.routes.avg_score).toFixed(0)}%`, sub: 'Average optimization', icon: TrendingUp, color: 'green', path: '/ai/route-optimizer' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <div className="page-header-sub">Welcome back! Here is your operational overview.</div>
        </div>
      </div>
      <div className="page-body">
        <div className="cards-grid">
          {cards.map((card) => (
            <div key={card.title} className="stat-card" onClick={() => navigate(card.path)}>
              <div className={`stat-card-icon ${card.color}`}>
                <card.icon />
              </div>
              <h3>{card.title}</h3>
              <div className="stat-value">{card.value}</div>
              <div className="stat-sub">{card.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
