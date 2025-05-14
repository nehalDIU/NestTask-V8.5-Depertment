import { useState, useEffect, useRef } from 'react';
import { Search, Trash2, CheckCircle, Clock, ListTodo, Edit2, X, ChevronLeft, ChevronRight, Building, AlertTriangle, SortAsc, SortDesc, MoreHorizontal, CheckSquare, Square } from 'lucide-react';
import { TaskEditModal } from './TaskEditModal';
import { formatDate, isOverdue } from '../../../utils/dateUtils';
import type { Task } from '../../../types';
import type { TaskPriority } from '../../../types/task';

interface TaskTableProps {
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, task: Partial<Task>) => void;
  isSectionAdmin?: boolean;
  viewMode?: 'table' | 'grid';
  selectedTaskIds?: string[];
  onToggleSelection?: (taskId: string) => void;
  onSelectAll?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function TaskTable({ 
  tasks, 
  onDeleteTask, 
  onUpdateTask, 
  isSectionAdmin = false,
  viewMode = 'table',
  selectedTaskIds = [],
  onToggleSelection = () => {},
  onSelectAll = () => {},
  sortBy = 'dueDate',
  sortOrder = 'asc',
  onSort = () => {}
}: TaskTableProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Check viewport width on mount and window resize
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    checkViewport();
    
    // Add event listener
    window.addEventListener('resize', checkViewport);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkViewport);
  }, []);
  
  // Truncate long text for cards
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'in-progress':
        return <Clock className="w-3 h-3" />;
      default:
        return <ListTodo className="w-3 h-3" />;
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'To Do';
    }
  };
  
  // Get priority color and badge
  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Low</span>;
      default:
        return null;
    }
  };
  
  // Handle task deletion
  const handleDeleteTask = async () => {
    if (taskToDelete) {
      try {
        await onDeleteTask(taskToDelete);
        setTaskToDelete(null);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };
  
  // Handle task update
  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await onUpdateTask(taskId, updates);
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };
  
  // Render sort indicator for column headers
  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    
    return sortOrder === 'asc' ? 
      <SortAsc className="w-3.5 h-3.5 ml-1 inline-block" /> : 
      <SortDesc className="w-3.5 h-3.5 ml-1 inline-block" />;
  };
  
  // If no tasks are available, show a message
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No tasks available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden" ref={tableRef}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          Tasks
          {isSectionAdmin && (
            <span className="text-sm text-green-600 dark:text-green-400 font-normal flex items-center gap-1">
              <Building className="w-4 h-4" />
              Section Tasks
            </span>
          )}
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <div 
              key={task.id}
              className={`relative p-4 border rounded-xl transition-all ${
                selectedTaskIds.includes(task.id) 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2.5 right-2.5">
                <button 
                  onClick={() => onToggleSelection(task.id)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {selectedTaskIds.includes(task.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
              
              <div className="mb-3 flex items-start">
                <h4 className="font-medium text-gray-900 dark:text-white break-words pr-7">
                  {task.name}
                </h4>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {getStatusLabel(task.status)}
                  </span>
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {task.category.replace(/-/g, ' ')}
                  </span>
                  
                  {task.priority && getPriorityBadge(task.priority)}
                </div>
                
                <div>
                  <span className={`text-sm flex items-center gap-1 ${
                    isOverdue(task.dueDate, task.status) 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {isOverdue(task.dueDate, task.status) && (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    Due: {formatDate(task.dueDate)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {truncateText(task.description, 120)}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/10 rounded-lg transition-colors"
                  aria-label={`Edit ${task.name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTaskToDelete(task.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                  aria-label={`Delete ${task.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && !isMobileView && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                  <button 
                    onClick={onSelectAll}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label="Select all tasks"
                  >
                    {selectedTaskIds.length === tasks.length && tasks.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={() => onSort('name')}
                    className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Task Name {renderSortIndicator('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={() => onSort('category')}
                    className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Category {renderSortIndicator('category')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button 
                    onClick={() => onSort('dueDate')}
                    className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Due Date {renderSortIndicator('dueDate')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                {tasks.some(t => t.priority) && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => onSort('priority')}
                      className="flex items-center hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Priority {renderSortIndicator('priority')}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tasks.map(task => (
                <tr 
                  key={task.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                    selectedTaskIds.includes(task.id) 
                      ? 'bg-blue-50 dark:bg-blue-900/10' 
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <button 
                      onClick={() => onToggleSelection(task.id)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {selectedTaskIds.includes(task.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {task.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {task.category.replace(/-/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className={isOverdue(task.dueDate, task.status) ? 'text-red-600 dark:text-red-400 font-medium flex items-center gap-1' : ''}>
                      {isOverdue(task.dueDate, task.status) && (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {formatDate(task.dueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      {getStatusLabel(task.status)}
                    </span>
                  </td>
                  {tasks.some(t => t.priority) && (
                    <td className="px-4 py-3 text-sm">
                      {getPriorityBadge(task.priority)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label={`Edit ${task.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTaskToDelete(task.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label={`Delete ${task.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card view */}
      {viewMode === 'table' && isMobileView && (
        <div className="p-3">
          <div className="space-y-3">
            {tasks.map(task => (
              <div 
                key={task.id}
                className={`relative p-4 border rounded-xl ${
                  selectedTaskIds.includes(task.id) 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-2.5 right-2.5">
                  <button 
                    onClick={() => onToggleSelection(task.id)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {selectedTaskIds.includes(task.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white break-words pr-7">
                    {truncateText(task.name, 40)}
                  </h4>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {getStatusLabel(task.status)}
                  </span>
                  
                  {task.priority && getPriorityBadge(task.priority)}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Category:</span>
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{task.category.replace(/-/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Due Date:</span>
                    <span className={`flex items-center gap-1 ${isOverdue(task.dueDate, task.status) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isOverdue(task.dueDate, task.status) && (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-3">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/10 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    aria-label={`Edit ${task.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setTaskToDelete(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-1 text-sm"
                    aria-label={`Delete ${task.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}