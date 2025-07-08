import { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, Car as IdCard, Loader2, BookOpen, Users, Layers } from 'lucide-react';
import { AuthError } from './AuthError';
import { AuthInput } from './AuthInput';
import { AuthSubmitButton } from './AuthSubmitButton';
import { validateEmail, validatePassword, validatePhone, validateStudentId } from '../../utils/authErrors';
import { getDepartments, getBatchesByDepartment, getSectionsByBatch } from '../../services/department.service';
import type { SignupCredentials, Department, Batch, Section } from '../../types/auth';

interface SignupFormProps {
  onSubmit: (credentials: SignupCredentials) => Promise<void>;
  onSwitchToLogin: () => void;
  error?: string;
}

// Select dropdown component for reusability
interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  icon: React.ComponentType<any>;
  error?: string;
  disabled?: boolean;
}

function SelectInput({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  icon: Icon, 
  error, 
  disabled 
}: SelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`block w-full pl-10 pr-3 py-2 rounded-lg border ${
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          } shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-500`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error ?? ''}</p>}
    </div>
  );
}

export function SignupForm({ onSubmit, onSwitchToLogin, error }: SignupFormProps) {
  const [credentials, setCredentials] = useState<SignupCredentials>({
    name: '',
    email: '',
    password: '',
    phone: '',
    studentId: '',
    departmentId: '',
    batchId: '',
    sectionId: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    phone: false,
    studentId: false,
    departmentId: false,
    batchId: false,
    sectionId: false
  });
  
  // State for departments, batches, and sections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Fetch departments on component mount
  useEffect(() => {
    async function fetchDepartments() {
      setIsLoadingDepartments(true);
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (error) {
        console.error('Error loading departments:', error);
        setLocalError('Failed to load departments. Please try again.');
      } finally {
        setIsLoadingDepartments(false);
      }
    }
    
    fetchDepartments();
  }, []);
  
  // Fetch batches when department changes
  useEffect(() => {
    if (!credentials.departmentId) {
      setBatches([]);
      return;
    }
    
    async function fetchBatches() {
      setIsLoadingBatches(true);
      try {
        const batchList = await getBatchesByDepartment(credentials.departmentId || '');
        setBatches(batchList);
      } catch (error) {
        console.error('Error loading batches:', error);
        setLocalError('Failed to load batches. Please try again.');
      } finally {
        setIsLoadingBatches(false);
      }
    }
    
    fetchBatches();
    
    // Reset dependent fields
    setCredentials(prev => ({ ...prev, batchId: '', sectionId: '' }));
    setSections([]);
  }, [credentials.departmentId]);
  
  // Fetch sections when batch changes
  useEffect(() => {
    if (!credentials.batchId) {
      setSections([]);
      return;
    }
    
    async function fetchSections() {
      setIsLoadingSections(true);
      try {
        const sectionList = await getSectionsByBatch(credentials.batchId || '');
        setSections(sectionList);
      } catch (error) {
        console.error('Error loading sections:', error);
        setLocalError('Failed to load sections. Please try again.');
      } finally {
        setIsLoadingSections(false);
      }
    }
    
    fetchSections();
    
    // Reset dependent field
    setCredentials(prev => ({ ...prev, sectionId: '' }));
  }, [credentials.batchId]);

  const validateForm = () => {
    if (!credentials.name.trim()) {
      setLocalError('Name is required');
      return false;
    }
    if (!validateEmail(credentials.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!validatePassword(credentials.password)) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }
    if (!validatePhone(credentials.phone)) {
      setLocalError('Please enter a valid phone number');
      return false;
    }
    if (!validateStudentId(credentials.studentId)) {
      setLocalError('Please enter a valid student ID');
      return false;
    }
    if (!credentials.departmentId) {
      setLocalError('Please select your department');
      return false;
    }
    if (!credentials.batchId) {
      setLocalError('Please select your batch');
      return false;
    }
    if (!credentials.sectionId) {
      setLocalError('Please select your section');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSubmit(credentials);
    } catch (err: any) {
      setLocalError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof SignupCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    setLocalError(null);
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl backdrop-blur-lg border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Create Account
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Join our community and start managing your tasks
        </p>
      </div>
      
      {(error || localError) && <AuthError message={error || localError || ''} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          type="text"
          value={credentials.name}
          onChange={(value) => handleInputChange('name', value)}
          label="Full Name"
          placeholder="Enter your full name"
          icon={User}
          error={touched.name && !credentials.name.trim() ? 'Name is required' : ''}
        />

        <AuthInput
          type="email"
          value={credentials.email}
          onChange={(value) => handleInputChange('email', value)}
          label="Email"
          placeholder="Enter your email"
          icon={Mail}
          error={touched.email && !validateEmail(credentials.email) ? 'Please enter a valid email' : ''}
        />

        <AuthInput
          type="text"
          value={credentials.phone}
          onChange={(value) => handleInputChange('phone', value)}
          label="Phone Number"
          placeholder="Enter your phone number"
          icon={Phone}
          error={touched.phone && !validatePhone(credentials.phone) ? 'Please enter a valid phone number' : ''}
        />

        <AuthInput
          type="text"
          value={credentials.studentId}
          onChange={(value) => handleInputChange('studentId', value)}
          label="Student ID"
          placeholder="Enter your student ID"
          icon={IdCard}
          error={touched.studentId && !validateStudentId(credentials.studentId) ? 'Please enter a valid student ID' : ''}
        />
        
        <SelectInput
          label="Department"
          value={credentials.departmentId ?? ''}
          onChange={(value) => handleInputChange('departmentId', value)}
          options={departments}
          placeholder={isLoadingDepartments ? "Loading departments..." : "Select your department"}
          icon={BookOpen}
          disabled={isLoadingDepartments}
          error={touched.departmentId && !credentials.departmentId ? 'Please select your department' : ''}
        />
        
        <SelectInput
          label="Batch"
          value={credentials.batchId ?? ''}
          onChange={(value) => handleInputChange('batchId', value)}
          options={batches}
          placeholder={
            !credentials.departmentId 
              ? "Select department first" 
              : isLoadingBatches 
                ? "Loading batches..." 
                : "Select your batch"
          }
          icon={Layers}
          disabled={!credentials.departmentId || isLoadingBatches}
          error={touched.batchId && !credentials.batchId && credentials.departmentId ? 'Please select your batch' : ''}
        />
        
        <SelectInput
          label="Section"
          value={credentials.sectionId ?? ''}
          onChange={(value) => handleInputChange('sectionId', value)}
          options={sections}
          placeholder={
            !credentials.batchId 
              ? "Select batch first" 
              : isLoadingSections 
                ? "Loading sections..." 
                : "Select your section"
          }
          icon={Users}
          disabled={!credentials.batchId || isLoadingSections}
          error={touched.sectionId && !credentials.sectionId && credentials.batchId ? 'Please select your section' : ''}
        />

        <AuthInput
          type="password"
          value={credentials.password}
          onChange={(value) => handleInputChange('password', value)}
          label="Password"
          placeholder="Choose a password"
          icon={Lock}
          error={touched.password && !validatePassword(credentials.password) ? 'Password must be at least 6 characters' : ''}
        />

        <AuthSubmitButton 
          label={isLoading ? 'Creating account...' : 'Create account'} 
          isLoading={isLoading}
          icon={isLoading ? Loader2 : undefined}
        />
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}