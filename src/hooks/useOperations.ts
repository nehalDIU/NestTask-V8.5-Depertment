import { useState, useCallback, useEffect } from 'react';

// Define the types of operations
export type OperationType = 'create' | 'update' | 'delete';

export interface Operation {
  id: string;
  type: OperationType;
  endpoint: string;
  payload: any;
  timestamp: number;
  userId: string;
}

interface UseOperationsParams {
  entityType: 'task' | 'routine' | 'course' | 'teacher';
  userId: string;
}

interface UseOperationsResult {
  saveOperation: (operation: Omit<Operation, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
  executeOperation: () => Promise<void>;
  pendingOperations: Operation[];
  hasPendingOperations: boolean;
  isExecuting: boolean;
}

// In-memory store for operations
const operationStore = new Map<string, Operation[]>();

/**
 * Hook for managing operations with in-memory storage
 */
export function useOperations({ 
  entityType, 
  userId 
}: UseOperationsParams): UseOperationsResult {
  const [pendingOperations, setPendingOperations] = useState<Operation[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Get the store key for this entity type and user
  const getStoreKey = useCallback(() => {
    return `${entityType}_${userId}`;
  }, [entityType, userId]);
  
  // Load operations from memory store
  const loadOperations = useCallback(() => {
    const storeKey = getStoreKey();
    const operations = operationStore.get(storeKey) || [];
    setPendingOperations(operations);
  }, [getStoreKey]);
  
  // Initialize by loading operations
  useEffect(() => {
    loadOperations();
  }, [loadOperations]);
  
  // Save an operation to be processed
  const saveOperation = useCallback(async (
    operation: Omit<Operation, 'id' | 'timestamp' | 'userId'>
  ) => {
    try {
      const operationId = `${entityType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = Date.now();
      const storeKey = getStoreKey();
      
      const fullOperation: Operation = {
        ...operation,
        id: operationId,
        timestamp,
        userId
      };
      
      // Update memory store
      const currentOperations = operationStore.get(storeKey) || [];
      operationStore.set(storeKey, [...currentOperations, fullOperation]);
      
      // Update UI state
      setPendingOperations(prev => [...prev, fullOperation]);
      
      console.log(`Operation saved: ${operation.type} ${entityType}`);
    } catch (error) {
      console.error('Failed to save operation:', error);
    }
  }, [entityType, getStoreKey, userId]);
  
  // Execute operations
  const executeOperation = useCallback(async () => {
    if (pendingOperations.length === 0 || isExecuting) {
      return;
    }
    
    setIsExecuting(true);
    const storeKey = getStoreKey();
    
    try {
      for (const operation of pendingOperations) {
        try {
          // Perform the API call
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
            throw new Error(`Failed to execute operation. Status: ${response.status}`);
          }
          
          // Remove the operation from memory store after successful execution
          const currentOperations = operationStore.get(storeKey) || [];
          const updatedOperations = currentOperations.filter(op => op.id !== operation.id);
          operationStore.set(storeKey, updatedOperations);
          
          console.log(`Successfully executed ${operation.type} operation for ${entityType}`);
        } catch (error) {
          console.error(`Failed to execute operation:`, error, operation);
          
          // If this is a network error, break the loop
          if (error instanceof TypeError && error.message.includes('network')) {
            break;
          }
        }
      }
      
      // Refresh the pending operations
      loadOperations();
    } catch (error) {
      console.error('Error during operation execution:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [pendingOperations, isExecuting, getStoreKey, loadOperations, entityType]);
  
  return {
    saveOperation,
    executeOperation,
    pendingOperations,
    hasPendingOperations: pendingOperations.length > 0,
    isExecuting
  };
} 