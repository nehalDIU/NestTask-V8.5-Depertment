import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Tag, Calendar, AlignLeft, Link2, Upload, CheckCircle, AlertCircle, ChevronDown, FileText, Paperclip, Eye, Edit3, Info } from 'lucide-react';
import type { Task } from '../../../types';
import type { TaskPriority } from '../../../types/task';

interface TaskEditModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskEditModal({ task, onClose, onUpdate }: TaskEditModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    name: task.name,
    category: task.category,
    dueDate: task.dueDate,
    description: task.description,
    status: task.status,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Focus first input on mount for better keyboard accessibility
  useEffect(() => {
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 100);
  }, []);
  
  // Add improved mobile touch detection
  useEffect(() => {
    const detectMobile = () => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };
    
    const isMobile = detectMobile();
    
    // Add mobile-specific class to body when modal is open
    if (isMobile) {
      document.body.classList.add('modal-open-mobile');
    }
    
    return () => {
      document.body.classList.remove('modal-open-mobile');
    };
  }, []);
  
  // Enhance touch handling for better mobile UX
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || e.touches.length !== 1) return;
    
    const touchY = e.touches[0].clientY;
    const deltaY = touchStart.y - touchY;
    
    // If scrolling up, prevent closing
    if (deltaY > 0) return;
    
    // For downward swipes, add some resistance
    const resistance = 0.4;
    const translateY = Math.min(Math.abs(deltaY) * resistance, 150);
    
    if (modalRef.current) {
      modalRef.current.style.transform = `translateY(${translateY}px)`;
      modalRef.current.style.transition = 'none';
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !modalRef.current) return;
    
    // Reset the modal position with a smooth transition
    modalRef.current.style.transform = '';
    modalRef.current.style.transition = 'transform 0.3s ease-out';
    
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStart.y - touchEndY;
    
    // If swiped down far enough, close the modal
    if (deltaY < -100) {
      onClose();
    }
    
    setTouchStart(null);
  };
  
  // Store form elements to restore focus
  const formElementRefs = useRef<Record<string, HTMLElement | null>>({});
  
  const storeRef = useCallback((el: HTMLElement | null, name: string) => {
    if (el) {
      formElementRefs.current[name] = el;
    }
  }, []);
  
  // Extract existing attachments from description and clean description
  useEffect(() => {
    if (task.description) {
      const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const matches: string[] = [];
      const existingLinks: string[] = [];
      
      // Replace description with clean version (without attachment links)
      let cleanDescription = task.description.replace(
        /\n\n\*\*Attachments:\*\*\n((?:- \[[^\]]+\]\([^)]+\)\n)*)/g, 
        ''
      ).replace(
        /\n\n\*\*Links:\*\*\n((?:- \[[^\]]+\]\([^)]+\)\n)*)/g, 
        ''
      ).trim();
      
      // Extract section ID from description
      const sectionIdRegex = /\*This task is assigned to section ID: ([a-f0-9-]+)\*/g;
      const sectionIdMatch = sectionIdRegex.exec(cleanDescription);
      
      if (sectionIdMatch) {
        // Remove the section ID line from the description
        cleanDescription = cleanDescription.replace(sectionIdRegex, '').trim();
      }
      
      // Check for inline attachment references
      const inlineAttachmentRegex = /\[([^\]]+)\]\(attachment:([^)]+)\)/g;
      let inlineMatch;
      
      while ((inlineMatch = inlineAttachmentRegex.exec(cleanDescription)) !== null) {
        const [fullMatch, text] = inlineMatch;
        // If there's an inline attachment reference, extract it and remove from description
        if (!matches.includes(text)) {
          matches.push(text);
        }
        cleanDescription = cleanDescription.replace(fullMatch, '').trim();
      }
      
      // Extract links and attachments separately from the full description
      let match;
      while ((match = regex.exec(task.description)) !== null) {
        const [fullMatch, text, url] = match;
        
        if (url.startsWith('attachment:')) {
          // Extract attachment references that might not have been caught above
          if (!matches.includes(text)) {
            matches.push(text);
          }
        } else if (!url.startsWith('attachment:') && text === url) {
          existingLinks.push(url);
        }
      }
      
      setAttachments(matches);
      setLinks(existingLinks);
      setFormData(prev => ({ ...prev, description: cleanDescription }));
    }
  }, [task.description]);

  // Detect keyboard users for focus styles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  // Validation function
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Task name is required';
      isValid = false;
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
      isValid = false;
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today && formData.status !== 'completed') {
        newErrors.dueDate = 'Due date cannot be in the past for non-completed tasks';
        isValid = false;
      }
    }
    
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  }, [formData]);
  
  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for due date on mobile
    if (name === 'dueDate' && value) {
      try {
        // Validate date format
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          setErrors(prev => ({
            ...prev,
            [name]: 'Please enter a valid date'
          }));
          return;
        }
      } catch (error) {
        console.error('Date parsing error:', error);
        setErrors(prev => ({
          ...prev,
          [name]: 'Invalid date format'
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Provide haptic feedback on mobile if available
    if ('vibrate' in navigator && 'ontouchstart' in window) {
      try {
        navigator.vibrate(5); // Subtle feedback
      } catch (e) {
        // Ignore if vibration API not available
      }
    }
  }, [errors]);
  
  // Add link
  const addLink = useCallback(() => {
    if (linkInput.trim() && !links.includes(linkInput)) {
      setLinks(prev => [...prev, linkInput]);
      setLinkInput('');
    }
  }, [linkInput, links]);
  
  // Remove link
  const removeLink = useCallback((index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Create temporary URLs for display
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setFileUrls(prev => [...prev, ...newUrls]);
    }
  }, []);
  
  // Remove file
  const removeFile = useCallback((index: number) => {
    if (fileUrls[index]) {
      URL.revokeObjectURL(fileUrls[index]);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  }, [fileUrls]);
  
  // Remove existing attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // Clean and prepare description
      let enhancedDescription = formData.description?.trim() || '';
      
      // Remove any existing attachment or link references if they exist at the end of description
      enhancedDescription = enhancedDescription
        .replace(/\n\n\*\*Attachments:\*\*\n((?:- \[[^\]]+\]\([^)]+\)\n)*)/g, '')
        .replace(/\n\n\*\*Links:\*\*\n((?:- \[[^\]]+\]\([^)]+\)\n)*)/g, '')
        .trim();
      
      // Preserve section ID if present
      if (task.sectionId) {
        enhancedDescription += `\n\n*This task is assigned to section ID: ${task.sectionId}*`;
      }
      
      // Add links to description if any exist
      if (links.length > 0) {
        enhancedDescription += '\n\n**Links:**\n';
        links.forEach(link => {
          enhancedDescription += `- [${link}](${link})\n`;
        });
      }
      
      // Add attachments section if any exist
      if (attachments.length > 0 || files.length > 0) {
        enhancedDescription += '\n\n**Attachments:**\n';
        
        // Add existing attachments
        attachments.forEach(attachment => {
          enhancedDescription += `- [${attachment}](attachment:${attachment})\n`;
        });
        
        // Add new files
        files.forEach(file => {
          enhancedDescription += `- [${file.name}](attachment:${file.name})\n`;
        });
      }
      
      const updates: Partial<Task> = {
        ...formData,
        description: enhancedDescription,
      };
      
      onUpdate(task.id, updates);
      setShowSuccess(true);
      
      // Close modal after success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, links, attachments, files, validate, onUpdate, task.id, task.sectionId, onClose]);
  
  const getMinDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);
  
  // Handle modal backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Format markdown content for preview
  const renderMarkdownPreview = useCallback((content: string): string => {
    if (!content) return '';
    
    // Replace line breaks with HTML breaks
    let formatted = content.replace(/\n/g, '<br>');
    
    // Format bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format italics
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Format attachment links specially
    formatted = formatted.replace(
      /\[([^\]]+)\]\(attachment:([^)]+)\)/g, 
      '<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>$1</span>'
    );
    
    // Format regular links
    formatted = formatted.replace(
      /\[([^\]]+)\]\((?!attachment:)([^)]+)\)/g, 
      '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank">$1</a>'
    );
    
    return formatted;
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-xl relative animate-slideIn"
        ref={modalRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Improved swipe indicator for mobile */}
        <div className="absolute left-0 right-0 flex justify-center -top-1 touch-none">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full transform translate-y-1 opacity-80"></div>
        </div>
        
        {/* Modal Header - improved for mobile */}
        <div className="sticky top-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 z-10 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white" id="edit-task-title">
            Edit Task
          </h3>
          <div className="flex items-center gap-2">
            {/* Preview toggle button */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-1"
              aria-label={showPreview ? "Edit description" : "Preview description"}
            >
              {showPreview ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{showPreview ? "Edit" : "Preview"}</span>
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4 md:col-span-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  ref={nameInputRef}
                  value={formData.name || ''}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base
                    ${errors.name ? 'border-red-500 dark:border-red-500' : ''} ${isKeyboardUser ? 'focus:ring-2' : 'focus:ring-0'}`}
                  placeholder="Enter task name"
                  aria-required="true"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {errors.name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <select
                  id="category"
                  name="category"
                  ref={(el) => storeRef(el, 'category')}
                  value={formData.category || ''}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base appearance-none"
                  aria-required="true"
                >
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  id="dueDate"
                  name="dueDate"
                  ref={(el) => storeRef(el, 'dueDate')}
                  value={formData.dueDate || ''}
                  min={formData.status === 'completed' ? undefined : getMinDate()}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base
                    ${errors.dueDate ? 'border-red-500 dark:border-red-500' : ''}`}
                  aria-required="true"
                  aria-invalid={!!errors.dueDate}
                  onClick={(e) => {
                    // Force open native date picker on mobile
                    const input = e.currentTarget;
                    input.showPicker && input.showPicker();
                  }}
                />
                {errors.dueDate && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {errors.dueDate}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <button 
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="relative">
                <select
                  id="status"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base appearance-none"
                >
                  <option value="my-tasks">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  Description<span className="text-red-500">*</span>
                  {attachments.length > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <div className="relative group">
                    <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help dark:hover:text-gray-200" />
                    <div className="absolute left-0 bottom-full mb-2 w-60 p-2 bg-white dark:bg-gray-800 rounded shadow-lg text-xs border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                      <p>Use markdown formatting:</p>
                      <p><code>**bold**</code> for <strong>bold text</strong></p>
                      <p><code>*italic*</code> for <em>italic text</em></p>
                      <p>New lines create paragraphs</p>
                    </div>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  aria-label={showPreview ? "Edit description" : "Preview description"}
                >
                  {showPreview ? (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                {!showPreview ? (
                  <>
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <AlignLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleChange}
                      rows={4}
                      onFocus={() => {
                        // On mobile, scroll to keep the textarea in view when keyboard appears
                        if ('ontouchstart' in window) {
                          setTimeout(() => {
                            modalRef.current?.scrollTo({
                              top: modalRef.current.scrollTop + 200,
                              behavior: 'smooth'
                            });
                          }, 300);
                        }
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base
                        ${errors.description ? 'border-red-500 dark:border-red-500' : ''}`}
                      placeholder="Enter task description"
                      aria-required="true"
                      aria-invalid={!!errors.description}
                    ></textarea>
                  </>
                ) : (
                  <div 
                    className="w-full px-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm sm:text-base text-gray-700 dark:text-gray-200 min-h-[6rem]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(formData.description || '') }}
                  ></div>
                )}
                {errors.description && !showPreview && (
                  <p className="mt-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {errors.description}
                  </p>
                )}
              </div>
              
              {/* Section ID display if present */}
              {task.sectionId && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="font-medium">Section ID:</span> 
                  <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
                    {task.sectionId}
                  </code>
                </div>
              )}
            </div>
            
            {showAdvanced && (
              <>
                <div className="md:col-span-2">
                  <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Links</h4>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <input
                          type="url"
                          id="link"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && linkInput.trim()) {
                              e.preventDefault();
                              addLink();
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          placeholder="https://example.com"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addLink}
                        className="px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center text-sm min-w-[100px]"
                        disabled={!linkInput.trim()}
                      >
                        Add Link
                      </button>
                    </div>
                    
                    {links.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate max-w-[calc(100%-40px)]"
                            >
                              {link}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeLink(index)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                              aria-label={`Remove link ${link}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="pb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Attachments
                      </span>
                      {attachments.length > 0 && (
                        <div className="relative group">
                          <button
                            type="button"
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                            aria-label="How to use attachments"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">How to use</span>
                          </button>
                          <div className="absolute right-0 bottom-full mb-2 w-60 p-2 bg-white dark:bg-gray-800 rounded shadow-lg text-xs border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                            <p>To reference an attachment in your description:</p>
                            <code className="block mt-1 p-1 bg-gray-100 dark:bg-gray-700 rounded">
                              See my [filename.csv](attachment:filename.csv)
                            </code>
                          </div>
                        </div>
                      )}
                    </h4>
                    
                    {/* Existing attachments */}
                    {attachments.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Current Attachments
                        </h5>
                        <div className="space-y-2">
                          {attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[calc(100%-40px)] flex items-center gap-2">
                                <Upload className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium">{attachment}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                                aria-label={`Remove attachment ${attachment}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* File Upload */}
                    <label 
                      htmlFor="file-upload" 
                      className="border-2 border-dashed dark:border-gray-600 rounded-xl p-4 sm:p-6 text-center flex flex-col items-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    >
                      <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 mb-2" />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                          Upload files
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileUpload}
                        />
                        <p className="mt-1 text-xs sm:text-sm">Drag and drop or click to select</p>
                      </div>
                    </label>
                    
                    {/* New files */}
                    {files.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          New Attachments
                        </h5>
                        <div className="space-y-2">
                          {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center text-sm truncate max-w-[calc(100%-40px)]">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {file.name}
                                </div>
                                <div className="ml-2 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                                aria-label={`Remove file ${file.name}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Submit button - improved mobile positioning */}
          <div className="sticky bottom-0 left-0 right-0 flex justify-end px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
          
          {/* Add improved mobile responsive success state */}
          {showSuccess && (
            <div className="fixed inset-x-0 top-4 flex justify-center items-center z-50 px-4">
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl shadow-lg px-4 py-3 flex items-center gap-2 max-w-md animate-slideDown">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-green-800 dark:text-green-200 text-sm">Task updated successfully</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}