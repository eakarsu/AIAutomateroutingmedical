const API = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getStats: () => request('/dashboard/stats'),

  // Nurses
  getNurses: () => request('/nurses'),
  getNurse: (id) => request(`/nurses/${id}`),
  createNurse: (data) => request('/nurses', { method: 'POST', body: JSON.stringify(data) }),
  updateNurse: (id, data) => request(`/nurses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNurse: (id) => request(`/nurses/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients: () => request('/patients'),
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),

  // Visits
  getVisits: () => request('/visits'),
  getVisit: (id) => request(`/visits/${id}`),
  createVisit: (data) => request('/visits', { method: 'POST', body: JSON.stringify(data) }),
  updateVisit: (id, data) => request(`/visits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVisit: (id) => request(`/visits/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: () => request('/schedules'),
  getSchedule: (id) => request(`/schedules/${id}`),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),

  // Routes
  getRoutes: () => request('/routes'),
  getRoute: (id) => request(`/routes/${id}`),
  createRoute: (data) => request('/routes', { method: 'POST', body: JSON.stringify(data) }),
  updateRoute: (id, data) => request(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoute: (id) => request(`/routes/${id}`, { method: 'DELETE' }),

  // Visit Notes
  getVisitNotes: () => request('/visit-notes'),
  getVisitNote: (id) => request(`/visit-notes/${id}`),
  createVisitNote: (data) => request('/visit-notes', { method: 'POST', body: JSON.stringify(data) }),
  updateVisitNote: (id, data) => request(`/visit-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVisitNote: (id) => request(`/visit-notes/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // AI
  optimizeRoute: (data) => request('/ai/optimize-route', { method: 'POST', body: JSON.stringify(data) }),
  processOrder: (data) => request('/ai/process-order', { method: 'POST', body: JSON.stringify(data) }),
  generateNotes: (data) => request('/ai/generate-notes', { method: 'POST', body: JSON.stringify(data) }),
  smartSchedule: (data) => request('/ai/smart-schedule', { method: 'POST', body: JSON.stringify(data) }),
  patientRisk: (data) => request('/ai/patient-risk', { method: 'POST', body: JSON.stringify(data) }),
  aiChat: (data) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  getAiLogs: () => request('/ai/logs'),
};
