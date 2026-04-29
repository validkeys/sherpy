/**
 * Sidebar Component
 *
 * Main sidebar container displaying all workflow steps with navigation logic.
 * Connects to jotai atoms for state management and renders the step list.
 */

import { useAtomValue, useSetAtom } from 'jotai';
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
 * - Scrollable when steps overflow
 * - State persisted in localStorage
 */
export function Sidebar() {
  const currentStep = useAtomValue(currentStepAtom);
  const stepStatuses = useAtomValue(stepStatusesAtom);
  const setCurrentStep = useSetAtom(currentStepAtom);

  return (
    <aside className="w-1/3 h-screen bg-white border-r border-gray-200 flex flex-col">
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

            return (
              <SidebarStep
                key={step.id}
                step={step}
                status={status}
                isActive={isActive}
                onClick={() => setCurrentStep(step.id)}
              />
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
