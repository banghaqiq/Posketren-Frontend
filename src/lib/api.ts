import axios from 'axios';
import {
  PackageItem,
  Student,
  Operator,
  ActivityLogItem,
  ApiConfigData,
  DashboardStats,
  ManifestItem,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const packagesApi = {
  getAll: async (params?: { search?: string; status?: string; type?: string; courier?: string }) => {
    const res = await api.get<PackageItem[]>('/packages', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await api.get<PackageItem>(`/packages/${id}`);
    return res.data;
  },
  create: async (data: Partial<PackageItem>) => {
    const res = await api.post<PackageItem>('/packages', data);
    return res.data;
  },
  bulkCreate: async (packages: Partial<PackageItem>[], operator?: string) => {
    const res = await api.post<PackageItem[]>('/packages/bulk', { packages, operator });
    return res.data;
  },
  update: async (id: string, data: Partial<PackageItem>) => {
    const res = await api.put<PackageItem>(`/packages/${id}`, data);
    return res.data;
  },
  delete: async (id: string, operator?: string) => {
    const res = await api.delete(`/packages/${id}`, { data: { operator } });
    return res.data;
  },
  uploadProof: async (id: string, image: string, mimeType: string = 'image/jpeg') => {
    const res = await api.post(`/packages/${id}/proof`, { image, mimeType });
    return res.data;
  },
  deleteProof: async (id: string) => {
    const res = await api.delete(`/packages/${id}/proof`);
    return res.data;
  },
};

export const studentsApi = {
  getAll: async (search?: string) => {
    const res = await api.get<Student[]>('/students', { params: { search } });
    return res.data;
  },
  getOne: async (niup: string) => {
    const res = await api.get<Student>(`/students/${niup}`);
    return res.data;
  },
  create: async (data: Partial<Student>) => {
    const res = await api.post<Student>('/students', data);
    return res.data;
  },
  bulkCreate: async (students: Partial<Student>[]) => {
    const res = await api.post<{ success: boolean; count: number }>('/students/bulk', { students });
    return res.data;
  },
  update: async (niup: string, data: Partial<Student>) => {
    const res = await api.put<Student>(`/students/${niup}`, data);
    return res.data;
  },
  delete: async (niup: string) => {
    const res = await api.delete(`/students/${niup}`);
    return res.data;
  },
};

export const operatorsApi = {
  getAll: async () => {
    const res = await api.get<Operator[]>('/operators');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post<Operator>('/operators', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put<Operator>(`/operators/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/operators/${id}`);
    return res.data;
  },
  unlock: async (id: string) => {
    const res = await api.put(`/operators/${id}/unlock`);
    return res.data;
  },
};

export const logsApi = {
  getAll: async (page: number = 1, limit: number = 20, type?: string) => {
    const res = await api.get<{ data: ActivityLogItem[]; meta: any }>('/logs', {
      params: { page, limit, type },
    });
    return res.data;
  },
  create: async (data: { type: string; title: string; description: string; operator?: string }) => {
    const res = await api.post('/logs', data);
    return res.data;
  },
  cleanup: async (days?: number, all?: boolean) => {
    const res = await api.delete('/logs/cleanup', {
      params: { days, all: all ? 'true' : undefined },
    });
    return res.data;
  },
};

export const analyticsApi = {
  getStats: async () => {
    const res = await api.get<DashboardStats>('/analytics');
    return res.data;
  },
};

export const manifestsApi = {
  getAll: async () => {
    const res = await api.get<ManifestItem[]>('/manifests');
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post<ManifestItem>('/manifests', data);
    return res.data;
  },
};

export const configApi = {
  get: async () => {
    const res = await api.get<ApiConfigData>('/config');
    return res.data;
  },
  update: async (data: any) => {
    const res = await api.put<ApiConfigData>('/config', data);
    return res.data;
  },
  triggerCron: async () => {
    const res = await api.get('/cron');
    return res.data;
  },
};

export const printerApi = {
  getStatus: async () => {
    const res = await api.get<{
      connected: boolean;
      name: string;
      port: string;
      isDefault: boolean;
      driverName?: string;
      message?: string;
    }>('/printer/status');
    return res.data;
  },
  testPrint: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/printer/test-print');
    return res.data;
  },
  setDefault: async () => {
    const res = await api.post<{ success: boolean; message: string }>('/printer/set-default');
    return res.data;
  },
};

export default api;
