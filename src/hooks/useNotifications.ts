import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import type { AppNotification } from '@/shared';

/** Polled notification feed; swap the interval for a socket when available. */
export function useNotifications(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<AppNotification[]>(endpoints.notifications.list),
    enabled,
    refetchInterval: enabled ? 45_000 : false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(endpoints.notifications.markRead(id)),
    onMutate: async (id) => {
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications, (current) =>
        current?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
    onSettled: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post(endpoints.notifications.markAllRead),
    onMutate: async () => {
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications, (current) =>
        current?.map((n) => ({ ...n, read: true })),
      );
    },
    onSettled: invalidate,
  });

  const notifications = query.data ?? [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    loading: query.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}
