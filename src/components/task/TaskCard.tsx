import { Task } from '../../types';
import { memo, useMemo, lazy, Suspense } from 'react';
import { isOverdue } from '../../utils/dateUtils';
import { parseLinks } from '../../utils/linkParser';
// Import only the icons we definitely need immediately
import { Crown, Calendar } from 'lucide-react';

// Lazily load the category icons - shared across all instances
const iconMap = {
  quiz: lazy(() => import('lucide-react').then(mod => ({ default: mod.BookOpen }))),
  assignment: lazy(() => import('lucide-react').then(mod => ({ default: mod.PenSquare }))),
  presentation: lazy(() => import('lucide-react').then(mod => ({ default: mod.Presentation }))),
  project: lazy(() => import('lucide-react').then(mod => ({ default: mod.Folder }))),
  labreport: lazy(() => import('lucide-react').then(mod => ({ default: mod.Beaker }))),
  labfinal: lazy(() => import('lucide-react').then(mod => ({ default: mod.Microscope }))),
  labperformance: lazy(() => import('lucide-react').then(mod => ({ default: mod.Activity }))),
  documents: lazy(() => import('lucide-react').then(mod => ({ default: mod.FileText }))),
  blc: lazy(() => import('lucide-react').then(mod => ({ default: mod.Building }))),
  groups: lazy(() => import('lucide-react').then(mod => ({ default: mod.Users }))),
  default: lazy(() => import('lucide-react').then(mod => ({ default: mod.GraduationCap })))
};

// Single regex for more efficient text cleaning
const CLEAN_REGEX = new RegExp(
  [
    /\*This task is assigned to section ID: [0-9a-f-]+\*/,
    /\n\nFor section: [0-9a-f-]+/,
    /\n\n\*\*Attachments:\*\*[\s\S]*?((\n\n)|$)/,
    /\[.*?\]\(attachment:.*?\)/,
    /\nAttached Files:[\s\S]*?((\n\n)|$)/,
    /\s*\[(data_analysis_report.*?)\]\s*/
  ].map(r => r.source).join('|'),
  'g'
);

// Helper function to clean the task description for display in cards
const cleanDescription = (description: string) => {
  if (!description) return '';
  return description.replace(CLEAN_REGEX, '').trim();
};

// Static maps for colors and styles - shared across all instances
const categoryColorMap: Record<string, string> = {
  'quiz': 'text-blue-600 dark:text-blue-400',
  'assignment': 'text-orange-600 dark:text-orange-400',
  'presentation': 'text-red-600 dark:text-red-400',
  'project': 'text-indigo-600 dark:text-indigo-400',
  'lab-report': 'text-green-600 dark:text-green-400',
  'lab-final': 'text-purple-600 dark:text-purple-400',
  'lab-performance': 'text-pink-600 dark:text-pink-400',
  'documents': 'text-yellow-600 dark:text-yellow-400',
  'blc': 'text-cyan-600 dark:text-cyan-400',
  'groups': 'text-teal-600 dark:text-teal-400',
  'default': 'text-gray-600 dark:text-gray-400'
};

const statusStyleMap = {
  completed: {
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500',
    cardStyle: 'md:border-green-200 md:dark:border-green-900/80 bg-green-50 dark:bg-gray-800 md:bg-white md:dark:bg-gray-800'
  },
  overdue: {
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500',
    cardStyle: 'md:border-red-200 md:dark:border-red-900/80 bg-red-50 dark:bg-gray-800 md:bg-white md:dark:bg-gray-800'
  },
  default: {
    textColor: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500',
    cardStyle: 'md:border-sky-100 md:dark:border-sky-800/30 md:hover:border-sky-200 md:dark:hover:border-sky-700/50'
  }
};

// Helper functions for efficient category handling
const getCategoryColor = (category: string) => {
  const key = category.toLowerCase();
  return categoryColorMap[key] || categoryColorMap.default;
};

// Create a lightweight status indicator dot component
const StatusDot = memo(({ status, overdue }: { status: string; overdue: boolean }) => {
  // Only use animation for non-completed, important statuses
  const shouldAnimate = status !== 'completed' && (overdue || status === 'in-progress');
  
  const style = status === 'completed' 
    ? statusStyleMap.completed 
    : overdue 
      ? statusStyleMap.overdue 
      : statusStyleMap.default;
  
  return (
    <span className="relative flex h-2.5 w-2.5 md:h-2 md:w-2">
      {shouldAnimate && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.bgColor}`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 md:h-2 md:w-2 ${style.bgColor}`} />
    </span>
  );
});

// Create a lightweight icon component
const CategoryIcon = memo(({ category }: { category: string }) => {
  // Normalize the key by removing hyphens for better matching
  const key = category.toLowerCase().replace(/-/g, '') as keyof typeof iconMap;
  const IconComponent = iconMap[key] || iconMap.default;

  return (
    <Suspense fallback={<div className="w-3.5 h-3.5" />}>
      <IconComponent className="w-3.5 h-3.5" />
    </Suspense>
  );
});

interface TaskCardProps {
  task: Task;
  index: number;
  onSelect: (task: Task) => void;
}

// Optimized task card component
export const TaskCard = memo(({ 
  task, 
  index, 
  onSelect 
}: TaskCardProps) => {
  // These should be fast calculations, so we can do them directly
  const overdue = isOverdue(task.dueDate);
  const formattedCategory = task.category.replace(/-/g, ' ');
  const categoryColor = getCategoryColor(task.category);
  
  // Get status styles from our map for consistent rendering
  const statusStyle = useMemo(() => {
    if (task.status === 'completed') return statusStyleMap.completed;
    if (overdue) return statusStyleMap.overdue;
    return statusStyleMap.default;
  }, [task.status, overdue]);
  
  // These are more expensive, so we memoize them
  const cleanedDescription = useMemo(() => 
    task.description ? cleanDescription(task.description) : '', 
    [task.description]
  );
  
  // Only parse links if there's a cleaned description
  const parsedLinks = useMemo(() => 
    cleanedDescription ? parseLinks(cleanedDescription) : [],
    [cleanedDescription]
  );
  
  // Pre-format date once
  const formattedDate = useMemo(() => {
    try {
      return new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'No date';
    }
  }, [task.dueDate]);

  // Add a fade-in transition function to avoid style recalculation
  const getAnimationStyle = () => ({
    animationDelay: `${Math.min(index * 50, 300)}ms` // Cap animation delay to improve performance
  });

  return (
    <div
      onClick={() => onSelect(task)}
      className={`relative bg-white dark:bg-gray-800 md:bg-white md:dark:bg-gray-800
        rounded-2xl md:rounded-lg
        shadow-sm md:hover:shadow-lg
        border border-gray-100 dark:border-gray-700/50
        p-4 md:p-4 lg:p-5
        transition-all duration-300 ease-in-out
        active:scale-[0.98] md:active:scale-100 md:hover:-translate-y-1
        active:bg-gray-50 dark:active:bg-gray-800/90 md:active:bg-white
        touch-manipulation md:touch-auto
        ${statusStyle.cardStyle}
        motion-safe:animate-fade-in motion-safe:animate-duration-500`}
      style={getAnimationStyle()}
    >
      {/* Category Tag - Desktop */}
      <div className="hidden md:flex items-start justify-between mb-3.5 md:mb-2">
        <span className={`inline-flex items-center gap-1.5 
          px-2.5 py-1 md:px-2 md:py-0.5
          rounded-full text-sm md:text-xs font-medium
          bg-white dark:bg-gray-800
          shadow-sm md:hover:shadow
          border border-gray-100 dark:border-gray-700/50
          transition-all duration-200
          md:hover:-translate-y-0.5
          ${categoryColor}`}
        >
          <span className="w-3.5 h-3.5 md:w-3 md:h-3">
            <CategoryIcon category={task.category} />
          </span>
          <span className="truncate max-w-[130px] md:max-w-[100px] lg:max-w-[160px]">
            {formattedCategory}
          </span>
        </span>

        {task.isAdminTask && (
          <Crown className="w-4 h-4 text-amber-500 animate-pulse md:ml-2 hidden md:block" />
        )}
      </div>

      {/* Task Content with Mobile Tag */}
      <div className="space-y-2.5 md:space-y-2">
        {/* Title and Tag Container for Mobile */}
        <div className="flex items-start justify-between md:block">
          <h3 className="text-base md:text-sm lg:text-base font-semibold 
            text-gray-900 dark:text-gray-100 
            leading-snug md:leading-tight
            line-clamp-2 flex-1 md:flex-none"
          >
            {task.name}
          </h3>
          
          {/* Mobile-only Tag */}
          <span className={`md:hidden inline-flex items-center gap-1.5 
            px-2 py-0.5
            rounded-full text-xs font-medium
            bg-white dark:bg-gray-800
            shadow-sm
            border border-gray-100 dark:border-gray-700/50
            ml-2
            ${categoryColor}`}
          >
            <span className="w-3 h-3">
              <CategoryIcon category={task.category} />
            </span>
            <span className="truncate max-w-[80px]">
              {formattedCategory}
            </span>
          </span>
        </div>

        {/* Only render if we have links to show */}
        {parsedLinks.length > 0 && (
          <p className="text-[15px] md:text-sm 
            text-gray-600 dark:text-gray-300 
            leading-relaxed 
            line-clamp-2"
          >
            {parsedLinks.map((part, i) => 
              part.type === 'link' ? (
                <a
                  key={i}
                  href={part.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sky-600 dark:text-sky-400 
                    active:text-sky-800 md:hover:text-sky-700
                    underline-offset-2 decoration-1
                    px-0.5 -mx-0.5 rounded"
                >
                  {part.content}
                </a>
              ) : (
                <span key={i}>{part.content}</span>
              )
            )}
          </p>
        )}
      </div>

      {/* Mobile-optimized footer */}
      <div className="flex items-center justify-between 
        mt-3 pt-3
        border-t border-gray-100 dark:border-gray-700/50"
      >
        <div className="flex items-center gap-3">
          {/* Optimized status indicator with memo component */}
          <span className={`inline-flex items-center gap-1.5 
            text-sm md:text-xs font-medium ${statusStyle.textColor}`}
          >
            <StatusDot status={task.status} overdue={overdue} />
            {task.status === 'completed' ? 'Complete' : overdue ? 'Overdue' : 'In Progress'}
          </span>
        </div>

        {/* Due date display */}
        <div className="flex items-center gap-1.5">
          <Calendar className={`w-3.5 h-3.5 md:w-3 md:h-3 ${statusStyle.textColor}`} />
          <span className={`text-sm md:text-xs font-medium ${statusStyle.textColor}`}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Mobile-only touch feedback */}
      <div className="md:hidden absolute inset-0 rounded-2xl pointer-events-none
        bg-gray-900/0 active:bg-gray-900/[0.03] dark:active:bg-gray-900/[0.1]
        transition-colors duration-200" 
      />
    </div>
  );
}); 