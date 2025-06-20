import { Task, TaskCategory } from '../types';
import { WifiOff } from 'lucide-react';
import { isOverdue } from '../utils/dateUtils';
import { useState, useMemo, memo, useCallback } from 'react';
import { TaskDetailsPopup } from './task/TaskDetailsPopup';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { TaskCard } from './task/TaskCard';
import { SwipeableTaskCategories } from './task/SwipeableTaskCategories';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask?: (taskId: string) => void;
  showDeleteButton?: boolean;
  title?: string;
  selectedCategory?: TaskCategory | null;
  onCategorySelect?: (category: TaskCategory | null) => void;
  categoryCounts?: Record<TaskCategory, number>;
  showCategories?: boolean;
  emptyStateMessage?: string;
}

// Apply memo to the main component to prevent unnecessary re-renders
export const TaskList = memo(({
  tasks = [],
  onDeleteTask,
  showDeleteButton = false,
  title = "All Tasks",
  selectedCategory,
  onCategorySelect,
  categoryCounts = {} as Record<TaskCategory, number>,
  showCategories = false,
  emptyStateMessage = "No tasks found"
}: TaskListProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const isOffline = useOfflineStatus();

  // Memoized task selection handler
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Sort tasks to move completed tasks to the bottom and handle overdue tasks
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // First, separate completed tasks from non-completed tasks
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      // For non-completed tasks, prioritize overdue tasks
      const aIsOverdue = isOverdue(a.dueDate);
      const bIsOverdue = isOverdue(b.dueDate);
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;

      // Otherwise, sort by due date (earlier dates first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks]);

  // Memoize the empty state to avoid recreation on each render
  const emptyState = useMemo(() => (
    <div className="text-center py-8 sm:py-12 animate-fade-in">
      <img
        src="https://images.unsplash.com/photo-1496115965489-21be7e6e59a0?auto=format&fit=crop&q=80&w=400"
        alt="Empty tasks"
        className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-2xl mx-auto mb-4 opacity-50 shadow-lg"
      />
      <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-medium">No tasks found</p>
      <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm sm:text-base">{emptyStateMessage}</p>

      {/* Show clear filter button when a category is selected */}
      {selectedCategory && onCategorySelect && (
        <button
          onClick={() => onCategorySelect(null)}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View All Tasks
        </button>
      )}
    </div>
  ), [emptyStateMessage, selectedCategory, onCategorySelect]);

  // Memoize the offline notice to prevent recreation
  const offlineNotice = useMemo(() => (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2 text-sm text-blue-700 border border-blue-100">
      <WifiOff className="h-4 w-4 text-blue-500" />
      <p>You're offline. Showing cached tasks.</p>
    </div>
  ), []);

  return (
    <div className="space-y-4">
      {isOffline && offlineNotice}

      {/* Task List Header with Categories */}
      <div className="space-y-3">
        {/* Categories - only show if enabled and handler provided */}
        {showCategories && onCategorySelect ? (
          <SwipeableTaskCategories
            onCategorySelect={onCategorySelect}
            selectedCategory={selectedCategory}
            categoryCounts={categoryCounts}
            title={title}
          />
        ) : (
          /* Title only when categories are not shown */
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
        )}
      </div>

      {/* Task Content or Empty State */}
      {sortedTasks.length > 0 ? (
        <div className="w-full max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 md:bg-transparent">
          {/* Mobile-optimized container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 md:gap-4 lg:gap-6 md:p-4 lg:p-6">
            {sortedTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onSelect={handleSelectTask}
              />
            ))}
          </div>
        </div>
      ) : (
        emptyState
      )}

      {/* Mobile-optimized modal */}
      {selectedTask && (
        <TaskDetailsPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
});