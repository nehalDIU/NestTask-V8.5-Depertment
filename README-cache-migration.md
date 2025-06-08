# Offline Storage Removal Documentation

## Overview
This document outlines the changes made to remove offline storage functionality from the application and replace it with a simpler in-memory caching system. The goal was to simplify the application and improve performance by removing the dependency on IndexedDB.

## Changes Made

### New Files Created
1. **src/utils/cache.ts** - Simple in-memory caching utility
2. **src/hooks/useData.ts** - Replacement for useOfflineData using memory cache
3. **src/hooks/useOperations.ts** - Replacement for useOfflineOperations without offline functionality
4. **src/hooks/useCourseData.ts** - Replacement for useCourses without offline storage
5. **src/scripts/remove-offline-storage.js** - Migration script to help transition

### Files Updated
1. **src/utils/prefetch.ts** - Updated to use the new cache system
2. **src/pages/AdminDashboard.tsx** - Updated imports to use new hooks

## Migration Steps
To complete the migration from offline storage to memory cache:

1. First run the migration script to safely migrate any existing data:
```html
<script src="scripts/remove-offline-storage.js"></script>
```

2. Replace import statements in your components from:
```javascript
import { useOfflineData } from '../hooks/useOfflineData';
```
to:
```javascript
import { useData } from '../hooks/useData';
```

3. Replace import statements from:
```javascript
import { useOfflineOperations } from '../hooks/useOfflineOperations';
```
to:
```javascript
import { useOperations } from '../hooks/useOperations';
```

4. Replace import statements from:
```javascript
import { useCourses } from '../hooks/useCourses';
```
to:
```javascript
import { useCourseData } from '../hooks/useCourseData';
```

5. Update function calls from:
```javascript
const { data, loading, error } = useOfflineData('storeName', onlineData, fetcher);
```
to:
```javascript
const { data, loading, error, refreshData } = useData('cacheKey', fetcher, dependencies);
```

6. Update operations from:
```javascript
const { saveOperation, syncOperations } = useOfflineOperations({ entityType: 'task', userId });
```
to:
```javascript
const { performOperation, loading, error } = useOperations();
```

## Files to Remove
Once the migration is complete, the following files can be safely removed:
1. src/utils/offlineStorage.ts
2. src/hooks/useOfflineData.ts
3. src/hooks/useOfflineOperations.ts
4. src/hooks/useCourses.ts (replaced by useCourseData.ts)

## Benefits
- Simpler application architecture
- Faster initial loading times
- No dependency on IndexedDB
- Reduced memory usage
- Improved application performance
- Easier maintenance

## Notes
- Memory cache is not persistent across browser sessions
- Cache expiration is set to 10 minutes by default
- The cache is automatically cleared when the user logs out or the browser tab is closed 