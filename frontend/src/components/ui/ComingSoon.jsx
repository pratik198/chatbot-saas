/**
 * ComingSoon — reusable placeholder block for unbuilt features.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ComingSoon({ title, phase, icon: Icon = Clock, description }) {
  return (
    <Card className="py-6">
      <EmptyState
        icon={Icon}
        title={title}
        description={description || "We're building this feature — check back soon."}
        action={
          <div className="flex flex-col items-center gap-4">
            {phase && <Badge><Sparkles className="h-3 w-3" /> Coming in {phase}</Badge>}
            <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link></Button>
          </div>
        }
      />
    </Card>
  );
}
