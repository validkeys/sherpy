/**
 * Pipeline Status Visualization Component
 * Visual stepper showing project progression through Sherpy workflow stages
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPipelineStatus } from "@/lib/pipeline-status-utils";
import type { PipelineStatus } from "@sherpy/shared";
import { Check } from "lucide-react";

interface PipelineStatusVisualizationProps {
  currentStatus: PipelineStatus;
}

/**
 * Ordered pipeline stages
 */
const PIPELINE_STAGES: Array<{ status: PipelineStatus; label: string }> = [
  { status: "intake", label: "Intake" },
  { status: "gap-analysis", label: "Gap Analysis" },
  { status: "business-requirements", label: "Business Req" },
  { status: "technical-requirements", label: "Technical Req" },
  { status: "style-anchors", label: "Style Anchors" },
  { status: "implementation-planning", label: "Planning" },
  { status: "plan-review", label: "Review" },
  { status: "architecture-decisions", label: "Architecture" },
  { status: "delivery-timeline", label: "Timeline" },
  { status: "qa-test-plan", label: "QA Plan" },
  { status: "summaries", label: "Summaries" },
  { status: "active-development", label: "Development" },
  { status: "completed", label: "Complete" },
];

/**
 * Determines stage state based on current pipeline status
 */
function getStageState(
  stageStatus: PipelineStatus,
  currentStatus: PipelineStatus,
): "completed" | "current" | "upcoming" {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.status === currentStatus);
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.status === stageStatus);

  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "current";
  return "upcoming";
}

/**
 * Maps stage state to visual styling
 */
function getStageStyles(state: "completed" | "current" | "upcoming") {
  switch (state) {
    case "completed":
      return {
        badge: "bg-green-500 hover:bg-green-500 text-white",
        connector: "bg-green-500",
        icon: Check,
      };
    case "current":
      return {
        badge: "bg-blue-500 hover:bg-blue-500 text-white",
        connector: "bg-muted",
        icon: null,
      };
    case "upcoming":
      return {
        badge: "bg-muted hover:bg-muted text-muted-foreground",
        connector: "bg-muted",
        icon: null,
      };
  }
}

export function PipelineStatusVisualization({ currentStatus }: PipelineStatusVisualizationProps) {
  // Handle special statuses (archived not in normal pipeline flow)
  if (currentStatus === "archived") {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Badge variant="secondary">Archived</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            This project has been archived
          </p>
        </div>
      </Card>
    );
  }

  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.status === currentStatus);
  const totalStages = PIPELINE_STAGES.length;

  return (
    <Card className="p-6">
      <h2 id="pipeline-status-heading" className="text-lg font-semibold mb-4">
        Pipeline Status
      </h2>

      {/* Screen reader only text announcing current stage */}
      <div className="sr-only">
        Stage {currentIndex + 1} of {totalStages}: {formatPipelineStatus(currentStatus)}
      </div>

      {/* Desktop: Horizontal stepper */}
      <div className="hidden lg:block">
        <div
          role="group"
          aria-labelledby="pipeline-status-heading"
          className="flex items-center justify-between"
        >
          {PIPELINE_STAGES.map((stage, index) => {
            const state = getStageState(stage.status, currentStatus);
            const styles = getStageStyles(state);
            const Icon = styles.icon;
            const isLast = index === PIPELINE_STAGES.length - 1;

            return (
              <div key={stage.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.badge}`}
                    aria-label={`${stage.label} - ${state}`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <span className="mt-2 text-xs text-center max-w-[80px]">{stage.label}</span>
                </div>
                {!isLast && <div className={`flex-1 h-0.5 mx-2 ${styles.connector}`} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical stepper */}
      <div className="lg:hidden space-y-4">
        <div role="group" aria-labelledby="pipeline-status-heading">
          {PIPELINE_STAGES.map((stage, index) => {
            const state = getStageState(stage.status, currentStatus);
            const styles = getStageStyles(state);
            const Icon = styles.icon;
            const isLast = index === PIPELINE_STAGES.length - 1;

            return (
              <div key={stage.status} className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.badge}`}
                    aria-label={`${stage.label} - ${state}`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  {!isLast && <div className={`w-0.5 h-12 mt-2 ${styles.connector}`} aria-hidden="true" />}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">{stage.label}</p>
                  {state === "current" && (
                    <p className="text-sm text-muted-foreground">Current stage</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
