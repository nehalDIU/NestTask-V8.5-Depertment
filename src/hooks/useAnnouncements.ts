import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement 
} from '../services/announcement.service';
import type { Announcement, NewAnnouncement } from '../types/announcement';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async (newAnnouncement: NewAnnouncement) => {
    try {
      setError(null);
      await createAnnouncement(newAnnouncement);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      setError(null);
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Function to manually refresh announcements
  const refreshAnnouncements = useCallback(async () => {
    try {
      return await loadAnnouncements(true);
    } catch (err: any) {
      console.error('Failed to refresh announcements:', err);
      setError(err.message);
      throw err;
    }
  }, [loadAnnouncements]);

  return {
    announcements,
    loading,
    error,
    createAnnouncement: handleCreateAnnouncement,
    deleteAnnouncement: handleDeleteAnnouncement,
    refreshAnnouncements
  };
}