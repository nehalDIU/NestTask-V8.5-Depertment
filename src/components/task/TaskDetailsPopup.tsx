import { X, Calendar, Tag, Clock, Crown, Download, CheckCircle2, Clipboard, Copy, Link, ExternalLink, Eye, FileText, FileSpreadsheet, Presentation, FileImage, Folder, AlertCircle, Loader2 } from 'lucide-react';
import { parseLinks } from '../../utils/linkParser';
import { getGoogleDriveResourceType, extractGoogleDriveId, getGoogleDrivePreviewUrl, getGoogleDriveFilenames } from '../../utils/googleDriveUtils';
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
  const [downloadingLinks, setDownloadingLinks] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());

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

  // Google Drive utility functions
  const getGoogleDriveIcon = (url: string) => {
    const resourceType = getGoogleDriveResourceType(url).toLowerCase();
    if (resourceType.includes('document')) return FileText;
    if (resourceType.includes('spreadsheet')) return FileSpreadsheet;
    if (resourceType.includes('presentation')) return Presentation;
    if (resourceType.includes('folder')) return Folder;
    if (resourceType.includes('image')) return FileImage;
    return Link;
  };

  const handleGoogleDriveDownload = async (url: string) => {
    const fileId = extractGoogleDriveId(url);
    if (!fileId) {
      setDownloadErrors(prev => new Map(prev.set(url, 'Invalid Google Drive URL')));
      return;
    }

    setDownloadingLinks(prev => new Set(prev.add(url)));
    setDownloadErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(url);
      return newMap;
    });

    try {
      // For Google Drive files, we'll attempt to use the export/download URL
      const resourceType = getGoogleDriveResourceType(url);
      let downloadUrl = '';

      if (resourceType.includes('Document')) {
        downloadUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;
      } else if (resourceType.includes('Spreadsheet')) {
        downloadUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      } else if (resourceType.includes('Presentation')) {
        downloadUrl = `https://docs.google.com/presentation/d/${fileId}/export?format=pptx`;
      } else {
        // For regular files, try the direct download
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      // Open download URL in new tab (user will need to be signed in to Google)
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');

      // Clear loading state after a short delay
      setTimeout(() => {
        setDownloadingLinks(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
      }, 2000);

    } catch (error) {
      console.error('Error downloading Google Drive file:', error);
      setDownloadErrors(prev => new Map(prev.set(url, 'Download failed. Please try opening the link directly.')));
      setDownloadingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  };

  const handleSimplePreview = (url: string) => {
    // Get the preview URL for better viewing experience
    const previewUrl = getGoogleDrivePreviewUrl(url);

    // Open in new tab - use preview URL if available, otherwise use original URL
    const urlToOpen = previewUrl || url;

    console.log('Opening simple preview:', {
      originalUrl: url,
      previewUrl: previewUrl,
      opening: urlToOpen
    });

    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };



  const copyTaskToClipboard = () => {
    // Format the task information
    const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const formattedTask = `
📋 TASK: ${task.name}
📅 Due Date: ${formattedDate}${overdue ? ' (Overdue)' : ''}
🏷️ Category: ${task.category.replace('-', ' ')}
${task.isAdminTask ? '👑 Admin Task\n' : ''}
📝 Description:
${regularDescription}

🌐 View: https://nesttask.vercel.app/
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
      {/* Backdrop overlay - enhanced for full viewport coverage */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity overflow-hidden"
        onClick={onClose}
        style={{ 
          top: 0, 
          right: 0, 
          bottom: 0, 
          left: 0, 
          position: 'fixed',
          margin: 0,
          padding: 0,
          width: '100vw',
          height: '100vh'
        }}
        aria-hidden="true"
      />

      {/* Popup container - made more responsive for mobile */}
      <div 
        className="fixed inset-x-4 sm:inset-x-8 top-[5%] sm:top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl z-[10000] max-h-[90vh] sm:max-h-[80vh] overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b dark:border-gray-700">
          <div className="pr-2 sm:pr-8">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <h2 id="task-details-title" className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white line-clamp-2">
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

          {/* Google Drive Links - Professional Clean Design */}
          {task.googleDriveLinks && task.googleDriveLinks.length > 0 && (
            <div className="mt-6 sm:mt-8">
              {/* Clean Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Attachments
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {task.googleDriveLinks.length} {task.googleDriveLinks.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              <div className="space-y-3">
                {task.googleDriveLinks?.map((link, index) => {
                  const IconComponent = getGoogleDriveIcon(link);
                  const resourceType = getGoogleDriveResourceType(link);
                  // Generate filename using simple naming convention
                  const filenames = getGoogleDriveFilenames(task.googleDriveLinks || []);
                  const filename = filenames[index];
                  const isDownloading = downloadingLinks.has(link);
                  const downloadError = downloadErrors.get(link);

                  return (
                    <div
                      key={index}
                      className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          {/* Left side - File info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* File type icon */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-50 dark:bg-gray-700 flex-shrink-0">
                              <IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>

                            {/* File details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={filename}>
                                  {filename}
                                </h4>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex-shrink-0">
                                  Google Drive
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={link}>
                                {link.replace('https://', '').length > 50
                                  ? `${link.replace('https://', '').substring(0, 50)}...`
                                  : link.replace('https://', '')
                                }
                              </p>

                              {/* Error Message */}
                              {downloadError && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  <span>{downloadError}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right side - Action buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Preview Button */}
                            <button
                              onClick={() => handleSimplePreview(link)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                              aria-label={`Preview ${resourceType}`}
                              title="Preview file in new tab"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Preview</span>
                            </button>

                            {/* Download Button */}
                            <button
                              onClick={() => handleGoogleDriveDownload(link)}
                              disabled={isDownloading}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Download ${resourceType}`}
                              title={isDownloading ? 'Downloading...' : 'Download file'}
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">
                                {isDownloading ? 'Downloading...' : 'Download'}
                              </span>
                            </button>

                            {/* Open Button */}
                            <button
                              onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-gray-500"
                              aria-label={`Open ${resourceType} in new tab`}
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Open</span>
                            </button>
                          </div>
                        </div>
                      </div>
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
