/**
 * MilestoneList - Displays all milestones for a project with task status
 * Shows milestones sorted by order with section header and empty state
 */

import { MilestoneCard } from "./milestone-card";
import type { Milestone, Task } from "@sherpy/shared";

interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
}

interface MilestoneListProps {
  milestones: MilestoneWithTasks[];
}

export function MilestoneList({ milestones }: MilestoneListProps) {
  // Sort milestones by orderIndex
  const sortedMilestones = [...milestones].sort((a, b) => a.orderIndex - b.orderIndex);

  if (sortedMilestones.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No milestones found for this project</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Milestones will appear here once they are created
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Milestones <span className="text-muted-foreground">({sortedMilestones.length})</span>
        </h2>
      </div>

      <div className="space-y-4">
        {sortedMilestones.map((milestone) => (
          <MilestoneCard key={milestone.id} milestone={milestone} />
        ))}
      </div>
    </section>
  );
}
