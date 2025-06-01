import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchRoutines,
  createRoutine as createRoutineService,
  updateRoutine as updateRoutineService,
  deleteRoutine as deleteRoutineService,
  addRoutineSlot,
  updateRoutineSlot,
  deleteRoutineSlot,
  activateRoutine as activateRoutineService,
  deactivateRoutine as deactivateRoutineService,
  bulkImportRoutineSlots as bulkImportRoutineSlotsService,
  exportRoutineWithSlots as exportRoutineWithSlotsService,
  getAllSemesters as getAllSemestersService,
  getRoutinesBySemester as getRoutinesBySemesterService
} from '../services/routine.service';
import type { Routine, RoutineSlot } from '../types/routine';
import { useOfflineStatus } from './useOfflineStatus';
import { setCache, getCache, clearCacheByPrefix } from '../utils/cache';

// Define cache keys
const ROUTINES_CACHE_KEY = 'routines';

export function useRoutines(userId?: string) {
  const [routines, setRoutines] = useState<Routine[]>(() => getCache<Routine[]>(ROUTINES_CACHE_KEY) || []);
  const [loading, setLoading] = useState(routines.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const isOffline = useOfflineStatus();

  const loadRoutines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (isOffline) {
        // If offline, try to use cached data
        console.log('[Debug] Offline mode: Using cached routine data');
        const cachedRoutines = getCache<Routine[]>(ROUTINES_CACHE_KEY);
        if (cachedRoutines && cachedRoutines.length > 0) {
          setRoutines(cachedRoutines);
        } else {
          setRoutines([]);
          setError('Offline mode: No cached routines available.');
        }
        return;
      }

      // Always fetch fresh data from server
      console.log('[Debug] Fetching fresh routines from server');
      const data = await fetchRoutines();
      console.log(`[Debug] Received ${data.length} routines from server`);
      setRoutines(data);
      
      // Update the cache
      setCache(ROUTINES_CACHE_KEY, data);
    } catch (err: any) {
      console.error('Error fetching routines:', err);
      setError(err.message || 'Failed to load routines');
      
      // Try to use cached data as fallback
      const cachedRoutines = getCache<Routine[]>(ROUTINES_CACHE_KEY);
      if (cachedRoutines && cachedRoutines.length > 0) {
        console.log('[Debug] Using cached routines as fallback');
        setRoutines(cachedRoutines);
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    // Load routines on initial mount
    loadRoutines();

    // Set up real-time subscription for routines updates when online
    if (!isOffline) {
      const subscription = supabase
        .channel('routines_channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'routines'
        }, () => {
          loadRoutines(); // Reload on database changes
        })
        .subscribe();

      // Additional event listener for page visibility changes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Force refresh when the page becomes visible again
          loadRoutines();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [loadRoutines, isOffline]);

  // Create a new routine
  const handleCreateRoutine = async (routine: Omit<Routine, 'id' | 'createdAt' | 'createdBy'>) => {
    if (isOffline) {
      throw new Error('Cannot create routines while offline. Please connect to the internet and try again.');
    }

    try {
      const createdRoutine = await createRoutineService(routine);
      // Update local state with the created routine
      setRoutines(prev => {
        const updated = [...prev, createdRoutine];
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      return createdRoutine;
    } catch (err: any) {
      console.error('Error creating routine:', err);
      throw err;
    }
  };

  // Update a routine
  const handleUpdateRoutine = async (routineId: string, updates: Partial<Routine>) => {
    if (isOffline) {
      throw new Error('Cannot update routines while offline. Please connect to the internet and try again.');
    }

    try {
      await updateRoutineService(routineId, updates);
      
      // Update local state with the updated routine
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, ...updates } : routine
        );
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      // Since the API doesn't return the updated routine, we'll construct it from our local state
      const updatedRoutine = routines.find(r => r.id === routineId);
      if (!updatedRoutine) {
        throw new Error('Routine not found after update');
      }
      
      return { ...updatedRoutine, ...updates };
    } catch (err: any) {
      console.error('Error updating routine:', err);
      throw err;
    }
  };

  // Delete a routine
  const handleDeleteRoutine = async (routineId: string) => {
    if (isOffline) {
      throw new Error('Cannot delete routines while offline. Please connect to the internet and try again.');
    }

    try {
      await deleteRoutineService(routineId);
      
      // Update local state by removing the deleted routine
      setRoutines(prev => {
        const updated = prev.filter(routine => routine.id !== routineId);
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting routine:', err);
      throw err;
    }
  };

  // Refresh routines manually
  const refreshRoutines = () => {
    if (isOffline) {
      console.log('Cannot refresh routines while offline');
      return Promise.reject('Cannot refresh routines while offline');
    }
    return loadRoutines();
  };

  // New function to prefetch related data for faster loading
  const prefetchRoutineData = useCallback(async () => {
    try {
      // Prefetch commonly needed static data in parallel
      await Promise.all([
        supabase.from('courses').select('id,name,code').then(),
        supabase.from('teachers').select('id,name').then(),
        supabase.from('departments').select('id,name').then(),
      ]);
    } catch (err) {
      console.error('Error prefetching routine data:', err);
    }
  }, []);

  // Add prefetch call to the main effect
  useEffect(() => {
    prefetchRoutineData(); // Prefetch related data while loading routines
  }, [prefetchRoutineData]);

  // Activate a routine
  const activateRoutine = async (routineId: string) => {
    if (isOffline) {
      throw new Error('Cannot activate routines while offline');
    }

    try {
      await activateRoutineService(routineId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, isActive: true } : routine
        );
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error activating routine:', err);
      throw err;
    }
  };

  // Deactivate a routine
  const deactivateRoutine = async (routineId: string) => {
    if (isOffline) {
      throw new Error('Cannot deactivate routines while offline');
    }

    try {
      await deactivateRoutineService(routineId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => 
          routine.id === routineId ? { ...routine, isActive: false } : routine
        );
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deactivating routine:', err);
      throw err;
    }
  };

  // Add a routine slot
  const handleAddRoutineSlot = async (routineId: string, slot: Omit<RoutineSlot, 'id' | 'routineId' | 'createdAt'>) => {
    if (isOffline) {
      throw new Error('Cannot add routine slots while offline');
    }

    try {
      const addedSlot = await addRoutineSlot(routineId, slot);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId) {
            const updatedSlots = routine.slots ? [...routine.slots, addedSlot] : [addedSlot];
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return addedSlot;
    } catch (err: any) {
      console.error('Error adding routine slot:', err);
      throw err;
    }
  };

  // Update a routine slot
  const handleUpdateRoutineSlot = async (routineId: string, slotId: string, updates: Partial<RoutineSlot>) => {
    if (isOffline) {
      throw new Error('Cannot update routine slots while offline');
    }

    try {
      await updateRoutineSlot(routineId, slotId, updates);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId && routine.slots) {
            const updatedSlots = routine.slots.map(slot => 
              slot.id === slotId ? { ...slot, ...updates } : slot
            );
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error updating routine slot:', err);
      throw err;
    }
  };

  // Delete a routine slot
  const handleDeleteRoutineSlot = async (routineId: string, slotId: string) => {
    if (isOffline) {
      throw new Error('Cannot delete routine slots while offline');
    }

    try {
      await deleteRoutineSlot(routineId, slotId);
      
      // Update local state
      setRoutines(prev => {
        const updated = prev.map(routine => {
          if (routine.id === routineId && routine.slots) {
            const updatedSlots = routine.slots.filter(slot => slot.id !== slotId);
            return { ...routine, slots: updatedSlots };
          }
          return routine;
        });
        setCache(ROUTINES_CACHE_KEY, updated);
        return updated;
      });
      
      return true;
    } catch (err: any) {
      console.error('Error deleting routine slot:', err);
      throw err;
    }
  };

  const bulkImportSlots = async (routineId: string, slotsData: any[]): Promise<{ success: number; errors: any[] }> => {
    if (isOffline) {
      throw new Error('Cannot import slots while offline');
    }

    try {
      const result = await bulkImportRoutineSlotsService(routineId, slotsData);
      
      // Refresh routines to get updated data
      await loadRoutines();
      
      return result;
    } catch (err: any) {
      console.error('Error bulk importing slots:', err);
      throw err;
    }
  };

  const exportRoutine = async (routineId: string) => {
    try {
      return await exportRoutineWithSlotsService(routineId);
    } catch (err: any) {
      console.error('Error exporting routine:', err);
      throw err;
    }
  };

  const getSemesters = async () => {
    try {
      return await getAllSemestersService();
    } catch (err: any) {
      console.error('Error getting semesters:', err);
      throw err;
    }
  };

  const getRoutinesBySemester = async (semester: string) => {
    try {
      return await getRoutinesBySemesterService(semester);
    } catch (err: any) {
      console.error(`Error getting routines for semester ${semester}:`, err);
      throw err;
    }
  };

  return {
    routines,
    loading,
    error,
    createRoutine: handleCreateRoutine,
    updateRoutine: handleUpdateRoutine,
    deleteRoutine: handleDeleteRoutine,
    refreshRoutines,
    activateRoutine,
    deactivateRoutine,
    addRoutineSlot: handleAddRoutineSlot,
    updateRoutineSlot: handleUpdateRoutineSlot,
    deleteRoutineSlot: handleDeleteRoutineSlot,
    bulkImportSlots,
    exportRoutine,
    getSemesters,
    getRoutinesBySemester
  };
}