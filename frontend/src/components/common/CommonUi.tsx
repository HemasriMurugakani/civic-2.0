import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, UploadCloud, X, Check, Globe, Moon, Sun, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { NotificationItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';

// Re-export core primitives from @/components/ui
export { PageHeader, type PageHeaderProps } from '@/components/ui/PageHeader';
export { EmptyState, type EmptyStateProps } from '@/components/ui/EmptyState';

// 3. StarRating
export const StarRating: React.FC<{
  rating: number;
  max?: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ rating, max = 5, interactive = false, onChange, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }[size];

  return (
    <div className="flex items-center gap-1 font-sans">
      {Array.from({ length: max }).map((_, i) => {
        const starVal = i + 1;
        const isFilled = (hoverRating !== null ? hoverRating : rating) >= starVal;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange && onChange(starVal)}
            onMouseEnter={() => interactive && setHoverRating(starVal)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            className={`transition-transform min-h-[36px] min-w-[36px] flex items-center justify-center ${
              interactive ? 'hover:scale-110 cursor-pointer focus:outline-none' : 'cursor-default'
            }`}
            aria-label={`Rate ${starVal} out of ${max} stars`}
          >
            <Star
              className={`${starSizes} ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-stone-300 dark:text-stone-700'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};

// 4. FileDropzone
export const FileDropzone: React.FC<{
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  accept?: string;
}> = ({ onFileSelect, selectedFile, onClear, accept = 'image/*' }) => {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full font-sans">
      {selectedFile && previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate max-w-xs">
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <img
            src={previewUrl}
            alt="Preview"
            className="h-48 w-full object-cover rounded-xl border border-stone-200 dark:border-stone-800"
          />
        </div>
      ) : (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 p-6 text-center hover:border-[#800000] dark:hover:border-rose-500 cursor-pointer transition-colors bg-white dark:bg-stone-900/60 min-h-[140px]"
        >
          <UploadCloud className="h-9 w-9 text-stone-400 mb-2" />
          <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
            {t('form.dropzoneText', 'Drop grievance photos here or click to browse')}
          </span>
          <span className="mt-1 text-xs text-stone-400">
            {t('form.dropzoneHint', 'PNG, JPG, WEBP up to 10MB')}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={(e) => e.target.files && e.target.files[0] && onFileSelect(e.target.files[0])}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};

// 5. LanguageToggle
export const LanguageToggle: React.FC<{ variant?: 'pill' | 'default' }> = ({ variant = 'pill' }) => {
  const { language, changeLanguage } = useAuth();

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={() => changeLanguage(language === 'en' ? 'ta' : 'en')}
        className="flex items-center gap-1.5 rounded-full border border-stone-300 dark:border-stone-700 bg-white/90 dark:bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-[#800000] dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 transition shadow-2xs font-tamil min-h-[36px]"
        title="Switch Language / மொழி மாற்றம்"
      >
        <span>🇮🇳</span>
        <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => changeLanguage(language === 'en' ? 'ta' : 'en')}
      className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition min-h-[40px]"
      title="Switch Language / மொழி மாற்றம்"
    >
      <Globe className="h-4 w-4 text-[#800000] dark:text-rose-400" />
      <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
    </button>
  );
};

// 6. ThemeToggle
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useAuth();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white/90 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition shadow-2xs min-h-[36px] min-w-[36px]"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-stone-700" />
      )}
    </button>
  );
};

// 7. NotificationBell
export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  React.useEffect(() => {
    if (!user) return;
    api.getUnreadNotificationCount()
      .then((res) => setUnreadCount(res.unread_count))
      .catch(() => {});
  }, [user]);

  const toggleDropdown = async () => {
    if (!isOpen) {
      try {
        const list = await api.getNotifications(false);
        setNotifications(list.slice(0, 10));
      } catch {}
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <div className="relative font-sans">
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition min-h-[36px] min-w-[36px]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 px-4 py-3">
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#800000] hover:underline dark:text-rose-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-xs text-stone-500">No new notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800/40 ${
                    !n.is_read ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{n.title}</p>
                  <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-300 line-clamp-2">
                    {n.message}
                  </p>
                  <span className="mt-1 block text-[10px] text-stone-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 8. Stepper
export const Stepper: React.FC<{
  steps: string[];
  currentStep: number;
}> = ({ steps, currentStep }) => (
  <div className="w-full py-4 font-sans">
    <div className="flex items-center justify-between">
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isComplete = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all min-h-[36px] min-w-[36px] ${
                  isComplete
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-[#800000] text-white ring-4 ring-rose-100 dark:ring-rose-950'
                    : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center hidden sm:block ${
                  isCurrent
                    ? 'text-[#800000] dark:text-rose-300 font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 transition-colors ${
                  isComplete ? 'bg-emerald-600' : 'bg-stone-200 dark:bg-stone-800'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);
