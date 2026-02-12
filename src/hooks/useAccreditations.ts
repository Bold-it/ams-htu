import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Accreditation, calculateMetrics } from '@/lib/accreditation-data';
import { toast } from 'sonner';

export const accreditationKeys = {
  all: ['accreditations'] as const,
  metrics: ['metrics'] as const,
};

export function useAccreditations() {
  return useQuery({
    queryKey: accreditationKeys.all,
    queryFn: async () => {
      const { data, error } = await api.getAccreditations();
      if (error) throw new Error(error);
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useMetrics(accreditations: Accreditation[]) {
  return calculateMetrics(accreditations);
}

export function useSendReminder() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.sendReminder(id);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => toast.success('Reminder email sent successfully'),
    onError: (error: Error) => toast.error(`Failed to send reminder: ${error.message}`),
  });
}

export function useSendBulkReminders() {
  return useMutation({
    mutationFn: async (status?: 'warning' | 'critical' | 'all') => {
      const { data, error } = await api.sendBulkReminders(status);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data: any) => toast.success(`Sent ${data?.sent || 0} reminder email(s)`),
    onError: (error: Error) => toast.error(`Failed to send reminders: ${error.message}`),
  });
}

export function useAddAccreditation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (acc: {
      programme_name: string;
      start_date: string;
      expiry_date: string;
      email: string;
    }) => {
      const { data, error } = await api.addAccreditation(acc);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: accreditationKeys.all });
      toast.success(`Added "${variables.programme_name}" - Expires: ${variables.expiry_date}`);
    },
    onError: (error: Error) => toast.error(`Failed to add: ${error.message}`),
  });
}
