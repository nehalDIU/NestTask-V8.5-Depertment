import { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { 
  Tag, 
  Calendar, 
  AlignLeft, 
  Plus, 
  Link2, 
  ListTodo, 
  Upload, 
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import type { NewTask } from '../../../types/task';

interface TaskFormProps {
  onSubmit: (task: NewTask) => void;
  sectionId?: string;
  isSectionAdmin?: boolean;
}

// Extended error type to include files property
type TaskFormErrors = Partial<Record<keyof NewTask | 'files', string>>;

// Form state interface
interface FormState {
  taskDetails: NewTask;
  errors: TaskFormErrors;
  files: File[];
  fileUrls: string[];
  linkInput: string;
  links: string[];
  isSubmitting: boolean;
  success: boolean;
  showAdvanced: boolean;
  uploadProgress: number;
}

// Form action types
type FormAction = 
  | { type: 'SET_TASK_FIELD', field: keyof NewTask, value: string }
  | { type: 'SET_ERRORS', errors: TaskFormErrors }
  | { type: 'CLEAR_ERROR', field: keyof NewTask | 'files' }
  | { type: 'ADD_FILES', newFiles: File[], newUrls: string[] }
  | { type: 'REMOVE_FILE', index: number }
  | { type: 'SET_LINK_INPUT', value: string }
  | { type: 'ADD_LINK', link: string }
  | { type: 'REMOVE_LINK', index: number }
  | { type: 'SET_SUBMITTING', isSubmitting: boolean }
  | { type: 'SET_SUCCESS', success: boolean }
  | { type: 'TOGGLE_ADVANCED' }
  | { type: 'SET_UPLOAD_PROGRESS', progress: number }
  | { type: 'RESET_FORM', sectionId?: string };

// Initial state creator function
const createInitialState = (sectionId?: string): FormState => ({
  taskDetails: {
    name: '',
    category: 'task',
    dueDate: '',
    description: '',
    status: 'in-progress',
    sectionId: sectionId || undefined
  },
  errors: {},
  files: [],
  fileUrls: [],
  linkInput: '',
  links: [],
  isSubmitting: false,
  success: false,
  showAdvanced: false,
  uploadProgress: 0
});

// Form reducer
function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_TASK_FIELD':
      return {
        ...state,
        taskDetails: {
          ...state.taskDetails,
          [action.field]: action.value
        }
      };
    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors
      };
    case 'CLEAR_ERROR':
      const { [action.field]: _, ...remainingErrors } = state.errors;
      return {
        ...state,
        errors: remainingErrors
      };
    case 'ADD_FILES':
      return {
        ...state,
        files: [...state.files, ...action.newFiles],
        fileUrls: [...state.fileUrls, ...action.newUrls]
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((_, i) => i !== action.index),
        fileUrls: state.fileUrls.filter((_, i) => i !== action.index)
      };
    case 'SET_LINK_INPUT':
      return {
        ...state,
        linkInput: action.value
      };
    case 'ADD_LINK':
      return {
        ...state,
        links: [...state.links, action.link],
        linkInput: ''
      };
    case 'REMOVE_LINK':
      return {
        ...state,
        links: state.links.filter((_, i) => i !== action.index)
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.isSubmitting
      };
    case 'SET_SUCCESS':
      return {
        ...state,
        success: action.success
      };
    case 'TOGGLE_ADVANCED':
      return {
        ...state,
        showAdvanced: !state.showAdvanced
      };
    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.progress
      };
    case 'RESET_FORM':
      return createInitialState(action.sectionId);
    default:
      return state;
  }
}

export function TaskForm({ onSubmit, sectionId, isSectionAdmin = false }: TaskFormProps) {
  // Use reducer for form state management
  const [state, dispatch] = useReducer(formReducer, createInitialState(sectionId));
  
  // Destructure state for easier access
  const {
    taskDetails,
    errors,
    files,
    fileUrls,
    linkInput,
    links,
    isSubmitting,
    success,
    showAdvanced,
    uploadProgress
  } = state;
  
  // Refs for managing timeouts and component lifecycle
  const submissionTimeoutRef = useRef<NodeJS.Timeout>();
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController>();
  
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cleanup file URLs
      fileUrls.forEach(url => {
        if (url && !url.startsWith('placeholder-')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [fileUrls]);

  // Check if device is mobile - memoized
  const isMobile = useCallback(() => {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  }, []);
  
  // Validation function - memoized for performance
  const validate = useCallback((): boolean => {
    const newErrors: TaskFormErrors = {};
    let isValid = true;
    
    if (!taskDetails.name.trim()) {
      newErrors.name = 'Task name is required';
      isValid = false;
    }
    
    if (!taskDetails.dueDate) {
      newErrors.dueDate = 'Due date is required';
      isValid = false;
    } else {
      const selectedDate = new Date(taskDetails.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
        isValid = false;
      }
    }
    
    if (!taskDetails.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }
    
    dispatch({ type: 'SET_ERRORS', errors: newErrors });
    return isValid;
  }, [taskDetails]);
  
  // Handle input changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    dispatch({ 
      type: 'SET_TASK_FIELD', 
      field: name as keyof NewTask, 
      value 
    });
    
    // Clear error when user types
    if (errors[name as keyof NewTask]) {
      dispatch({ type: 'CLEAR_ERROR', field: name as keyof NewTask });
    }
  }, [errors]);
  
  // Handle file upload with progress tracking - memoized
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newFiles = Array.from(e.target.files);
    
    // Validate file sizes before processing
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    const oversizedFiles = newFiles.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      dispatch({ 
        type: 'SET_ERRORS', 
        errors: { 
          ...errors, 
          files: `Some files exceed the 50MB size limit: ${oversizedFiles.map(f => f.name).join(', ')}` 
        } 
      });
      return;
    }
    
    const isDeviceMobile = isMobile();
    
    if (isDeviceMobile) {
      // On mobile, create a dedicated file handler that works with the files directly
      // Create simple placeholder URLs for display only
      const displayUrls = newFiles.map(file => `placeholder-${file.name}`);
      dispatch({ type: 'ADD_FILES', newFiles, newUrls: displayUrls });
    } else {
      // Desktop flow - use object URLs
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      dispatch({ type: 'ADD_FILES', newFiles, newUrls });
    }
  }, [errors, isMobile]);
  
  // Remove file - memoized
  const removeFile = useCallback((index: number) => {
    // Only revoke URL if it's a real object URL (not a placeholder)
    if (fileUrls[index] && !fileUrls[index].startsWith('placeholder-')) {
      URL.revokeObjectURL(fileUrls[index]);
    }
    dispatch({ type: 'REMOVE_FILE', index });
  }, [fileUrls]);
  
  // Add link - memoized
  const addLink = useCallback(() => {
    if (linkInput.trim() && !links.includes(linkInput)) {
      dispatch({ type: 'ADD_LINK', link: linkInput });
    }
  }, [linkInput, links]);
  
  // Remove link - memoized
  const removeLink = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_LINK', index });
  }, []);
  
  // Toggle advanced section - memoized
  const toggleAdvanced = useCallback(() => {
    dispatch({ type: 'TOGGLE_ADVANCED' });
  }, []);
  
  // Get minimum date for date input
  const getMinDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);
  
  // Handle form submission - memoized
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing timeout
    if (submissionTimeoutRef.current) {
      clearTimeout(submissionTimeoutRef.current);
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Validate form
    if (!validate()) return;
    
    dispatch({ type: 'SET_SUBMITTING', isSubmitting: true });
    dispatch({ type: 'SET_UPLOAD_PROGRESS', progress: 0 });
    
    // Set submission timeout (45 seconds)
    submissionTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        console.error('[Error] Task submission timed out after 45 seconds');
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
        dispatch({ 
          type: 'SET_ERRORS', 
          errors: { 
            name: 'Submission timed out. Please try again with smaller files or check your connection.' 
          } 
        });
        abortControllerRef.current?.abort();
      }
    }, 45000);
    
    try {
      // Clone task details to avoid modifying state during preparation
      const taskDescription = taskDetails.description;
      let enhancedDescription = taskDescription;
      
      // Add links to description
      if (links.length > 0) {
        enhancedDescription += '\n\n**Links:**\n';
        links.forEach(link => {
          enhancedDescription += `- [${link}](${link})\n`;
        });
      }
      
      // Check if device is mobile
      const isDeviceMobile = isMobile();
      
      // Add file references
      if (files.length > 0) {
        enhancedDescription += '\n\n**Attachments:**\n';
        
        // For mobile devices, create direct attachment references
        if (isDeviceMobile) {
          // Filter valid files
          const validFiles = files.filter(file => 
            file.size > 0 && file.name && typeof file.name === 'string'
          );
          
          validFiles.forEach(file => {
            // Mobile - use attachment: protocol
            enhancedDescription += `- [${file.name}](attachment:${file.name})\n`;
          });
          
          // Add a special flag for mobile uploads
          enhancedDescription += '\n<!-- mobile-uploads -->\n';
        } else {
          // For desktop, create blob URLs
          files.forEach(file => {
            const fileUrl = URL.createObjectURL(file);
            enhancedDescription += `- [${file.name}](${fileUrl})\n`;
          });
        }
      }
      
      // Add notice for section tasks if this is a section admin
      if (isSectionAdmin && sectionId) {
        enhancedDescription += `\n\n*This task is assigned to section ID: ${sectionId}*`;
      }
      
      // Create final task object
      const finalTask: NewTask = {
        ...taskDetails,
        description: enhancedDescription,
        sectionId: sectionId,
      };
      
      // Handle mobile file uploads
      if (isDeviceMobile && files.length > 0) {
        // Validate files before sending
        const validFiles = files.filter(file => file.name && file.size > 0);
        
        // On mobile, attach the files with a custom property
        (finalTask as any)._mobileFiles = validFiles;
        
        // Add additional flag for section admin mobile uploads
        if (isSectionAdmin && sectionId) {
          (finalTask as any)._isSectionAdminMobile = true;
          (finalTask as any)._sectionId = sectionId;
        }
      }
      
      // Submit the task
      await onSubmit(finalTask);
      
      // Clear timeout on successful submission
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      // Reset form if component is still mounted
      if (isMounted.current) {
        dispatch({ type: 'RESET_FORM', sectionId });
        dispatch({ type: 'SET_SUCCESS', success: true });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          if (isMounted.current) {
            dispatch({ type: 'SET_SUCCESS', success: false });
          }
        }, 3000);
      }
    } catch (error) {
      console.error('[Error] Task creation failed:', error);
      
      // Clear timeout on error
      if (submissionTimeoutRef.current) {
        clearTimeout(submissionTimeoutRef.current);
      }
      
      // Show error to user if component is still mounted
      if (isMounted.current) {
        dispatch({ 
          type: 'SET_ERRORS', 
          errors: { 
            name: `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}` 
          } 
        });
        dispatch({ type: 'SET_SUBMITTING', isSubmitting: false });
        dispatch({ type: 'SET_UPLOAD_PROGRESS', progress: 0 });
      }
    }
  }, [validate, taskDetails, links, files, isMobile, isSectionAdmin, sectionId, onSubmit]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
          Create New Task
          {isSectionAdmin && sectionId && (
            <span className="ml-2 text-xs sm:text-sm text-green-600 dark:text-green-400 font-normal">
              (Section Task)
            </span>
          )}
        </h3>
        
        <button
          onClick={toggleAdvanced}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
          type="button"
          aria-expanded={showAdvanced}
          aria-controls="advanced-options"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Hide Advanced</span>
              <span className="sm:hidden">Simple</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Show Advanced</span>
              <span className="sm:hidden">Advanced</span>
            </>
          )}
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {success && (
          <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4 flex items-start gap-2" role="alert">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-300 text-sm">Task created successfully!</span>
          </div>
        )}

        {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-4" aria-live="polite">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Uploading files... {uploadProgress}%
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="col-span-1 sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                id="name"
                name="name"
                value={taskDetails.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2.5 border ${
                  errors.name ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base`}
                placeholder="Enter task name"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </div>
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <select
                id="category"
                name="category"
                value={taskDetails.category}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none text-sm sm:text-base"
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
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={taskDetails.dueDate}
                onChange={handleChange}
                min={getMinDate()}
                className={`w-full pl-10 pr-4 py-2.5 border ${
                  errors.dueDate ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base`}
                aria-required="true"
                aria-invalid={!!errors.dueDate}
                aria-describedby={errors.dueDate ? "dueDate-error" : undefined}
              />
            </div>
            {errors.dueDate && (
              <p id="dueDate-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.dueDate}
              </p>
            )}
          </div>

          {showAdvanced && (
            <div id="advanced-options">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <select
                  id="status"
                  name="status"
                  value={taskDetails.status}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none text-sm sm:text-base"
                >
                  <option value="my-tasks">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          <div className="col-span-1 sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                <AlignLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <textarea
                id="description"
                name="description"
                value={taskDetails.description}
                onChange={handleChange}
                rows={4}
                className={`w-full pl-10 pr-4 py-2 border ${
                  errors.description ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base`}
                placeholder="Enter task description"
                aria-required="true"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? "description-error" : undefined}
              ></textarea>
            </div>
            {errors.description && (
              <p id="description-error" className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
          </div>

          {showAdvanced && (
            <>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Links
                </label>
                <div className="flex">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                      <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => dispatch({ type: 'SET_LINK_INPUT', value: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                      placeholder="Enter URL"
                      aria-label="Enter URL"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addLink}
                    disabled={!linkInput.trim()}
                    className="px-3 py-2.5 bg-blue-600 text-white rounded-r-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Add link"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="sr-only">Add link</span>
                  </button>
                </div>

                {links.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {links.map((link, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between py-1 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 text-sm truncate max-w-[85%]"
                        >
                          {link}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2"
                          aria-label={`Remove link to ${link}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments
                </label>
                <div className="flex items-center justify-center w-full">
                  <label 
                    htmlFor="file-upload" 
                    className="w-full flex flex-col items-center justify-center px-4 py-4 bg-white dark:bg-gray-800 text-gray-500 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    aria-label="Upload files - tap to select files"
                  >
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <p className="mt-1 text-sm text-center">
                      {isMobile() ? 
                        'Tap to select files' : 
                        'Drag & drop files here, or click to select files'}
                    </p>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      multiple 
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      aria-label="File upload"
                    />
                  </label>
                </div>

                {errors.files && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.files}
                  </p>
                )}

                {fileUrls.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[85%]">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-4 sm:mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm text-sm sm:text-base font-medium ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}