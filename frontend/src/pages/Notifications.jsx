import { useState, useEffect } from 'react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { Check, Trash2, Bell, AlertTriangle, MapPin, Calendar, FileText, Users } from 'lucide-react';

const typeIcons = {
  assignment: Users, visit: Calendar, optimization: MapPin, alert: AlertTriangle,
  conflict: AlertTriangle, order: FileText, delay: AlertTriangle, report: FileText,
  staff: Users, discharge: Users, certification: AlertTriangle, urgent: AlertTriangle,
  ai: MapPin, supply: AlertTriangle, compliance: FileText,
};

const typeColors = {
  assignment: 'var(--accent)', visit: 'var(--success)', optimization: 'var(--purple)',
  alert: 'var(--warning)', conflict: 'var(--danger)', order: 'var(--accent)',
  delay: 'var(--warning)', report: 'var(--gray-500)', staff: 'var(--gray-500)',
  discharge: 'var(--success)', certification: 'var(--warning)', urgent: 'var(--danger)',
  ai: 'var(--purple)', supply: 'var(--warning)', compliance: 'var(--accent)',
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const load = () => api.getNotifications().then(setItems);
  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.markRead(id); load();
  };

  const deleteNotif = async (id) => {
    await api.deleteNotification(id); toast.success('Deleted'); load();
  };

  return (
    <>
      <div className="page-header">
        <div><h2>Notifications</h2><div className="page-header-sub">{items.filter(n => !n.is_read).length} unread</div></div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((n) => {
            const Icon = typeIcons[n.type] || Bell;
            const color = typeColors[n.type] || 'var(--gray-500)';
            return (
              <div key={n.id} style={{
                background: 'white', borderRadius: 'var(--radius)', padding: '16px 20px',
                border: `1px solid ${n.is_read ? 'var(--gray-200)' : 'var(--accent)'}`,
                display: 'flex', alignItems: 'center', gap: 16, opacity: n.is_read ? 0.7 : 1,
                boxShadow: n.is_read ? 'none' : 'var(--shadow)',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!n.is_read && (
                    <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)}><Check size={14} /></button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={() => deleteNotif(n.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
