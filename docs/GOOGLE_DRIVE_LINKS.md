# Google Drive Links Feature

## Overview

The Google Drive Links feature allows section administrators to attach Google Drive resources (documents, spreadsheets, presentations, forms, folders, and files) to tasks. This enhances the task management system by providing easy access to shared educational resources.

## Features

### ✅ **Supported Google Drive Resources**
- **Google Docs** - Documents and text files
- **Google Sheets** - Spreadsheets and data files  
- **Google Slides** - Presentations
- **Google Forms** - Surveys and quizzes
- **Google Drive Files** - Any file stored in Google Drive
- **Google Drive Folders** - Shared folders

### ✅ **Access Control**
- **Section Administrators Only** - Only users with `section_admin` role can attach Google Drive links
- **Viewing Access** - All users can view and access attached Google Drive links
- **Proper Attribution** - Links are clearly marked as added by section administrators

### ✅ **User Experience**
- **Real-time Validation** - URLs are validated as you type
- **Resource Type Detection** - Automatically identifies the type of Google Drive resource
- **Link Previews** - Shows resource type and truncated URL
- **Multiple Links** - Support for multiple Google Drive links per task
- **Mobile Responsive** - Touch-friendly interface for mobile devices

## Usage Instructions

### For Section Administrators

#### Adding Google Drive Links to Tasks

1. **Create or Edit a Task**
   - Navigate to the task creation form or edit an existing task
   - Scroll to the "Google Drive Links" section (only visible to section admins)

2. **Add a Google Drive Link**
   - Paste any valid Google Drive URL into the input field
   - The system will automatically validate the URL
   - Click the "+" button or press Enter to add the link
   - The link will appear below with its resource type

3. **Manage Links**
   - Click the external link icon to preview the resource
   - Click the "X" button to remove a link
   - Add multiple links to a single task as needed

#### Supported URL Formats

```
# File sharing links
https://drive.google.com/file/d/FILE_ID/view?usp=sharing

# Direct file links  
https://drive.google.com/file/d/FILE_ID

# Google Docs
https://docs.google.com/document/d/DOC_ID/edit

# Google Sheets
https://docs.google.com/spreadsheets/d/SHEET_ID/edit

# Google Slides
https://docs.google.com/presentation/d/PRES_ID/edit

# Google Forms
https://docs.google.com/forms/d/FORM_ID/edit

# Google Drive Folders
https://drive.google.com/drive/folders/FOLDER_ID
```

### For All Users

#### Viewing Google Drive Links

1. **Task Details**
   - Click on any task to view its details
   - Google Drive links appear in a dedicated section
   - Each link shows the resource type (Google Doc, Sheet, etc.)

2. **Accessing Resources**
   - Click the external link icon to open the Google Drive resource
   - Resources open in a new tab/window
   - Links maintain their original sharing permissions

## Technical Implementation

### Database Schema

```sql
-- Google Drive links are stored as a TEXT array
ALTER TABLE tasks ADD COLUMN google_drive_links TEXT[] DEFAULT '{}';

-- Index for efficient querying
CREATE INDEX tasks_google_drive_links_idx ON tasks USING GIN(google_drive_links);
```

### Validation

The system validates Google Drive URLs using comprehensive regex patterns:

- **File URLs** - Standard Google Drive file sharing links
- **Document URLs** - Google Docs, Sheets, Slides, Forms
- **Folder URLs** - Google Drive folder sharing links
- **Legacy URLs** - Older Google Drive URL formats

### Security

- **Access Control** - Only section administrators can add/edit Google Drive links
- **URL Validation** - Prevents injection of malicious URLs
- **Proper Escaping** - All URLs are properly escaped and sanitized
- **Permission Inheritance** - Links inherit the task's existing access permissions

## API Integration

### Task Creation with Google Drive Links

```typescript
const newTask: NewTask = {
  name: "Assignment 1",
  description: "Complete the reading assignment",
  dueDate: "2024-01-15",
  category: "assignment",
  status: "in-progress",
  googleDriveLinks: [
    "https://docs.google.com/document/d/123/edit",
    "https://drive.google.com/file/d/456/view"
  ]
};
```

### Task Update with Google Drive Links

```typescript
const updates: Partial<Task> = {
  googleDriveLinks: [
    "https://docs.google.com/spreadsheet/d/789/edit"
  ]
};
```

## Troubleshooting

### Common Issues

1. **"Invalid Google Drive URL" Error**
   - Ensure the URL is a valid Google Drive link
   - Check that the URL is publicly accessible or shared appropriately
   - Try copying the URL directly from Google Drive

2. **Links Not Visible**
   - Verify you have section administrator privileges
   - Check that you're in the correct section
   - Refresh the page and try again

3. **Cannot Access Linked Resource**
   - Verify the Google Drive resource has proper sharing permissions
   - Check if the resource has been moved or deleted
   - Ensure you're logged into the correct Google account

### Support

For technical issues or feature requests related to Google Drive links:

1. Check the browser console for error messages
2. Verify your user role and permissions
3. Test with a simple Google Drive document link first
4. Contact your system administrator if issues persist

## Future Enhancements

Potential improvements for future versions:

- **Link Validation** - Server-side validation of Google Drive link accessibility
- **Thumbnail Previews** - Show thumbnails for Google Drive files
- **Bulk Import** - Import multiple links from a Google Drive folder
- **Permission Sync** - Automatically sync Google Drive permissions with task permissions
- **Usage Analytics** - Track which Google Drive resources are most accessed
