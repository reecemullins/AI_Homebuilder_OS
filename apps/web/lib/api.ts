const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // In production, would include auth token
      Authorization: 'Bearer dev-token',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data;
}

// Lots API
export const lotsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/lots${query}`);
  },
  get: (id: string) => fetchApi(`/lots/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchApi('/lots', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/lots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi(`/lots/${id}`, { method: 'DELETE' }),
  score: (id: string) => fetchApi(`/lots/${id}/score`, { method: 'POST' }),
  getDigest: () => fetchApi('/lots/digest'),
};

// Builds API
export const buildsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/builds${query}`);
  },
  get: (id: string) => fetchApi(`/builds/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchApi('/builds', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getTimeline: (id: string) => fetchApi(`/builds/${id}/timeline`),
  getFinancials: (id: string) => fetchApi(`/builds/${id}/financials`),
  addTask: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/builds/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (buildId: string, taskId: string, data: Record<string, unknown>) =>
    fetchApi(`/builds/${buildId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Schedule API
export const scheduleApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/schedule${query}`);
  },
  create: (data: Record<string, unknown>) =>
    fetchApi('/schedule', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/schedule/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  optimize: (data: Record<string, unknown>) =>
    fetchApi('/schedule/optimize', { method: 'POST', body: JSON.stringify(data) }),
  resequence: (data: Record<string, unknown>) =>
    fetchApi('/schedule/resequence', { method: 'POST', body: JSON.stringify(data) }),
};

// Subs API
export const subsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/subs${query}`);
  },
  get: (id: string) => fetchApi(`/subs/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchApi('/subs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/subs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  rate: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/subs/${id}/rate`, { method: 'POST', body: JSON.stringify(data) }),
  getAvailability: (id: string, startDate: string, endDate: string) =>
    fetchApi(`/subs/${id}/availability?startDate=${startDate}&endDate=${endDate}`),
  recommend: (params: Record<string, string>) =>
    fetchApi(`/subs/recommend?${new URLSearchParams(params)}`),
};

// Inspections API
export const inspectionsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/inspections${query}`);
  },
  get: (id: string) => fetchApi(`/inspections/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchApi('/inspections', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/inspections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getChecklist: (id: string) => fetchApi(`/inspections/${id}/checklist`),
  runPreAudit: (id: string, photos?: string[]) =>
    fetchApi(`/inspections/${id}/pre-audit`, { method: 'POST', body: JSON.stringify({ photos }) }),
};

// Procurement API
export const procurementApi = {
  listSuppliers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/procurement/suppliers${query}`);
  },
  createSupplier: (data: Record<string, unknown>) =>
    fetchApi('/procurement/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getPrices: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/procurement/prices${query}`);
  },
  getPriceForecast: (material: string, days?: number) =>
    fetchApi(`/procurement/prices/forecast?material=${material}${days ? `&days=${days}` : ''}`),
  createPO: (data: Record<string, unknown>) =>
    fetchApi('/procurement/po', { method: 'POST', body: JSON.stringify(data) }),
  aggregate: (data: Record<string, unknown>) =>
    fetchApi('/procurement/aggregate', { method: 'POST', body: JSON.stringify(data) }),
};

// Draws API
export const drawsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/draws${query}`);
  },
  get: (id: string) => fetchApi(`/draws/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchApi('/draws', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchApi(`/draws/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  submit: (id: string) => fetchApi(`/draws/${id}/submit`, { method: 'POST' }),
};

// Analytics API
export const analyticsApi = {
  getDashboard: () => fetchApi('/analytics/dashboard'),
  getTime: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/analytics/time${query}`);
  },
  getMargins: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/analytics/margins${query}`);
  },
  getSubPerformance: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return fetchApi(`/analytics/subs/performance${query}`);
  },
};

// AI API
export const aiApi = {
  scoreLot: (lotId: string, options?: { forceRefresh?: boolean; includeComps?: boolean }) =>
    fetchApi('/ai/lot-score', { method: 'POST', body: JSON.stringify({ lotId, ...options }) }),
  optimizeSchedule: (data: Record<string, unknown>) =>
    fetchApi('/ai/schedule-optimize', { method: 'POST', body: JSON.stringify(data) }),
  analyzePhoto: (data: Record<string, unknown>) =>
    fetchApi('/ai/photo-analyze', { method: 'POST', body: JSON.stringify(data) }),
  generateChecklist: (data: Record<string, unknown>) =>
    fetchApi('/ai/checklist-generate', { method: 'POST', body: JSON.stringify(data) }),
  generateDigest: () => fetchApi('/ai/daily-digest', { method: 'POST' }),
};
