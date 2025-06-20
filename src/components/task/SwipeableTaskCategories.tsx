import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
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
  GraduationCap,
  MoreHorizontal
} from 'lucide-react';
import type { TaskCategory } from '../../types';

interface SwipeableTaskCategoriesProps {
  onCategorySelect: (category: TaskCategory | null) => void;
  selectedCategory: TaskCategory | null;
  categoryCounts: Record<TaskCategory, number>;
  title?: string;
}

// Static category configuration - moved outside component for better performance
const CATEGORY_CONFIG = [
  { id: 'assignment' as TaskCategory, label: 'Assignment', icon: PenSquare },
  { id: 'quiz' as TaskCategory, label: 'Quiz', icon: GraduationCap },
  { id: 'project' as TaskCategory, label: 'Project', icon: Folder },
  { id: 'presentation' as TaskCategory, label: 'Presentation', icon: Presentation },
  { id: 'lab-report' as TaskCategory, label: 'Lab Report', icon: Beaker },
  { id: 'lab-final' as TaskCategory, label: 'Lab Final', icon: Microscope },
  { id: 'lab-performance' as TaskCategory, label: 'Lab Performance', icon: Activity },
  { id: 'midterm' as TaskCategory, label: 'Midterm', icon: GraduationCap },
  { id: 'final-exam' as TaskCategory, label: 'Final Exam', icon: GraduationCap },
  { id: 'task' as TaskCategory, label: 'Task', icon: BookOpen },
  { id: 'documents' as TaskCategory, label: 'Documents', icon: FileText },
  { id: 'blc' as TaskCategory, label: 'BLC', icon: Building },
  { id: 'groups' as TaskCategory, label: 'Groups', icon: Users },
  { id: 'others' as TaskCategory, label: 'Others', icon: MoreHorizontal },
] as const;

// Constants for better performance
const SWIPE_THRESHOLD = 50;
const SCROLL_AMOUNT = 200;

// Optimized CSS classes - mobile-first approach
const CSS_CLASSES = {
  container: "py-3 sm:py-4 md:py-5",
  toggleButton: "text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 active:text-blue-700 dark:active:text-blue-300 sm:hover:text-blue-700 sm:dark:hover:text-blue-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md px-2 py-1 min-h-[32px] flex items-center",
  content: "transition-all duration-300 ease-in-out mt-1 sm:mt-2",
  gridView: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 py-2 sm:py-3 md:py-4 animate-fadeIn",
  scrollView: "flex gap-2 overflow-x-auto no-scrollbar py-2 sm:py-3 md:py-4 touch-manipulation scroll-smooth px-1 sm:gap-3 sm:px-0",
  categoryButtonBase: "transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
  categoryButtonGrid: "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:shadow-md hover:-translate-y-0.5",
  categoryButtonPill: "flex-shrink-0 flex items-center justify-center px-3 py-2 text-xs rounded-full whitespace-nowrap font-medium min-w-[60px] my-1 sm:px-4 sm:py-2.5 sm:text-sm sm:min-w-[80px] sm:my-1.5 md:px-5 md:py-3 md:text-base md:min-w-[100px] md:my-2",
  iconContainer: "p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-colors duration-200",
  countBadge: "text-xs px-1 sm:px-1.5 py-0.5 rounded-full min-w-[16px] sm:min-w-[20px] text-center"
} as const;

const SwipeableTaskCategoriesComponent = ({
  onCategorySelect,
  selectedCategory,
  categoryCounts,
  title = "All Tasks"
}: SwipeableTaskCategoriesProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoized calculations for better performance
  const totalTasks = useMemo(() =>
    Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
    [categoryCounts]
  );

  const allCategories = useMemo(() => [
    { id: null, label: 'All', icon: ListTodo, count: totalTasks },
    ...CATEGORY_CONFIG.map(({ id, label, icon }) => ({
      id,
      label,
      icon,
      count: categoryCounts[id] || 0
    }))
  ], [categoryCounts, totalTasks]);

  // Mobile-optimized categories - show most important ones first
  const priorityCategories = useMemo(() => [
    { id: null, label: 'All', icon: ListTodo, count: totalTasks },
    { id: 'assignment' as TaskCategory, label: 'Assignment', icon: PenSquare, count: categoryCounts['assignment'] || 0 },
    { id: 'quiz' as TaskCategory, label: 'Quiz', icon: GraduationCap, count: categoryCounts['quiz'] || 0 },
    { id: 'project' as TaskCategory, label: 'Project', icon: Folder, count: categoryCounts['project'] || 0 },
    { id: 'presentation' as TaskCategory, label: 'Presentation', icon: Presentation, count: categoryCounts['presentation'] || 0 },
    { id: 'others' as TaskCategory, label: 'Others', icon: MoreHorizontal, count: categoryCounts['others'] || 0 },
  ], [categoryCounts, totalTasks]);

  // Optimized touch event handlers with useCallback
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    if (scrollContainerRef.current) {
      if (isLeftSwipe) {
        scrollContainerRef.current.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
      }
      if (isRightSwipe) {
        scrollContainerRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
      }
    }
  }, [touchStart, touchEnd]);

  // Optimized toggle handler
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => {
      const newExpanded = !prev;
      if (prev && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return newExpanded;
    });
  }, []);

  // Memoized render functions for better performance - mobile optimized
  const renderExpandedView = useMemo(() => (
    <div
      className={CSS_CLASSES.gridView}
      role="grid"
      aria-label="Task categories grid view"
    >
      {allCategories.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id || 'total'}
          onClick={() => onCategorySelect(id)}
          aria-pressed={selectedCategory === id}
          aria-label={`${label} category, ${count} tasks`}
          className={`
            ${CSS_CLASSES.categoryButtonBase} ${CSS_CLASSES.categoryButtonGrid}
            ${selectedCategory === id
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg scale-[1.02]'
              : `bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700 ${count === 0 ? 'opacity-60 hover:opacity-100' : ''}`
            }
          `}
        >
          <div className={`
            ${CSS_CLASSES.iconContainer}
            ${selectedCategory === id
              ? 'bg-white/20 dark:bg-gray-900/20'
              : 'bg-blue-50 dark:bg-blue-900/20'
            }
          `}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs sm:text-sm font-medium truncate">{label}</div>
            <div className={`text-xs ${selectedCategory === id ? 'opacity-80' : (count === 0 ? 'opacity-60' : 'opacity-70')}`}>
              {count} tasks
            </div>
          </div>
        </button>
      ))}
    </div>
  ), [allCategories, selectedCategory, onCategorySelect]);

  const renderScrollableView = useMemo(() => (
    <div
      ref={scrollContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={CSS_CLASSES.scrollView}
      role="tablist"
      aria-label="Task categories horizontal scroll"
    >
      {priorityCategories.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id || 'total'}
          onClick={() => onCategorySelect(id)}
          role="tab"
          aria-selected={selectedCategory === id}
          aria-label={`${label} category`}
          className={`
            ${CSS_CLASSES.categoryButtonBase} ${CSS_CLASSES.categoryButtonPill}
            ${selectedCategory === id
              ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
              : `bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700 sm:hover:bg-gray-200 sm:dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 ${count === 0 ? 'opacity-60' : ''}`
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  ), [priorityCategories, selectedCategory, onCategorySelect, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <section className={CSS_CLASSES.container} aria-labelledby="task-list-heading">
      {/* Combined Title and See All Button */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
        <h2
          id="task-list-heading"
          className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white"
        >
          {title}
        </h2>
        <button
          onClick={handleToggleExpanded}
          aria-expanded={isExpanded}
          aria-controls="categories-content"
          className={CSS_CLASSES.toggleButton}
        >
          {isExpanded ? 'Show less' : 'See all'}
        </button>
      </div>

      {/* Categories */}
      <div
        id="categories-content"
        className={CSS_CLASSES.content}
        aria-live="polite"
      >
        {isExpanded ? renderExpandedView : renderScrollableView}
      </div>
    </section>
  );
};

// Memoized component for better performance
export const SwipeableTaskCategories = memo(SwipeableTaskCategoriesComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.selectedCategory === nextProps.selectedCategory &&
    prevProps.onCategorySelect === nextProps.onCategorySelect &&
    JSON.stringify(prevProps.categoryCounts) === JSON.stringify(nextProps.categoryCounts)
  );
});
