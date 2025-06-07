import React from 'react';
import { Calendar } from 'lucide-react';

export function RoutinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Calendar className="w-24 h-24 text-blue-500 dark:text-blue-400 mb-8" />
      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
        Coming Soon!
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 text-center px-4">
        We are working hard to bring you this feature. Please check back later.
      </p>
    </div>
  );
}