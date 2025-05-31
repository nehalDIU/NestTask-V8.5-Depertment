import { useState, useCallback } from 'react';

// Define the types of operations
export type OperationType = 'create' | 'update' | 'delete';

export interface Operation {
  type: OperationType;
  endpoint: string;
  payload: any;
}

interface UseOperationsParams {
  entityType: 'task' | 'routine' | 'course' | 'teacher';
  userId: string;
}

interface UseOperationsResult {
  performOperation: (operation: Operation) => Promise<any>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing operations that need to be performed.
 * Simplified version without offline storage.
 */
export function useOperations({ 
  entityType, 
  userId 
}: UseOperationsParams): UseOperationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Perform operation immediately
  const performOperation = useCallback(async (operation: Operation) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Performing ${operation.type} operation for ${entityType}`);
      
      // Perform the actual API call
      const init: RequestInit = {
        method: operation.type === 'create' ? 'POST' : 
               operation.type === 'update' ? 'PUT' : 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // Add body for create and update operations
      if (operation.type !== 'delete') {
        init.body = JSON.stringify(operation.payload);
      }
      
      // Execute the API call
      const response = await fetch(operation.endpoint, init);
      
      if (!response.ok) {
        throw new Error(`Failed to perform operation. Status: ${response.status}`);
      }
      
      // Parse response data
      const data = await response.json();
      
      console.log(`Successfully performed ${operation.type} operation for ${entityType}`);
      return data;
    } catch (error) {
      console.error(`Failed to perform operation:`, error);
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);
  
  return {
    performOperation,
    isLoading,
    error
  };
} 