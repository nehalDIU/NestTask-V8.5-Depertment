import { 
  FileText, 
  Download, 
  Link, 
  Video, 
  Calendar, 
  User,
  Eye,
  ChevronRight
} from 'lucide-react';
import type { LectureSlide } from '../../types/lectureSlide';
import { getFileIcon } from '../../types/lectureSlide';
import { getFileDownloadUrl } from '../../services/lectureSlide.service';

interface LectureSlidesCardProps {
  lectureSlide: LectureSlide;
  onClick: () => void;
}

export function LectureSlidesCard({ lectureSlide, onClick }: LectureSlidesCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalItems = () => {
    return lectureSlide.fileUrls.length + 
           lectureSlide.slideLinks.length + 
           lectureSlide.videoLinks.length;
  };

  const handleQuickDownload = (e: React.MouseEvent, fileUrl: string, fileName: string) => {
    e.stopPropagation();
    const downloadUrl = getFileDownloadUrl(fileUrl, fileName);
    window.open(downloadUrl, '_blank');
  };

  const handleQuickLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {lectureSlide.title}
              </h3>
              {lectureSlide.section && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {lectureSlide.section.name}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
        </div>

        {/* Description */}
        {lectureSlide.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
            {lectureSlide.description}
          </p>
        )}

        {/* Quick Actions */}
        <div className="space-y-3 mb-4">
          {/* Files Preview */}
          {lectureSlide.fileUrls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Files ({lectureSlide.fileUrls.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {lectureSlide.fileUrls.slice(0, 2).map((fileUrl, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">
                        {getFileIcon(lectureSlide.originalFileNames[index] || '')}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {lectureSlide.originalFileNames[index] || `File ${index + 1}`}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleQuickDownload(e, fileUrl, lectureSlide.originalFileNames[index] || `file_${index + 1}`)}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {lectureSlide.fileUrls.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                    +{lectureSlide.fileUrls.length - 2} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Links Preview */}
          {lectureSlide.slideLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Links ({lectureSlide.slideLinks.length})
                </span>
              </div>
              <div className="space-y-1">
                {lectureSlide.slideLinks.slice(0, 2).map((link, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleQuickLink(e, link)}
                    className="w-full flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                      {link}
                    </span>
                  </button>
                ))}
                {lectureSlide.slideLinks.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                    +{lectureSlide.slideLinks.length - 2} more links
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Videos Preview */}
          {lectureSlide.videoLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Videos ({lectureSlide.videoLinks.length})
                </span>
              </div>
              <div className="space-y-1">
                {lectureSlide.videoLinks.slice(0, 2).map((link, index) => (
                  <button
                    key={index}
                    onClick={(e) => handleQuickLink(e, link)}
                    className="w-full flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Video className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-600 dark:text-red-400 truncate">
                      {link}
                    </span>
                  </button>
                ))}
                {lectureSlide.videoLinks.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                    +{lectureSlide.videoLinks.length - 2} more videos
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(lectureSlide.createdAt)}
            </div>
            {lectureSlide.creator && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {lectureSlide.creator.name}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getTotalItems() > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                {getTotalItems()} items
              </span>
            )}
            <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
