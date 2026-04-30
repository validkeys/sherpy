/**
 * Sidebar Component
 *
 * Main sidebar container displaying all workflow steps with navigation logic.
 * Connects to jotai atoms for state management and renders the step list.
 * Auto-invokes skills via chat when user navigates to a workflow step.
 */

import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { useChatActions } from '@/features/chat';
import { getSkillMessageForStep } from '@/shared/services/skill-service';
import { currentStepAtom, stepStatusesAtom } from '../state/workflow-atoms';
import { WORKFLOW_STEPS } from '../types';
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
 * - State persisted in localStorage
 */
export function Sidebar() {
  const currentStep = useAtomValue(currentStepAtom);
  const stepStatuses = useAtomValue(stepStatusesAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);
  const { sendMessage } = useChatActions();
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);

  const handleStepClick = async (stepId: string) => {
    try {
      setLoadingStepId(stepId);
      setCurrentStep(stepId);

      const skillMessage = getSkillMessageForStep(stepId);
      if (skillMessage) {
        await sendMessage(skillMessage);
      } else {
        console.warn(`No skill command defined for step: ${stepId}`);
      }
    } catch (error) {
      console.error('Failed to invoke skill:', error);
    } finally {
      setLoadingStepId(null);
    }
  };

  return (
    <aside className="w-1/3 h-screen bg-white border-r border-gray-200 flex flex-col" aria-label="Sherpy workflow navigation">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Workflow Steps</h2>
        <p className="text-xs text-gray-600 mt-1">
          Track your progress through the Sherpy planning pipeline
        </p>
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
