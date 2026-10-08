import React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export const toast = sonnerToast;

export const showSuccess = (message: string, description?: string) => {
  sonnerToast.success(message, { description });
};

export const showError = (message: string, description?: string) => {
  sonnerToast.error(message, { description });
};

export const showInfo = (message: string, description?: string) => {
  sonnerToast.info(message, { description });
};

export const showWarning = (message: string, description?: string) => {
  sonnerToast.warning(message, { description });
};

export const AppToaster: React.FC = () => {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className:
          '!rounded-2xl !border-stone-200 dark:!border-stone-800 !bg-white dark:!bg-stone-900 !text-stone-900 dark:!text-stone-100 !shadow-xl font-sans',
      }}
    />
  );
};
