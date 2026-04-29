/**
 * Sidebar Feature
 *
 * Workflow navigation sidebar displaying all Sherpy pipeline steps
 * with status indicators and interactive navigation.
 *
 * Public API:
 * - Sidebar: Main sidebar container component
 * - WorkflowStep, WorkflowStepConfig, StepStatus: Type definitions
 * - currentStepAtom, completedStepsAtom, stepStatusesAtom: State atoms
 *
 * Internal components (SidebarStep, StepIndicator) are not exported
 * and should not be used outside this feature.
 */

// Main component
export { Sidebar } from './components/sidebar';

// Types
export type {
  WorkflowStep,
  WorkflowStepConfig,
  StepStatus,
} from './types';

// State atoms (for app-level usage, not cross-feature)
export {
  currentStepAtom,
  completedStepsAtom,
  stepStatusesAtom,
} from './state/workflow-atoms';
