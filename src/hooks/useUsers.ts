import { useState, useEffect } from 'react';
import { fetchUsers, deleteUser, promoteUser as promoteUserService, demoteUser as demoteUserService } from '../services/user.service';
import type { User } from '../types/auth';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setError(null);
      await deleteUser(userId);
      await loadUsers(); // Reload the users list after deletion
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handlePromoteUser = async (userId: string, role: 'admin' | 'section-admin') => {
    try {
      setError(null);
      await promoteUserService(userId, role);
      await loadUsers(); // Reload the users list after promotion
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDemoteUser = async (userId: string, role: 'user') => {
    try {
      setError(null);
      await demoteUserService(userId, role);
      await loadUsers(); // Reload the users list after demotion
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    refreshUsers: loadUsers,
    deleteUser: handleDeleteUser,
    promoteUser: handlePromoteUser,
    demoteUser: handleDemoteUser
  };
}