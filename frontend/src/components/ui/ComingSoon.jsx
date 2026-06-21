
/**
 * WHY this component exists:
 *   Many sidebar items (Analytics, Leads, etc.) won't be built until Phase 5-7.
 *   Instead of 404 errors when users click them, we show a friendly "coming soon" page.
 *   This component is reused for all placeholder pages.
 *
 * Props:
 *   title   - the page name (e.g., "Analytics")
 *   phase   - which phase this feature is planned for (e.g., "Phase 7")
 *   icon    - a Lucide icon component
 *   description - what this feature will do
 */

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ComingSoon({ title, phase, icon: Icon, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-brand-500" />
        </div>
      )}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-3">{description}</p>
      {phase && (
        <span className="inline-block bg-brand-100 text-brand-700 text-xs font-medium px-3 py-1 rounded-full">
          Coming in {phase}
        </span>
      )}
      <Link to="/dashboard" className="mt-6 btn-secondary flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
