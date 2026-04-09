import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/uabsenApi';

/**
 * Hook untuk notifikasi.
 * - Admin: menerima notif bertipe admin_alert/leave_request_submit/attendance_late
 * - Siswa: menerima notif yang recipient_auth_user_id = authUserId
 * - Realtime subscription agar dropdown auto-refresh tanpa reload halaman
 */
export function useNotifications(authUserId, role) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);
  const mountedRef = useRef(true);

  const loadNotifications = useCallback(async () => {
    if (!authUserId) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const data = await listNotifications({ authUserId });
      if (mountedRef.current) {
        setNotifications(data ?? []);
      }
    } catch (err) {
      console.error('Gagal memuat notifikasi:', err);
      if (mountedRef.current) {
        setNotifications([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [authUserId]);

  useEffect(() => {
    mountedRef.current = true;

    if (!authUserId) return;

    loadNotifications();

    // Realtime subscription — bungkus try/catch agar tidak crash jika Supabase
    // belum mengaktifkan Realtime atau ada masalah permission
    if (!supabase) return;

    let channel = null;

    try {
      const channelName = `notif-${authUserId}`;

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          () => {
            if (mountedRef.current) loadNotifications();
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          () => {
            if (mountedRef.current) loadNotifications();
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Realtime notifikasi tidak tersedia — menggunakan polling manual.');
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.warn('Gagal setup Realtime notifikasi:', err);
    }

    return () => {
      mountedRef.current = false;
      if (channelRef.current && supabase) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {
          // abaikan error saat cleanup
        }
        channelRef.current = null;
      }
    };
  }, [authUserId, role, loadNotifications]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.is_read).length,
    loading,
    reload: loadNotifications,

    readOne: async (id) => {
      try {
        await markNotificationRead(id);
        await loadNotifications();
      } catch (err) {
        console.error('Gagal tandai notifikasi:', err);
      }
    },

    readAll: async () => {
      try {
        await markAllNotificationsRead(authUserId);
        await loadNotifications();
      } catch (err) {
        console.error('Gagal tandai semua notifikasi:', err);
      }
    },
  };
}
