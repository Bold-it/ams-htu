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

function transformAccreditation(apiAcc: any): Accreditation {
  const daysUntilExpiry = apiAcc.daysUntilExpiry ?? calculateDaysUntilExpiry(apiAcc.expiryDate);
  const status = apiAcc.status ?? getStatus(daysUntilExpiry);

  return {
    id: apiAcc.id,
    programmeName: apiAcc.programmeName,
    faculty: apiAcc.faculty || '',
    department: apiAcc.department || '',
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
    const email = localStorage.getItem('auth_email');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': email || 'anonymous',
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
    faculty?: string;
    department?: string;
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

  // Update an accreditation
  async updateAccreditation(id: string, acc: {
    programme_name: string;
    faculty?: string;
    department?: string;
    start_date: string;
    expiry_date: string;
    email: string;
  }): Promise<ApiResponse<any>> {
    return fetchApi(`/accreditations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(acc),
    });
  },

  // Login
  async login(email: string, password: string): Promise<ApiResponse<{ role: 'super_admin' | 'admin' | 'user'; token: string }>> {
    return fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Google Login
  async googleLogin(credential: string): Promise<ApiResponse<{ role?: 'super_admin' | 'admin' | 'user'; token?: string; status?: string; message?: string; email?: string }>> {
    return fetchApi('/google-login', {

      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },


  // Change Password
  async changePassword(currentPassword: string, newPassword: string, role: string, targetUsername?: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, role, targetUsername }),
    });
  },

  // Forgot Password
  async forgotPassword(email: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset Password
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  // Send Monthly Report
  async sendMonthlyReport(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/send-monthly-report', {
      method: 'POST',
    });
  },

  // Get Monthly Report Preview
  async getMonthlyReportPreview(): Promise<ApiResponse<{ html: string }>> {
    return fetchApi('/monthly-report-preview');
  },

  // Health check


  // Health check
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    return fetchApi('/health');
  },

  // Audit Logs
  async getAuditLogs(): Promise<ApiResponse<any[]>> {
    return fetchApi('/audit-logs');
  },

  async getAuditAnalytics(): Promise<ApiResponse<{
    totalActionsToday: number;
    mostActiveAdmin: string;
    lastCriticalAction: any | null;
  }>> {
    return fetchApi('/audit-analytics');
  },

  // User Management
  async getUsers(): Promise<ApiResponse<any[]>> {
    return fetchApi('/users');
  },

  async createUser(userData: any): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async resetUserPassword(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async approveUser(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi(`/users/${userId}/approve`, {
      method: 'POST',
    });
  },
};


// Calculate metrics from accreditation array (for local mode)
export { calculateMetrics };
