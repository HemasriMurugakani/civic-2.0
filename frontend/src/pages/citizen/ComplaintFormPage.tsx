import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ComplaintFormPage
 * Canonical routing now delegates to /report (NammaNagar 20-category report page)
 * to maintain complete UI consistency and prevent duplicate overlapping forms.
 */
export const ComplaintFormPage: React.FC = () => {
  return <Navigate to="/report" replace />;
};

export default ComplaintFormPage;
