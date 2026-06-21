/**
 * WHY this page exists:
 *   Features in Phases 4–9 aren't built yet.
 *   This page shows a friendly "coming soon" instead of a 404 error.
 *   Reused for all placeholder routes.
 *
 * Props:
 *   title - the page name (e.g., "Analytics")
 *   phase - which phase this feature is planned for (e.g., "Phase 7")
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

export default function ComingSoonPage({ title, phase }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-brand-500" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 max-w-xs mb-3">
        This feature is coming soon. We're building it carefully to make sure it's great.
      </p>
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
