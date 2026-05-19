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

// Helper: fetch paginated data; returns {data, pagination} or falls back to array for legacy consumers
function paginated(path, page = 1, limit = 100) {
  return request(`${path}?page=${page}&limit=${limit}`);
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getStats: () => request('/dashboard/stats'),
  getDashboard: () => request('/dashboard'),

  // Nurses — paginated (returns {data, pagination}); use .data on consumers
  getNurses: (page = 1, limit = 100) => paginated('/nurses', page, limit).then(r => r.data || r),
  getNurse: (id) => request(`/nurses/${id}`),
  createNurse: (data) => request('/nurses', { method: 'POST', body: JSON.stringify(data) }),
  updateNurse: (id, data) => request(`/nurses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNurse: (id) => request(`/nurses/${id}`, { method: 'DELETE' }),
  getNursesPaginated: (page = 1, limit = 20) => paginated('/nurses', page, limit),

  // Patients — paginated
  getPatients: (page = 1, limit = 100) => paginated('/patients', page, limit).then(r => r.data || r),
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),
  getPatientsPaginated: (page = 1, limit = 20) => paginated('/patients', page, limit),

  // Visits — paginated
  getVisits: (page = 1, limit = 100) => paginated('/visits', page, limit).then(r => r.data || r),
  getVisit: (id) => request(`/visits/${id}`),
  createVisit: (data) => request('/visits', { method: 'POST', body: JSON.stringify(data) }),
  updateVisit: (id, data) => request(`/visits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVisit: (id) => request(`/visits/${id}`, { method: 'DELETE' }),
  getVisitsPaginated: (page = 1, limit = 20) => paginated('/visits', page, limit),

  // Orders — paginated
  getOrders: (page = 1, limit = 100) => paginated('/orders', page, limit).then(r => r.data || r),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  getOrdersPaginated: (page = 1, limit = 20) => paginated('/orders', page, limit),

  // Schedules — paginated
  getSchedules: (page = 1, limit = 100) => paginated('/schedules', page, limit).then(r => r.data || r),
  getSchedule: (id) => request(`/schedules/${id}`),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, data) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: 'DELETE' }),
  getSchedulesPaginated: (page = 1, limit = 20) => paginated('/schedules', page, limit),

  // Routes — paginated
  getRoutes: (page = 1, limit = 100) => paginated('/routes', page, limit).then(r => r.data || r),
  getRoute: (id) => request(`/routes/${id}`),
  createRoute: (data) => request('/routes', { method: 'POST', body: JSON.stringify(data) }),
  updateRoute: (id, data) => request(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoute: (id) => request(`/routes/${id}`, { method: 'DELETE' }),
  getRoutesPaginated: (page = 1, limit = 20) => paginated('/routes', page, limit),

  // Visit Notes — paginated
  getVisitNotes: (page = 1, limit = 100) => paginated('/visit-notes', page, limit).then(r => r.data || r),
  getVisitNote: (id) => request(`/visit-notes/${id}`),
  createVisitNote: (data) => request('/visit-notes', { method: 'POST', body: JSON.stringify(data) }),
  updateVisitNote: (id, data) => request(`/visit-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVisitNote: (id) => request(`/visit-notes/${id}`, { method: 'DELETE' }),

  // Notifications — paginated
  getNotifications: (page = 1, limit = 100) => paginated('/notifications', page, limit).then(r => r.data || r),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),

  // Analytics
  getRouteAnalytics: (weekStart) => request(`/analytics/routes${weekStart ? '?week_start=' + weekStart : ''}`),

  // AI — core
  optimizeRoute: (data) => request('/ai/optimize-route', { method: 'POST', body: JSON.stringify(data) }),
  processOrder: (data) => request('/ai/process-order', { method: 'POST', body: JSON.stringify(data) }),
  generateNotes: (data) => request('/ai/generate-notes', { method: 'POST', body: JSON.stringify(data) }),
  smartSchedule: (data) => request('/ai/smart-schedule', { method: 'POST', body: JSON.stringify(data) }),
  patientRisk: (data) => request('/ai/patient-risk', { method: 'POST', body: JSON.stringify(data) }),
  aiChat: (data) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  getAiLogs: (page = 1, limit = 20) => request(`/ai/logs?page=${page}&limit=${limit}`),
  getAiResults: (page = 1, limit = 20, feature = '') =>
    request(`/ai/results?page=${page}&limit=${limit}${feature ? '&feature=' + feature : ''}`),

  // AI Features
  trafficAdjust: (data) => request('/ai-features/traffic-adjust', { method: 'POST', body: JSON.stringify(data) }),
  acuityCheck: (data) => request('/ai-features/acuity-check', { method: 'POST', body: JSON.stringify(data) }),
  medicationCheck: (data) => request('/ai-features/medication-check', { method: 'POST', body: JSON.stringify(data) }),
  skillMatch: (data) => request('/ai-features/skill-match', { method: 'POST', body: JSON.stringify(data) }),
  outcomePredict: (data) => request('/ai-features/outcome-predict', { method: 'POST', body: JSON.stringify(data) }),
  noShowPredict: (data) => request('/ai-features/no-show-predict', { method: 'POST', body: JSON.stringify(data) }),
  familySummary: (data) => request('/ai-features/family-summary', { method: 'POST', body: JSON.stringify(data) }),
  getFamilyMessages: (page = 1, limit = 20) => request(`/ai-features/family-summary/messages?page=${page}&limit=${limit}`),
  getShiftSwaps: (page = 1, limit = 20) => request(`/ai-features/shift-swaps?page=${page}&limit=${limit}`),
  createShiftSwap: (data) => request('/ai-features/shift-swaps', { method: 'POST', body: JSON.stringify(data) }),
  updateShiftSwap: (id, data) => request(`/ai-features/shift-swaps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPreauths: (page = 1, limit = 20) => request(`/ai-features/preauth?page=${page}&limit=${limit}`),
  createPreauth: (data) => request('/ai-features/preauth', { method: 'POST', body: JSON.stringify(data) }),
  updatePreauth: (id, data) => request(`/ai-features/preauth/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePreauth: (id) => request(`/ai-features/preauth/${id}`, { method: 'DELETE' }),

  // Vitals recording
  recordVitals: (visitId, data) => request(`/ai-features/vitals/${visitId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Schedule conflict detection
  checkConflict: (data) => request('/ai-features/check-conflict', { method: 'POST', body: JSON.stringify(data) }),

  // Bulk route stop assignment
  bulkAddStops: (routeId, visitIds) => request(`/ai-features/routes/${routeId}/stops/bulk`, { method: 'POST', body: JSON.stringify({ visit_ids: visitIds }) }),
};
