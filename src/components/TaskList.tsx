import { Task } from '../types';
import { 
  Crown, 
  Calendar, 
  BookOpen,
  PenSquare,
  Presentation,
  Beaker,
  Microscope,
  Activity,
  FileText,
  Building,
  Users,
  GraduationCap,
  Folder,
  Trash2,
  WifiOff
} from 'lucide-react';
import { isOverdue } from '../utils/dateUtils';
import { parseLinks } from '../utils/linkParser';
import { useState, useMemo, memo } from 'react';
import { TaskDetailsPopup } from './task/TaskDetailsPopup';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

interface TaskListProps {
  tasks: Task[];
  onDeleteTask?: (taskId: string) => void;
  showDeleteButton?: boolean;
}

// Memoized task item for better performance
const TaskItem = memo(({ 
  task, 
  index, 
  onSelect, 
  showDeleteButton, 
  onDeleteTask 
}: { 
  task: Task; 
  index: number;
  onSelect: () => void;
  showDeleteButton?: boolean;
  onDeleteTask?: (id: string) => void;
}) => {
  const overdue = isOverdue(task.dueDate);
  const cleanedDescription = cleanDescription(task.description);
  const parsedLinks = parseLinks(cleanedDescription);
  
  return (
    <div
      onClick={onSelect}
      className={`bg-white dark:bg-gray-800 
        rounded-lg border ${task.status === 'completed'
          ? 'border-green-100 dark:border-green-900/30'
          : overdue
            ? 'border-red-100 dark:border-red-900/30'
            : 'border-gray-100 dark:border-gray-700/30'
        } p-3 transition-all duration-150 active:scale-[0.99] touch-manipulation`}
      style={{ 
        animationDelay: `${index * 30}ms` // Reduced delay for faster appearance
      }}
    >
      {/* Header row with category and admin indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1 
          px-2 py-0.5 text-xs font-medium rounded-full
          bg-white dark:bg-gray-800/90 border border-gray-50 dark:border-gray-700/50
          ${getCategoryColor(task.category)}`}
        >
          <span className="w-3 h-3">{getCategoryIcon(task.category)}</span>
          <span className="truncate max-w-[80px]">{task.category.replace(/-/g, ' ')}</span>
        </span>

        {task.isAdminTask && (
          <Crown className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 mb-1">
        {task.name}
      </h3>
      
      {/* Description - simplified */}
      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
        {parsedLinks.map((part, i) => 
          part.type === 'text' ? 
            part.content : 
            <span key={i} className="text-blue-600 dark:text-blue-400">Link</span>
        )}
      </p>

      {/* Footer with status and date */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          <span className={`${overdue && task.status !== 'completed' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
        
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium
          ${task.status === 'completed' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : task.status === 'in-progress'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
          }`}
        >
          {task.status === 'completed' ? 'Completed' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
        </div>
      </div>

      {/* Delete button */}
      {showDeleteButton && onDeleteTask && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTask(task.id);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

// Helper function to clean the task description
const cleanDescription = (description: string) => {
  return description
    .replace(/\*This task is assigned to section ID: [0-9a-f-]+\*/g, '')
    .replace(/\n\nFor section: [0-9a-f-]+/g, '')
    .replace(/\n\n\*\*Attachments:\*\*[\s\S]*?((\n\n)|$)/g, '')
    .replace(/\[.*?\]\(attachment:.*?\)/g, '')
    .replace(/\nAttached Files:[\s\S]*?((\n\n)|$)/g, '')
    .replace(/\s*\[(data_analysis_report.*?)\]\s*/g, '')
    .trim();
};

// Category icon helper
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'quiz': return <BookOpen className="w-3 h-3" />;
    case 'assignment': return <PenSquare className="w-3 h-3" />;
    case 'presentation': return <Presentation className="w-3 h-3" />;
    case 'project': return <Folder className="w-3 h-3" />;
    case 'lab-report': return <Beaker className="w-3 h-3" />;
    case 'lab-final': return <Microscope className="w-3 h-3" />;
    case 'lab-performance': return <Activity className="w-3 h-3" />;
    case 'documents': return <FileText className="w-3 h-3" />;
    case 'blc': return <Building className="w-3 h-3" />;
    case 'groups': return <Users className="w-3 h-3" />;
    default: return <GraduationCap className="w-3 h-3" />;
  }
};

// Category color helper
const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'quiz': return 'text-blue-600 dark:text-blue-400';
    case 'assignment': return 'text-orange-600 dark:text-orange-400';
    case 'presentation': return 'text-red-600 dark:text-red-400';
    case 'project': return 'text-indigo-600 dark:text-indigo-400';
    case 'lab-report': return 'text-green-600 dark:text-green-400';
    case 'lab-final': return 'text-purple-600 dark:text-purple-400';
    case 'lab-performance': return 'text-pink-600 dark:text-pink-400';
    case 'documents': return 'text-yellow-600 dark:text-yellow-400';
    case 'blc': return 'text-cyan-600 dark:text-cyan-400';
    case 'groups': return 'text-teal-600 dark:text-teal-400';
    default: return 'text-gray-600 dark:text-gray-400';
  }
};

export const TaskList = ({ tasks = [], onDeleteTask, showDeleteButton = false }: TaskListProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const isOffline = useOfflineStatus();

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

  if (sortedTasks.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400 text-base font-medium">No tasks found</p>
        <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">Time to add some new tasks!</p>
      </div>
    );
  }

  return (
    <div>
      {isOffline && (
        <div className="mb-3 p-2 bg-blue-50 rounded-md flex items-center gap-2 text-xs text-blue-700 border border-blue-100">
          <WifiOff className="h-3 w-3 text-blue-500" />
          <p>You're offline. Showing cached tasks.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            onSelect={() => setSelectedTask(task)}
            showDeleteButton={showDeleteButton}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskDetailsPopup
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusUpdate={onDeleteTask ? (taskId, status) => {
            // Always return a Promise
            return new Promise<void>((resolve) => {
              // If the status is 'completed', handle it as a deletion
              if (status === 'completed' && onDeleteTask) {
                onDeleteTask(taskId);
              }
              resolve();
            });
          } : undefined}
          isUpdating={false}
        />
      )}
    </div>
  );
};
