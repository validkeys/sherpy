/**
 * SidebarStep Component
 *
 * Individual workflow step item with name, description, status indicator,
 * and click handler. Building block for the sidebar step list.
 */

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { StepIndicator } from './step-indicator';
import type { WorkflowStepConfig, StepStatus } from '../types';

const sidebarStepVariants = cva(
  'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100',
  {
    variants: {
      isActive: {
        true: 'bg-blue-50 border-2 border-blue-200',
        false: 'border-2 border-transparent',
      },
    },
    defaultVariants: {
      isActive: false,
    },
  }
);

export interface SidebarStepProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>,
    VariantProps<typeof sidebarStepVariants> {
  /** Workflow step configuration with metadata */
  step: WorkflowStepConfig;
  /** Current status of the step */
  status: StepStatus;
  /** Whether this step is the current active step */
  isActive: boolean;
  /** Click handler for step navigation */
  onClick: () => void;
}

/**
 * SidebarStep displays a single workflow step with status indicator and metadata.
 * Clicking the step triggers navigation via the onClick handler.
 *
 * Features:
 * - Status indicator icon
 * - Step name (bold)
 * - Step description (smaller, muted)
 * - Active state highlighting
 * - Keyboard accessible
 */
export const SidebarStep = forwardRef<HTMLDivElement, SidebarStepProps>(
  ({ step, status, isActive, onClick, className, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={sidebarStepVariants({ isActive, className })}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        aria-label={`Navigate to ${step.name}`}
        aria-current={isActive ? 'step' : undefined}
        {...props}
      >
        <StepIndicator status={status} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm">{step.name}</div>
          <div className="text-xs text-gray-600 mt-0.5">{step.description}</div>
        </div>
      </div>
    );
  }
);

SidebarStep.displayName = 'SidebarStep';
