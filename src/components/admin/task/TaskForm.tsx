import { useState, useEffect } from 'react';
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

export function TaskForm({ onSubmit, sectionId, isSectionAdmin = false }: TaskFormProps) {
  const [taskDetails, setTaskDetails] = useState<NewTask>({
    name: '',
    category: 'task',
    dueDate: '',
    description: '',
    status: 'in-progress',
    sectionId: sectionId || undefined
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof NewTask, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Debug logging on mount
  useEffect(() => {
    console.log('[Debug] TaskForm mounted with props:', {
      isSectionAdmin,
      sectionId,
    });
    
    // Check for form elements in DOM
    setTimeout(() => {
      const nameInput = document.getElementById('name');
      const dueDateInput = document.getElementById('dueDate');
      console.log('[Debug] TaskForm DOM elements present:', {
        nameInput: !!nameInput,
        dueDateInput: !!dueDateInput
      });
    }, 500);
  }, [isSectionAdmin, sectionId]);
  
  // Validation function
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof NewTask, string>> = {};
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
    
    console.log('[Debug] Form validation result:', { isValid, errors: newErrors });
    setErrors(newErrors);
    return isValid;
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskDetails(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user types
    if (errors[name as keyof NewTask]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Create temporary URLs for display
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setFileUrls(prev => [...prev, ...newUrls]);
    }
  };
  
  // Remove file
  const removeFile = (index: number) => {
    URL.revokeObjectURL(fileUrls[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileUrls(prev => prev.filter((_, i) => i !== index));
  };
  
  // Add link
  const addLink = () => {
    if (linkInput.trim() && !links.includes(linkInput)) {
      setLinks(prev => [...prev, linkInput]);
      setLinkInput('');
    }
  };
  
  // Remove link
  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real app, you would upload files to a server here
      // For now, we'll just add the links to the description
      let enhancedDescription = taskDetails.description;
      
      // Add links to description
      if (links.length > 0) {
        enhancedDescription += '\n\n**Links:**\n';
        links.forEach(link => {
          enhancedDescription += `- [${link}](${link})\n`;
        });
      }
      
      // Add file references (in a real app, these would be uploaded and proper URLs would be used)
      if (files.length > 0) {
        enhancedDescription += '\n\n**Attachments:**\n';
        files.forEach(file => {
          enhancedDescription += `- [${file.name}](attachment:${file.name})\n`;
        });
      }
      
      // Add notice for section tasks if this is a section admin
      if (isSectionAdmin && sectionId) {
        enhancedDescription += `\n\n*This task is assigned to section ID: ${sectionId}*`;
      }
      
      const finalTask: NewTask = {
        ...taskDetails,
        description: enhancedDescription,
        sectionId: sectionId,
      };
      
      onSubmit(finalTask);
      
      // Reset form
      setTaskDetails({
        name: '',
        category: 'task',
        dueDate: '',
        description: '',
        status: 'in-progress',
        sectionId: sectionId || undefined
      });
      setFiles([]);
      setFileUrls([]);
      setLinks([]);
      setErrors({});
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

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
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
          type="button"
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
          <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-green-700 dark:text-green-300 text-sm">Task created successfully!</span>
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
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
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
              />
            </div>
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.dueDate}
              </p>
            )}
          </div>

          {showAdvanced && (
            <>
              <div>
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
            </>
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
              ></textarea>
            </div>
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
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
                      onChange={(e) => setLinkInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm sm:text-base"
                      placeholder="Enter URL"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addLink}
                    disabled={!linkInput.trim()}
                    className="px-3 py-2.5 bg-blue-600 text-white rounded-r-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="sr-only">Add link</span>
                  </button>
                </div>

                {links.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {links.map((link, index) => (
                      <div key={index} className="flex items-center justify-between py-1 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                  >
                    <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    <p className="mt-1 text-sm text-center">Drag & drop files here, or click to select files</p>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} multiple />
                  </label>
                </div>

                {fileUrls.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 truncate max-w-[85%]">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2"
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
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
