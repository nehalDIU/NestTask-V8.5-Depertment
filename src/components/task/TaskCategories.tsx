import { useState, useRef } from 'react';
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
  ChevronDown, 
  ChevronUp, 
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const showMoreButtonRef = useRef<HTMLButtonElement>(null);

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

  // Show first 5 categories when collapsed on mobile, first 6 on desktop
  const mobileVisibleCategories = isMobileExpanded ? allCategories : allCategories.slice(0, 5);
  const desktopVisibleCategories = isExpanded ? allCategories : allCategories.slice(0, 6);
  const hasMoreCategories = allCategories.length > 6;
  const hasMobileMoreCategories = allCategories.length > 5;

  const handleToggleExpansion = () => {
    setIsExpanded(prevExpanded => {
      const nextExpanded = !prevExpanded;
      if (nextExpanded && showMoreButtonRef.current) {
        setTimeout(() => {
          showMoreButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 0);
      }
      return nextExpanded;
    });
  };

  const handleMobileToggleExpansion = () => {
    setIsMobileExpanded(prev => !prev);
  };

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5 px-4 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Tasks
        </h2>
        {hasMobileMoreCategories && (
          <button
            onClick={handleMobileToggleExpansion}
            className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 sm:hidden"
          >
            {isMobileExpanded ? 'Show less' : 'See all'}
          </button>
        )}
      </div>

      {/* Mobile: Expandable categories */}
      <div className="block sm:hidden">
        {/* First row - always visible */}
        <div className="flex gap-2 overflow-x-auto pb-3 px-4 scrollbar-hide">
          {mobileVisibleCategories.slice(0, 5).map(({ id, label, icon: Icon, count }) => (
            <button
              key={id || 'total'}
              onClick={() => onCategorySelect(id)}
              className={`
                flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap
                ${selectedCategory === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {id === null ? 'All' : label}
            </button>
          ))}
        </div>

        {/* Additional rows - shown when expanded */}
        {isMobileExpanded && mobileVisibleCategories.length > 5 && (
          <div className="space-y-3 px-4 animate-slideDown">
            {/* Split remaining categories into rows of 3-4 */}
            {Array.from({ length: Math.ceil((mobileVisibleCategories.length - 5) / 3) }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 overflow-x-auto scrollbar-hide">
                {mobileVisibleCategories
                  .slice(5 + rowIndex * 3, 5 + (rowIndex + 1) * 3)
                  .map(({ id, label, icon: Icon, count }) => (
                    <button
                      key={id || 'total'}
                      onClick={() => onCategorySelect(id)}
                      className={`
                        flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap
                        ${selectedCategory === id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {id === null ? 'All' : label}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden sm:block">
        {hasMoreCategories && (
          <div className="flex items-center justify-end mb-4">
            <button
              ref={showMoreButtonRef}
              onClick={handleToggleExpansion}
              className="flex items-center gap-1.5 px-3 py-1.5
                text-sm font-semibold text-blue-600 dark:text-blue-400
                bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
                rounded-full transition-all duration-200"
            >
              <span>{isExpanded ? 'Show Less' : 'Show All'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>
          </div>
        )}
        <div className="space-y-3">
          {/* Grid for categories */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            {desktopVisibleCategories.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id || 'total'}
                onClick={() => onCategorySelect(id)}
                className={`
                  group flex items-center gap-2 p-3 rounded-xl transition-all duration-200
                  ${selectedCategory === id
                    ? 'bg-blue-600 text-white shadow-lg scale-[1.02]'
                    : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 ${count === 0 ? 'opacity-60 hover:opacity-100' : ''}`
                  }
                  hover:shadow-md hover:-translate-y-0.5
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors duration-200
                  ${selectedCategory === id
                    ? 'bg-blue-500/20'
                    : 'bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{label}</div>
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