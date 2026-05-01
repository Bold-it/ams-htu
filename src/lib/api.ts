import { 
  Accreditation, 
  DashboardMetrics, 
  calculateMetrics, 
  getStatus, 
  calculateDaysUntilExpiry, 
  AccreditationDocument, 
  AccreditationCheckpoint,
  AccreditationStatus,
  AccreditationType,
  WorkflowStatus,
  UserAccount,
  AuditLog
} from './accreditation-data';

// API base URL - defaults to localhost for development
const getApiBase = (): string => {
  let url = import.meta.env.VITE_API_URL || '';
  
  if (!url && typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    url = `${window.location.origin}/api`;
  }
  
  if (!url) url = 'http://localhost:3001/api';

  // Ensure it doesn't end with a slash to prevent double-slash with endpoints
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_BASE = getApiBase();

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

// Helper to transform API date strings and potential nulls
// Helper to transform API date strings and potential nulls
function transformAccreditation(apiAcc: Record<string, unknown>): Accreditation {
  const daysUntilExpiry = (apiAcc.daysUntilExpiry as number) ?? calculateDaysUntilExpiry(apiAcc.expiryDate as string);
  const status = (apiAcc.status as AccreditationStatus) ?? getStatus(daysUntilExpiry);

  return {
    id: String(apiAcc.id),
    programmeName: String(apiAcc.programmeName),
    accreditationType: (apiAcc.accreditationType as AccreditationType) || 'programme',
    faculty: String(apiAcc.faculty || ''),
    department: String(apiAcc.department || ''),
    startDate: String(apiAcc.startDate || ''),
    expiryDate: String(apiAcc.expiryDate),
    email: String(apiAcc.email || ''),
    workflowStatus: (apiAcc.workflowStatus as WorkflowStatus) || 'accredited',
    institutionId: String(apiAcc.institutionId || 'HTU'),
    notes: String(apiAcc.notes || ''),
    daysUntilExpiry,
    status,
    remarks: String(apiAcc.remarks || ''),
    programmeCategory: (apiAcc.programmeCategory as 'EP' | 'NP') || 'EP',
    firstAccreditationDate: String(apiAcc.firstAccreditationDate || ''),
    snoozedUntil: apiAcc.snoozedUntil ? String(apiAcc.snoozedUntil) : undefined,
  };
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    // Standardize on 'auth_email'
    const email = localStorage.getItem('auth_email') || localStorage.getItem('userEmail');
    const token = localStorage.getItem('auth_token');
    
    // Ensure endpoint starts with a slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Email': email || 'anonymous',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
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
    const response = await fetchApi<Record<string, unknown>[]>('/accreditations');
    if (response.error || !response.data) {
      return { data: null, error: response.error };
    }
    return {
      data: response.data.map(transformAccreditation),
      error: null,
    };
  },

  // Export accreditations to Excel
  async exportAccreditations(): Promise<ApiResponse<Blob>> {
    try {
      const email = localStorage.getItem('auth_email') || 'anonymous';
      const token = localStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {
        'X-User-Email': email,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/export-accreditations`, {
        headers,
      });

      if (!response.ok) {
        return { data: null, error: `Failed to export: ${response.statusText}` };
      }

      const blob = await response.blob();
      return { data: blob, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Network error' };
    }
  },

  // Get single accreditation by ID
  async getAccreditation(id: string): Promise<ApiResponse<Accreditation>> {
    const response = await fetchApi<Record<string, unknown>>(`/accreditations/${id}`);
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
      upcoming: number;
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
        snoozed: 0, // Placeholder as it's calculated on frontend
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
    accreditation_type?: string;
    faculty?: string;
    department?: string;
    start_date: string;
    expiry_date: string;
    email: string;
    workflow_status?: string;
    institution_id?: string;
    snoozed_until?: string | null;
    remarks?: string;
    programme_category?: 'EP' | 'NP';
    first_accreditation_date?: string;
  }): Promise<ApiResponse<{ id: number }>> {
    return fetchApi('/accreditations', {
      method: 'POST',
      body: JSON.stringify(acc),
    });
  },

  // Delete an accreditation
  async deleteAccreditation(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return fetchApi(`/accreditations/${id}`, {
      method: 'DELETE',
    });
  },

  // Update an accreditation
  async updateAccreditation(id: string, acc: {
    programme_name: string;
    accreditation_type?: string;
    faculty?: string;
    department?: string;
    start_date: string;
    expiry_date: string;
    email: string;
    workflow_status?: string;
    institution_id?: string;
    snoozed_until?: string | null;
    remarks?: string;
    programme_category?: 'EP' | 'NP';
    first_accreditation_date?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    return fetchApi(`/accreditations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(acc),
    });
  },

  // Login
  async login(email: string, password: string): Promise<ApiResponse<{ role: 'super_admin' | 'dean' | 'admin' | 'user'; department?: string; faculty?: string; token: string; email: string }>> {
    const res = await fetchApi<{ role: 'super_admin' | 'dean' | 'admin' | 'user'; department?: string; faculty?: string; token: string; email: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data?.token) {
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_email', res.data.email);
    }
    return res;
  },

  // Google Login
  async googleLogin(credential: string): Promise<ApiResponse<{ role?: 'super_admin' | 'dean' | 'admin' | 'user'; token?: string; status?: string; message?: string; email?: string; faculty?: string; department?: string }>> {
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

  // Document Management
  async getDocuments(accreditationId: string): Promise<ApiResponse<AccreditationDocument[]>> {
    return fetchApi(`/accreditations/${accreditationId}/documents`);
  },

  async uploadDocument(accreditationId: string, file: File, documentType: string, notes?: string): Promise<ApiResponse<{ success: boolean; documentId: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);

    const userEmail = localStorage.getItem('auth_email') || localStorage.getItem('userEmail') || 'anonymous';
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
      'X-User-Email': userEmail,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}/accreditations/${accreditationId}/documents`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: errorMsg };
    }
  },

  async deleteDocument(documentId: string): Promise<ApiResponse<{ success: boolean }>> {
    return fetchApi(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  getDocumentUrl(documentId: string): string {
    return `${API_BASE}/documents/${documentId}`;
  },

  // Readiness Checklist
  async getCheckpoints(accreditationId: string): Promise<ApiResponse<AccreditationCheckpoint[]>> {
    return fetchApi(`/accreditations/${accreditationId}/checkpoints`);
  },

  async updateCheckpoint(checkpointId: string, isCompleted: boolean): Promise<ApiResponse<{ success: boolean }>> {
    return fetchApi(`/checkpoints/${checkpointId}`, {
      method: 'PUT',
      body: JSON.stringify({ isCompleted }),
    });
  },

  async initializeCheckpoints(accreditationId: string): Promise<ApiResponse<{ success: boolean }>> {
    return fetchApi(`/accreditations/${accreditationId}/initialize-checkpoints`, {
      method: 'POST',
    });
  },

  async resetCheckpoints(accreditationId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi(`/accreditations/${accreditationId}/reset-checkpoints`, {
      method: 'POST',
    });
  },

  // Health check


  // Health check
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    return fetchApi('/health');
  },

  // Audit Logs
  async getAuditLogs(): Promise<ApiResponse<AuditLog[]>> {
    return fetchApi<AuditLog[]>('/audit-logs');
  },

  async getAuditAnalytics(): Promise<ApiResponse<{
    totalActionsToday: number;
    mostActiveAdmin: string;
    lastCriticalAction: AuditLog | null;
  }>> {
    return fetchApi('/audit-analytics');
  },

  // User Management
  async getUsers(): Promise<ApiResponse<UserAccount[]>> {
    return fetchApi<UserAccount[]>('/users');
  },

  async createUser(userData: { username: string; email: string; password?: string; role: string; faculty?: string; department?: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi<{ success: boolean; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async deleteUser(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi<{ success: boolean; message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async resetUserPassword(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi<{ success: boolean; message: string }>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async approveUser(userId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi<{ success: boolean; message: string }>(`/users/${userId}/approve`, {
      method: 'POST',
    });
  },

  async updateUser(userId: string, userData: { role?: string; faculty?: string; department?: string; status?: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchApi<{ success: boolean; message: string }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};


// Calculate metrics from accreditation array (for local mode)
export { calculateMetrics };
