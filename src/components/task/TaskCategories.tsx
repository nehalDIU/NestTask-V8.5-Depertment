import {
  BookOpen,
  PenSquare,
  Presentation,
  Beaker,
  Microscope,
  ListTodo,
  FileText,
  Users,
  Building,
  Activity,
  Folder,
  PencilRuler,
  GraduationCap,
  MoreHorizontal
} from 'lucide-react';
import type { TaskCategory } from '../../types';

interface TaskCategoriesProps {
  onCategorySelect: (category: TaskCategory | null) => void;
  selectedCategory: TaskCategory | null;
  categoryCounts: Record<TaskCategory, number>;
}

export function TaskCategories({ onCategorySelect, selectedCategory, categoryCounts }: TaskCategoriesProps) {
  // Calculate total tasks from all categories
  const totalTasks = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  const allCategories = [
    { id: null, label: 'Total Tasks', icon: ListTodo, count: totalTasks },
    { id: 'task' as TaskCategory, label: 'Task', icon: BookOpen, count: categoryCounts['task'] || 0 },
    { id: 'presentation' as TaskCategory, label: 'Presentation', icon: Presentation, count: categoryCounts['presentation'] || 0 },
    { id: 'project' as TaskCategory, label: 'Project', icon: Folder, count: categoryCounts['project'] || 0 },
    { id: 'assignment' as TaskCategory, label: 'Assignment', icon: PenSquare, count: categoryCounts['assignment'] || 0 },
    { id: 'quiz' as TaskCategory, label: 'Quiz', icon: BookOpen, count: categoryCounts['quiz'] || 0 },
    { id: 'lab-report' as TaskCategory, label: 'Lab Report', icon: Beaker, count: categoryCounts['lab-report'] || 0 },
    { id: 'lab-final' as TaskCategory, label: 'Lab Final', icon: Microscope, count: categoryCounts['lab-final'] || 0 },
    { id: 'lab-performance' as TaskCategory, label: 'Lab perform..', icon: Activity, count: categoryCounts['lab-performance'] || 0 },
    { id: 'documents' as TaskCategory, label: 'Documents', icon: FileText, count: categoryCounts['documents'] || 0 },
    { id: 'blc' as TaskCategory, label: 'BLC', icon: Building, count: categoryCounts['blc'] || 0 },
    { id: 'groups' as TaskCategory, label: 'Groups', icon: Users, count: categoryCounts['groups'] || 0 },
    { id: 'others' as TaskCategory, label: 'Others', icon: MoreHorizontal, count: categoryCounts['others'] || 0 },
  ];



  return (
    <div className="mb-3 sm:mb-4">
      <div className="mb-3 sm:mb-4 px-3 xs:px-4 sm:px-0">
        <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Tasks
        </h2>
      </div>

      {/* Mobile: Fully scrollable categories */}
      <div className="block sm:hidden">
        <div className="flex mobile-category-gap-xs gap-2 xs:gap-3 overflow-x-auto pb-3 mobile-category-compact px-3 xs:px-4 scrollbar-hide mobile-category-scroll">
          {allCategories.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id || 'total'}
              onClick={() => onCategorySelect(id)}
              className={`
                flex-shrink-0 px-2.5 xs:px-3 sm:px-4 py-2 xs:py-2.5 sm:py-3 rounded-full
                mobile-category-text-xs text-sm font-medium whitespace-nowrap
                min-h-[44px] mobile-touch-target mobile-category-item transition-all duration-200
                ${selectedCategory === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {id === null ? 'All' : label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden sm:block">
        <div className="space-y-3">
          {/* Grid for categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {allCategories.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id || 'total'}
                onClick={() => onCategorySelect(id)}
                className={`
                  group flex items-center gap-2 p-3 sm:p-4 rounded-xl transition-all duration-200
                  ${selectedCategory === id
                    ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                    : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${count === 0 ? 'opacity-60 hover:opacity-100' : ''}`
                  }
                  hover:shadow-md hover:-translate-y-0.5
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors duration-200 flex-shrink-0
                  ${selectedCategory === id
                    ? 'bg-blue-500/20'
                    : 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                  }
                `}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  <div className={`text-xs ${selectedCategory === id ? 'opacity-80' : (count === 0 ? 'opacity-60 group-hover:opacity-80' : 'opacity-80')}`}>
                    {count} tasks
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}