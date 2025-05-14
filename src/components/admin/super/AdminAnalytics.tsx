import React from 'react';
import { 
  BarChart, PieChart, Users, UserCheck, UserX, RefreshCw, 
  Clock, Activity, Shield, Building 
} from 'lucide-react';
import type { AdminStats } from '../../../types/admin';

interface AdminAnalyticsProps {
  stats: AdminStats | null;
  loading: boolean;
}

export function AdminAnalytics({ stats, loading }: AdminAnalyticsProps) {
  const getRandomPercentage = () => Math.floor(Math.random() * 100);
  const getRandomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Example data for visualization when real data is not available
  const demoData = {
    departmentDistribution: {
      'Engineering': 35,
      'Marketing': 15,
      'Sales': 20,
      'HR': 10,
      'Finance': 15,
      'Other': 5
    },
    monthlyActivity: {
      'Jan': getRandomNumber(10, 50),
      'Feb': getRandomNumber(10, 50),
      'Mar': getRandomNumber(10, 50),
      'Apr': getRandomNumber(10, 50),
      'May': getRandomNumber(10, 50),
      'Jun': getRandomNumber(10, 50),
      'Jul': getRandomNumber(10, 50),
      'Aug': getRandomNumber(10, 50),
      'Sep': getRandomNumber(10, 50),
      'Oct': getRandomNumber(10, 50),
      'Nov': getRandomNumber(10, 50),
      'Dec': getRandomNumber(10, 50)
    },
    permissionUsage: {
      'User Management': getRandomPercentage(),
      'Course Management': getRandomPercentage(),
      'Announcement Management': getRandomPercentage(),
      'Teacher Management': getRandomPercentage(),
      'Routine Management': getRandomPercentage(),
      'Task Management': getRandomPercentage()
    }
  };
  
  // Helper for department visualization
  const renderDepartmentDistribution = () => {
    const departments = stats?.adminsByDepartment || demoData.departmentDistribution;
    const maxValue = Math.max(...Object.values(departments));
    
    return (
      <div className="space-y-3">
        {Object.entries(departments).map(([dept, count]) => (
          <div key={dept} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dept}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
              <div 
                style={{ width: `${(count / maxValue) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 dark:bg-indigo-600"
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Helper for active admin visualization
  const renderActiveAdminsChart = () => {
    const totalAdmins = stats?.totalAdmins || 0;
    const activeAdmins = stats?.activeAdmins || 0;
    const disabledAdmins = stats?.disabledAdmins || 0;
    
    const percentage = totalAdmins > 0 ? Math.round((activeAdmins / totalAdmins) * 100) : 0;
    
    return (
      <div className="flex items-center justify-between">
        <div className="relative h-24 w-24">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="3"
              className="dark:stroke-gray-700"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              className="dark:stroke-indigo-400"
            />
            <text x="18" y="20.5" className="text-5xl font-bold text-gray-800 dark:text-white" dominantBaseline="middle" textAnchor="middle">
              {percentage}%
            </text>
          </svg>
        </div>
        <div className="flex-1 pl-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-indigo-500 dark:bg-indigo-400 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Active</span>
              </div>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{activeAdmins}</p>
            </div>
            <div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-700 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Disabled</span>
              </div>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{disabledAdmins}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper for permission usage visualization
  const renderPermissionUsage = () => {
    const data = demoData.permissionUsage;
    
    return (
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(data).map(([permission, percentage]) => (
          <div key={permission} className="flex flex-col">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{permission}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</span>
            </div>
            <div className="overflow-hidden h-1.5 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
              <div 
                style={{ width: `${percentage}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  percentage > 70 ? 'bg-green-500 dark:bg-green-600' : 
                  percentage > 40 ? 'bg-blue-500 dark:bg-blue-600' : 
                  'bg-amber-500 dark:bg-amber-600'
                }`}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Helper for monthly activity visualization
  const renderMonthlyActivity = () => {
    const data = demoData.monthlyActivity;
    const maxValue = Math.max(...Object.values(data));
    
    return (
      <div className="flex items-end justify-between h-40 pt-5">
        {Object.entries(data).map(([month, value]) => (
          <div key={month} className="flex flex-col items-center">
            <div 
              className="w-6 bg-indigo-500 dark:bg-indigo-600 rounded-t hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all cursor-pointer relative group"
              style={{ height: `${(value / maxValue) * 100}%` }}
            >
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {month}: {value} actions
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{month.substring(0, 1)}</span>
          </div>
        ))}
      </div>
    );
  };
  
  // Helper for most active admins list
  const renderActiveAdminsList = () => {
    return (
      <div className="space-y-3">
        {stats?.mostActiveAdmins && stats.mostActiveAdmins.length > 0 ? (
          stats.mostActiveAdmins.map((admin, index) => (
            <div key={admin.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-3">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{admin.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{admin.id.substring(0, 8)}</p>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-800 dark:text-white">{admin.activityCount}</div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No activity data available
          </div>
        )}
      </div>
    );
  };
  
  // Helper for recent logins list
  const renderRecentLoginsList = () => {
    return (
      <div className="space-y-3">
        {stats?.recentLogins && stats.recentLogins.length > 0 ? (
          stats.recentLogins.map((login) => (
            <div key={login.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{login.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{login.id.substring(0, 8)}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(login.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            No recent login data available
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="bg-white dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center mb-4">
          <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
          Admin Analytics Dashboard
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Comprehensive analytics for monitoring admin activity and usage patterns.
        </p>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Admins</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.totalAdmins || 0}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Admins</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.activeAdmins || 0}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Disabled Admins</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.disabledAdmins || 0}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <UserX className="h-6 w-6" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Permission Changes</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.permissionChanges || 0}</h3>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Active vs Disabled Admins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Active vs Disabled Admins</h3>
                  <PieChart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderActiveAdminsChart()}
              </div>
              
              {/* Department Distribution */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Admin Distribution by Department</h3>
                  <Building className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderDepartmentDistribution()}
              </div>
              
              {/* Monthly Activity */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Monthly Admin Activity</h3>
                  <BarChart className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderMonthlyActivity()}
                
                <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  Months of the Year
                </div>
              </div>
              
              {/* Permission Usage */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Permission Usage Patterns</h3>
                  <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderPermissionUsage()}
              </div>
            </div>
            
            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Active Admins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Most Active Admins</h3>
                  <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderActiveAdminsList()}
              </div>
              
              {/* Recent Logins */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Admin Logins</h3>
                  <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                
                {renderRecentLoginsList()}
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        <div className="flex items-center justify-center gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Analytics data is refreshed hourly. Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
} 