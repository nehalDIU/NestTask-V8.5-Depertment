import { X, Calendar, Tag, Clock, Crown, Download, CheckCircle2, Clipboard, Copy } from 'lucide-react';
import { parseLinks } from '../../utils/linkParser';
import type { Task } from '../../types';
import type { TaskStatus } from '../../types/task';
import { useState, useEffect } from 'react';

interface TaskDetailsPopupProps {
  task: Task;
  onClose: () => void;
  onStatusUpdate?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  isUpdating?: boolean;
}

export function TaskDetailsPopup({ 
  task, 
  onClose,
  onStatusUpdate,
  isUpdating = false
}: TaskDetailsPopupProps) {
  const [copied, setCopied] = useState(false);
  
  // Reset copied state after 2 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (copied) {
      timer = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [copied]);
  
  // Filter out section ID text
  const filteredDescription = task.description.replace(/\*This task is assigned to section ID: [0-9a-f-]+\*/g, '').trim();
  
  // Check for either "Attached Files:" or "**Attachments:**" format
  let regularDescription = filteredDescription;
  let fileSection: string[] = [];
  
  // Check for standard "Attached Files:" format
  if (filteredDescription.includes('\nAttached Files:')) {
    const parts = filteredDescription.split('\nAttached Files:');
    regularDescription = parts[0];
    fileSection = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
  } 
  // Check for "**Attachments:**" format
  else if (filteredDescription.includes('**Attachments:**')) {
    const parts = filteredDescription.split('**Attachments:**');
    regularDescription = parts[0];
    fileSection = parts[1]?.split('\n').filter(line => line.trim() && line.includes('](')) || [];
  }
  
  // Process description to preserve formatting while handling links
  const processDescription = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(paragraph => {
      const lines = paragraph.split('\n').filter(line => line !== undefined);
      const parsedLines = lines.map(line => parseLinks(line));
      return { lines: parsedLines };
    });
  };

  const formattedDescription = processDescription(regularDescription);
  const overdue = new Date(task.dueDate) < new Date();

  const handleDownload = async (url: string, filename: string) => {
    try {
      console.log('Downloading file:', { url, filename });
      
      // Check if the URL is an attachment URL format
      if (url.startsWith('attachment:')) {
        // Extract the file path from the attachment URL
        const filePath = url.replace('attachment:', '');
        console.log('Attachment file path:', filePath);
        
        // In a real implementation, you would fetch from your backend
        // For this demonstration, we'll create a simple CSV content
        const csvContent = `id,name,value\n1,Item 1,100\n2,Item 2,200\n3,Item 3,300`;
        
        // Create a blob from the content
        const blob = new Blob([csvContent], { type: 'text/csv' });
        
        // Create a download link and trigger the download
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
        }, 100);
      } else {
        // For regular URLs, open in a new tab
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const extractFileInfo = (line: string) => {
    console.log('Processing attachment line:', line);
    
    // Improved regex to extract name and URL from markdown link formats
    const matches = line.match(/\[(.*?)\]\((.*?)\)/);
    if (matches) {
      const filename = matches[1];
      const url = matches[2];
      console.log('Extracted file info:', { filename, url });
      return { filename, url };
    }
    return null;
  };

  const copyTaskToClipboard = () => {
    // Format the task information
    const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const taskUrl = `${window.location.origin}/task/${task.id}`;
    
    const formattedTask = `
📋 TASK: ${task.name}
📅 Due Date: ${formattedDate}${overdue ? ' (Overdue)' : ''}
🏷️ Category: ${task.category.replace('-', ' ')}
${task.isAdminTask ? '👑 Admin Task\n' : ''}
📝 Description:
${regularDescription}

🔗 View Task: ${taskUrl}
`;

    // Copy to clipboard
    navigator.clipboard.writeText(formattedTask)
      .then(() => {
        setCopied(true);
      })
      .catch(err => {
        console.error('Failed to copy task: ', err);
      });
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Popup container - made more responsive for mobile */}
      <div className="fixed inset-x-4 sm:inset-x-8 top-[5%] sm:top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] sm:max-h-[80vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b dark:border-gray-700">
          <div className="pr-2 sm:pr-8">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
                {task.name}
              </h2>
              {task.isAdminTask && (
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 animate-bounce-slow" />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {onStatusUpdate ? (
                <button
                  onClick={() => onStatusUpdate(task.id, task.status === 'completed' ? 'my-tasks' : 'completed')}
                  disabled={isUpdating}
                  className={`
                    inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 
                    text-xs font-medium rounded-full transition-all
                    ${task.status === 'completed'
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                </button>
              ) : (
                <span className={`
                  inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 
                  text-xs font-medium rounded-full
                  ${task.status === 'completed'
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : task.status === 'in-progress'
                    ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  }
                `}>
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {task.status === 'completed' ? 'Completed' : 
                   task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                </span>
              )}
              {task.isAdminTask && (
                <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                  Admin Task
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Copy Button with Tooltip */}
            <div className="relative group">
              <button
                onClick={copyTaskToClipboard}
                disabled={isUpdating}
                className={`
                  p-1.5 sm:p-2 flex items-center justify-center rounded-lg transition-all duration-200
                  ${copied 
                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-600'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                  touch-manipulation
                `}
                aria-label={copied ? "Task details copied" : "Copy task details"}
              >
                <span className={`transition-all duration-200 ${copied ? 'scale-110' : ''}`}>
                  {copied ? (
                    <CheckCircle2 className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  ) : (
                    <Copy className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  )}
                </span>
              </button>
              
              {/* Responsive tooltip that changes position based on screen size */}
              <div 
                className={`
                  absolute z-50 transition-all duration-200 transform pointer-events-none
                  text-xs font-medium text-white bg-gray-900/90 dark:bg-black/80 rounded px-2 py-1 whitespace-nowrap
                  left-1/2 -translate-x-1/2 select-none
                  
                  /* Mobile positioning (top) */
                  -top-9
                  
                  /* Desktop positioning (right) */
                  md:top-1/2 md:-translate-y-1/2 md:left-auto md:right-full md:mr-2 md:-translate-x-0
                  
                  ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                `}
              >
                {copied ? 'Copied!' : 'Copy task details'}
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation"
              aria-label="Close task details"
            >
              <X className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content with improved mobile scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain max-h-[calc(90vh-6rem)] sm:max-h-[calc(80vh-9rem)]">
          {/* Metadata - more compact on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="capitalize">{task.category.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                Due: {new Date(task.dueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                {overdue && ' (Overdue)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>
                Created: {new Date(task.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Description - improved text size for mobile */}
          {regularDescription && (
            <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                Description
              </h3>
              <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                {formattedDescription.map((paragraph, pIndex) => (
                  <div key={pIndex} className="mb-3 sm:mb-4 last:mb-0">
                    {paragraph.lines.map((line, lIndex) => (
                      <div key={lIndex} className="min-h-[1.4em] sm:min-h-[1.5em]">
                        {line.map((part, index) => 
                          part.type === 'link' ? (
                            <a
                              key={index}
                              href={part.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {part.content}
                            </a>
                          ) : (
                            <span key={index}>{part.content}</span>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files - improved touch targets for mobile */}
          {fileSection.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                Attached Files
              </h3>
              <div className="space-y-2">
                {fileSection.map((line, index) => {
                  const fileInfo = extractFileInfo(line);
                  if (!fileInfo) return null;

                  return (
                    <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600/30">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[65%] sm:max-w-[70%]">
                        {fileInfo.filename}
                      </span>
                      <button
                        onClick={() => handleDownload(fileInfo.url, fileInfo.filename)}
                        className="p-1.5 sm:p-2 rounded-md text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors active:bg-blue-100 dark:active:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 touch-manipulation"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Default export for lazy loading
export default { TaskDetailsPopup };