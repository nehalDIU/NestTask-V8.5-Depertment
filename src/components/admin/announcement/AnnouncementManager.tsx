import { AnnouncementForm } from './AnnouncementForm';
import { AnnouncementList } from './AnnouncementList';
import type { Announcement, NewAnnouncement } from '../../../types/announcement';

interface AnnouncementManagerProps {
  announcements: Announcement[];
  onCreateAnnouncement: (announcement: NewAnnouncement) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  sectionId?: string;
  isSectionAdmin?: boolean;
  isLoading?: boolean;
}

export function AnnouncementManager({
  announcements,
  onCreateAnnouncement,
  onDeleteAnnouncement,
  sectionId,
  isSectionAdmin = false,
  isLoading = false
}: AnnouncementManagerProps) {
  return (
    <div>
      <AnnouncementForm 
        onSubmit={onCreateAnnouncement} 
        sectionId={sectionId}
        isSectionAdmin={isSectionAdmin}
      />
      <AnnouncementList 
        announcements={announcements}
        onDelete={onDeleteAnnouncement}
        isLoading={isLoading}
      />
    </div>
  );
}