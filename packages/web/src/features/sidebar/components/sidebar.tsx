/**
 * Sidebar Component
 *
 * Main sidebar container displaying all workflow steps with navigation logic.
 * Connects to jotai atoms for state management and renders the step list.
 * Auto-invokes skills via chat when user navigates to a workflow step.
 * Persists workflow state to database via Projects API.
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { useChatActions } from '@/features/chat';
import { useProject } from '@/shared/api/projects/get-project';
import { useUpdateProject } from '@/shared/api/projects/update-project';
import { currentProjectIdAtom } from '@/shared/state';
import { getSkillMessageForStep } from '@/shared/services/skill-service';
import { currentStepAtom, stepStatusesAtom } from '../state/workflow-atoms';
import { WORKFLOW_STEPS, type WorkflowStep } from '../types';
import { SidebarStep } from './sidebar-step';

/**
 * Sidebar displays the complete workflow step list with interactive navigation.
 *
 * Features:
 * - Fixed width at 1/3 of screen
 * - All 10 workflow steps displayed
 * - Current step highlighted
 * - Status indicators for each step
 * - Click to navigate to any step
 * - Auto-invokes skill via chat when step clicked
 * - Loading state during skill invocation
 * - Scrollable when steps overflow
 * - State persisted to database via Projects API
 * - Optimistic updates with error rollback
 */
export function Sidebar() {
  const currentStep = useAtomValue(currentStepAtom);
  const stepStatuses = useAtomValue(stepStatusesAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  const { sendMessage } = useChatActions();
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [previousStep, setPreviousStep] = useState<WorkflowStep | null>(null);

  // Get current project ID from app-level state
  const projectId = useAtomValue(currentProjectIdAtom);

  // Load project to sync initial workflow state
  const { data: projectData, isLoading: isLoadingProject } = useProject({
    projectId: projectId ?? '',
    queryConfig: {
      enabled: !!projectId,
    },
  });

  // Mutation for persisting workflow state changes
  const { mutate: updateProject } = useUpdateProject({
    onError: (error) => {
      console.error('Failed to persist workflow state:', error);
      // Revert optimistic update on error
      if (previousStep) {
        setCurrentStep(previousStep);
      }
      // TODO: Add toast notification for user feedback
    },
  });

  // Sync initial workflow state from database on project load
  // Only runs when projectData changes (initial load or project switch)
  useEffect(() => {
    if (projectData?.project?.pipelineStatus) {
      const dbStep = projectData.project.pipelineStatus as WorkflowStep;
      setCurrentStep(dbStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectData, setCurrentStep]);

  const handleStepClick = async (stepId: string) => {
    try {
      setLoadingStepId(stepId);

      // Store previous step for error rollback
      setPreviousStep(currentStep);

      // Optimistic update: update local state immediately
      setCurrentStep(stepId);

      // Persist to database (only if projectId available)
      if (projectId) {
        updateProject({
          projectId,
          data: { pipelineStatus: stepId },
        });
      } else {
        console.warn('Cannot persist workflow state: No project ID available');
      }

      const skillMessage = getSkillMessageForStep(stepId);
      if (skillMessage) {
        await sendMessage(skillMessage);
      } else {
        console.warn(`No skill command defined for step: ${stepId}`);
      }
    } catch (error) {
      console.error('Failed to invoke skill:', error);
      // Revert on skill invocation error
      if (previousStep) {
        setCurrentStep(previousStep);
      }
    } finally {
      setLoadingStepId(null);
    }
  };

  return (
    <aside
      className="w-1/3 h-screen bg-white border-r border-gray-200 flex flex-col"
      aria-label="Sherpy workflow navigation"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Workflow Steps</h2>
        <p className="text-xs text-gray-600 mt-1">
          Track your progress through the Sherpy planning pipeline
        </p>
        {isLoadingProject && (
          <p className="text-xs text-gray-500 mt-1">Loading workflow state...</p>
        )}
      </div>

      {/* Step List */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {WORKFLOW_STEPS.map((step) => {
            const status = stepStatuses.get(step.id) || 'pending';
            const isActive = step.id === currentStep;
            const isLoading = loadingStepId === step.id;

            return (
              <SidebarStep
                key={step.id}
                step={step}
                status={status}
                isActive={isActive}
                onClick={() => handleStepClick(step.id)}
                aria-busy={isLoading}
                aria-disabled={isLoading}
                style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}
              />
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
