/**
 * ComingSoonPage — friendly placeholder for routes not built yet.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ComingSoonPage({ title, phase }) {
  return (
    <Card className="py-6">
      <EmptyState
        icon={Clock}
        title={`${title} is coming soon`}
        description="We're crafting this feature carefully to match the rest of Lumina. Check back shortly."
        action={
          <div className="flex flex-col items-center gap-4">
            {phase && <Badge><Sparkles className="h-3 w-3" /> Planned for {phase}</Badge>}
            <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link></Button>
          </div>
        }
      />
    </Card>
  );
}
