import { Accreditation, DashboardMetrics, calculateMetrics, getStatus, calculateDaysUntilExpiry } from './accreditation-data';

// API base URL - defaults to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Check if API mode is enabled
export const isApiMode = (): boolean => {
  return !!import.meta.env.VITE_API_URL;
};

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface HealthStatus {
  status: string;
  smtp: string;
  accreditations: number;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSendResult {
  sent: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

// Transform API response to match frontend Accreditation type
function transformAccreditation(apiAcc: any): Accreditation {
  const daysUntilExpiry = apiAcc.daysUntilExpiry ?? calculateDaysUntilExpiry(apiAcc.expiryDate);
  const status = apiAcc.status ?? getStatus(daysUntilExpiry);
  
  return {
    id: apiAcc.id,
    programmeName: apiAcc.programmeName,
    startDate: apiAcc.startDate || '',
    expiryDate: apiAcc.expiryDate,
    email: apiAcc.email || '',
    daysUntilExpiry,
    status,
  };
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const api = {
  // Get all accreditations
  async getAccreditations(): Promise<ApiResponse<Accreditation[]>> {
    const response = await fetchApi<any[]>('/accreditations');
    if (response.error || !response.data) {
      return { data: null, error: response.error };
    }
    return {
      data: response.data.map(transformAccreditation),
      error: null,
    };
  },

  // Get single accreditation by ID
  async getAccreditation(id: string): Promise<ApiResponse<Accreditation>> {
    const response = await fetchApi<any>(`/accreditations/${id}`);
    if (response.error || !response.data) {
      return { data: null, error: response.error };
    }
    return {
      data: transformAccreditation(response.data),
      error: null,
    };
  },

  // Get dashboard metrics
  async getMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const response = await fetchApi<{
      total: number;
      active: number;
      warning: number;
      critical: number;
      expired: number;
    }>('/metrics');
    
    if (response.error || !response.data) {
      return { data: null, error: response.error };
    }
    
    const { total, active } = response.data;
    return {
      data: {
        ...response.data,
        complianceRate: total > 0 ? Math.round((active / total) * 100) : 0,
      },
      error: null,
    };
  },

  // Send reminder for single accreditation
  async sendReminder(id: string): Promise<ApiResponse<SendResult>> {
    return fetchApi<SendResult>(`/send-reminder/${id}`, {
      method: 'POST',
    });
  },

  // Send bulk reminders
  async sendBulkReminders(status?: 'warning' | 'critical' | 'all'): Promise<ApiResponse<BulkSendResult>> {
    return fetchApi<BulkSendResult>('/send-bulk-reminders', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // Add a new accreditation
  async addAccreditation(acc: {
    programme_name: string;
    start_date: string;
    expiry_date: string;
    email: string;
  }): Promise<ApiResponse<any>> {
    return fetchApi('/accreditations', {
      method: 'POST',
      body: JSON.stringify(acc),
    });
  },

  // Delete an accreditation
  async deleteAccreditation(id: string): Promise<ApiResponse<any>> {
    return fetchApi(`/accreditations/${id}`, {
      method: 'DELETE',
    });
  },

  // Health check
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    return fetchApi('/health');
  },
};

// Calculate metrics from accreditation array (for local mode)
export { calculateMetrics };
