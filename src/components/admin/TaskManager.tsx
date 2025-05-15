import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TaskForm } from './task/TaskForm';
import { TaskTable } from './task/TaskTable';
import { TaskStats } from './task/TaskStats';
import { 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Download,
  Search,
  X,
  Loader2,
  CheckSquare,
  Trash2,
  RotateCcw,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import type { Task } from '../../types';
import type { NewTask, TaskStatus } from '../../types/task';
import { showErrorToast, showSuccessToast } from '../../utils/notifications';

interface TaskManagerProps {
  tasks: Task[];
  onCreateTask: (task: NewTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  showTaskForm?: boolean;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isLoading?: boolean;
}

export function TaskManager({ 
  tasks, 
  onCreateTask, 
  onDeleteTask, 
  onUpdateTask,
  showTaskForm: initialShowTaskForm = false,
  sectionId,
  isSectionAdmin = false,
  isLoading = false
}: TaskManagerProps) {
  // Main UI state
  const [showTaskForm, setShowTaskForm] = useState(true); // Always show task form
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Force showTaskForm state to match prop when it changes
  useEffect(() => {
    console.log('[Debug] TaskManager: initialShowTaskForm prop changed to', initialShowTaskForm);
    setShowTaskForm(true); // Always keep form visible
  }, [initialShowTaskForm]);

  // Debug logging on mount
  useEffect(() => {
    console.log('[Debug] TaskManager mounted with props:', {
      taskCount: tasks.length,
      showTaskForm: initialShowTaskForm,
      sectionId,
      isSectionAdmin
    });
  }, []);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'name' | 'category' | 'priority'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Bulk operations
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  // Date range filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Local state for optimistic UI updates
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  
  // Debounce search input
  const searchTimeoutRef = useRef<number | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Update local tasks when props change
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);
  
  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [categoryFilter, statusFilter, startDate, endDate, debouncedSearchTerm]);
  
  // Filter tasks with memoization
  const filteredTasks = useMemo(() => {
    return localTasks.filter(task => {
      // Category filter
      if (categoryFilter !== 'all' && task.category !== categoryFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      
      // Date range filter
      if (startDate && new Date(task.dueDate) < new Date(startDate)) {
        return false;
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of the day
        if (new Date(task.dueDate) > endDateObj) {
          return false;
        }
      }
      
      // Search filter
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        return (
          task.name.toLowerCase().includes(term) ||
          task.description.toLowerCase().includes(term) ||
          task.category.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [localTasks, categoryFilter, statusFilter, startDate, endDate, debouncedSearchTerm]);
  
  // Sort tasks with memoization
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'priority':
          // Handle priority sorting if available
          const aPriority = a.priority || 'medium';
          const bPriority = b.priority || 'medium';
          const priorityValues = { high: 3, medium: 2, low: 1 };
          comparison = (priorityValues[aPriority as keyof typeof priorityValues] || 0) - 
                       (priorityValues[bPriority as keyof typeof priorityValues] || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasks, sortBy, sortOrder]);
  
  // Paginate tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedTasks.slice(startIndex, startIndex + pageSize);
  }, [sortedTasks, page, pageSize]);
  
  // Handle task creation with optimistic update
  const handleCreateTask = useCallback(async (task: NewTask) => {
    try {
      // If section admin, automatically associate with section
      if (isSectionAdmin && sectionId) {
        const enhancedTask = {
          ...task,
          sectionId
        };
        
        // Create temporary optimistic task
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          ...enhancedTask,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBy: 'Pending...',
          assignedById: '',
          status: enhancedTask.status || 'my-tasks',
          isAdminTask: true
        };
        
        // Add to local state immediately
        setLocalTasks(prev => [optimisticTask, ...prev]);
        
        // Make actual API call
        await onCreateTask(enhancedTask);
        showSuccessToast('Task created successfully');
      } else {
        // Similar handling for non-section tasks
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`,
          ...task,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBy: 'Pending...',
          assignedById: '',
          status: task.status || 'my-tasks',
          isAdminTask: true
        };
        
        setLocalTasks(prev => [optimisticTask, ...prev]);
        await onCreateTask(task);
        showSuccessToast('Task created successfully');
      }
    } catch (error: any) {
      console.error('Error creating task:', error);
      showErrorToast(`Error creating task: ${error.message}`);
      
      // Remove optimistic task on error
      setLocalTasks(prev => prev.filter(t => !t.id.startsWith('temp-')));
    }
  }, [onCreateTask, isSectionAdmin, sectionId]);
  
  // Handle task deletion with optimistic update
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      // Optimistically remove task from local state
      setLocalTasks(prev => prev.filter(t => t.id !== taskId));
      
      // Make API call
      await onDeleteTask(taskId);
      showSuccessToast('Task deleted successfully');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      showErrorToast(`Error deleting task: ${error.message}`);
      
      // Refresh tasks to restore state on error
      setLocalTasks(tasks);
    }
  }, [onDeleteTask, tasks]);
  
  // Handle task update with optimistic update
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Update task optimistically
      setLocalTasks(prev => 
        prev.map(t => t.id === taskId 
          ? { ...t, ...updates, updatedAt: new Date().toISOString() } 
          : t
        )
      );
      
      // Make API call
      await onUpdateTask(taskId, updates);
      showSuccessToast('Task updated successfully');
    } catch (error: any) {
      console.error('Error updating task:', error);
      showErrorToast(`Error updating task: ${error.message}`);
      
      // Refresh tasks to restore state on error
      setLocalTasks(tasks);
    }
  }, [onUpdateTask, tasks]);
  
  // Handle bulk task deletion
  const handleBulkDelete = async () => {
    if (!selectedTaskIds.length) return;
    
    try {
      setIsProcessingBulk(true);
      
      // Optimistically remove tasks from local state
      setLocalTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      
      // Process in batches to avoid overwhelming the API
      const chunks = [];
      for (let i = 0; i < selectedTaskIds.length; i += 5) {
        chunks.push(selectedTaskIds.slice(i, i + 5));
      }
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(id => onDeleteTask(id)));
      }
      
      showSuccessToast(`${selectedTaskIds.length} tasks deleted successfully`);
      setSelectedTaskIds([]);
    } catch (error: any) {
      console.error('Error bulk deleting tasks:', error);
      showErrorToast(`Error deleting tasks: ${error.message}`);
      
      // Refresh tasks to restore state on error
      setLocalTasks(tasks);
    } finally {
      setIsProcessingBulk(false);
    }
  };
  
  // Handle bulk task status update
  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    if (selectedTaskIds.length === 0) return;
    
    setIsProcessingBulk(true);
    
    try {
      // Process each task sequentially
      for (const taskId of selectedTaskIds) {
        await onUpdateTask(taskId, { 
          status,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update local state (optimistic UI)
      setLocalTasks(prev => prev.map(task => {
        if (selectedTaskIds.includes(task.id)) {
          return {
            ...task,
            status,
            updatedAt: new Date().toISOString()
          };
        }
        return task;
      }));
      
      // Clear selection after the operation is complete
      setSelectedTaskIds([]);
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setIsProcessingBulk(false);
    }
  };
  
  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };
  
  // Select all visible tasks
  const selectAllTasks = () => {
    if (selectedTaskIds.length === paginatedTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(paginatedTasks.map(t => t.id));
    }
  };
  
  // Export tasks to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Category', 'Due Date', 'Status', 'Description'];
    
    // Format task data for CSV
    const csvData = sortedTasks.map(task => [
      `"${task.name.replace(/"/g, '""')}"`, // Escape double quotes
      `"${task.category.replace(/"/g, '""')}"`,
      `"${new Date(task.dueDate).toLocaleDateString()}"`,
      `"${task.status === 'my-tasks' ? 'To Do' : 
          task.status === 'in-progress' ? 'In Progress' : 'Completed'}"`,
      `"${task.description.replace(/"/g, '""')}"`
    ]);
    
    // Add headers
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_export_${sectionId ? `section_${sectionId}_` : ''}${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedTasks.length / pageSize);
  
  // Reset all filters
  const resetFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSortBy('dueDate');
    setSortOrder('asc');
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <button
            className="flex-1 sm:flex-none px-3 py-2 sm:py-2 sm:px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium shadow-sm whitespace-nowrap"
            onClick={() => setShowTaskForm(!showTaskForm)}
            disabled={isLoading}
          >
            {showTaskForm ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> : <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
            {showTaskForm ? 'Hide Form' : 'Create Task'}
          </button>
          
          <button
            className={`
              flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs sm:text-sm
              ${isLoading ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed' :
                showFilters ? 
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 
                'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}
            `}
            onClick={() => setShowFilters(!showFilters)}
            disabled={isLoading}
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Filters</span>
          </button>
          
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              className={`px-3 py-2 flex items-center justify-center ${viewMode === 'table' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              className={`px-3 py-2 flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          
          <div className="flex-1 sm:flex-none">
            <button
              className="w-full px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm"
              onClick={exportToCSV}
              disabled={isLoading || filteredTasks.length === 0}
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex items-center px-3 sm:px-4 py-2 bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none focus:ring-0 text-xs sm:text-sm w-full text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Tasks
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={resetFilters}
                className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 px-2"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Reset
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="my-tasks">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              >
                <option value="all">All Categories</option>
                <option value="assignment">Assignment</option>
                <option value="blc">BLC</option>
                <option value="documents">Documents</option>
                <option value="final-exam">Final Exam</option>
                <option value="groups">Groups</option>
                <option value="lab-final">Lab Final</option>
                <option value="lab-performance">Lab Performance</option>
                <option value="lab-report">Lab Report</option>
                <option value="midterm">Midterm</option>
                <option value="presentation">Presentation</option>
                <option value="project">Project</option>
                <option value="quiz">Quiz</option>
                <option value="task">Task</option>
                <option value="others">Others</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
                    placeholder="Start date"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bulk Actions - Show when tasks are selected */}
      {selectedTaskIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusUpdate('completed')}
              disabled={isProcessingBulk}
              className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="sm:inline">Complete</span>
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('in-progress')}
              disabled={isProcessingBulk}
              className="px-2.5 py-1.5 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="sm:inline">Progress</span>
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isProcessingBulk}
              className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="sm:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedTaskIds([])}
              disabled={isProcessingBulk}
              className="px-2.5 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
          <Loader2 className="w-7 h-7 sm:w-9 sm:h-9 text-blue-500 animate-spin mb-3" />
          <span className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Loading tasks...</span>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">This will just take a moment</p>
        </div>
      ) : (
        <>
          {/* Always show task form, even when there are no tasks */}
          {showTaskForm && (
            <TaskForm 
              onSubmit={handleCreateTask} 
              sectionId={sectionId} 
              isSectionAdmin={isSectionAdmin}
            />
          )}
          
          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm sm:text-base">
                {tasks.length === 0 
                  ? 'No tasks available yet' 
                  : 'No tasks match your search criteria'}
              </p>
              {tasks.length > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Task Analytics - moved to appear after the task form */}
              <div className="mb-4 sm:mb-6">
                <TaskStats tasks={filteredTasks} />
              </div>

              {/* Task Table with bulk selection */}
              <TaskTable
                tasks={paginatedTasks}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                isSectionAdmin={isSectionAdmin}
                viewMode={viewMode}
                selectedTaskIds={selectedTaskIds}
                onToggleSelection={toggleTaskSelection}
                onSelectAll={selectAllTasks}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={(field) => {
                  if (sortBy === field) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(field as any);
                    setSortOrder('asc');
                  }
                }}
              />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
                  <div className="text-gray-600 dark:text-gray-400">
                    Showing {Math.min((page - 1) * pageSize + 1, sortedTasks.length)} - {Math.min(page * pageSize, sortedTasks.length)} of {sortedTasks.length}
                  </div>
                  
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => setPage(1)} 
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="First page"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 -ml-2" />
                    </button>
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <div className="px-2 sm:px-3 py-1 text-xs sm:text-sm">
                      {page} / {totalPages}
                    </div>
                    
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => setPage(totalPages)} 
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Last page"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 -ml-2" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
} 