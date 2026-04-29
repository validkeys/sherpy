/**
 * StepIndicator Component
 *
 * Displays a status icon for a workflow step based on its completion status.
 * Uses CVA for variant styling and lucide-react for icons.
 */

import { type VariantProps, cva } from "class-variance-authority";
import { ArrowRight, Check, Circle } from "lucide-react";
import type React from "react";
import { forwardRef } from "react";
import type { StepStatus } from "../types";

const stepIndicatorVariants = cva(
  "inline-flex items-center justify-center rounded-full w-6 h-6 text-sm font-medium transition-colors",
  {
    variants: {
      status: {
        complete: "bg-green-500 text-white",
        current: "bg-blue-500 text-white",
        pending: "bg-gray-300 text-gray-600",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  },
);

export interface StepIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stepIndicatorVariants> {
  /** Status of the workflow step */
  status: StepStatus;
}

/**
 * StepIndicator displays the appropriate icon and styling for a workflow step's status.
 *
 * Status icons:
 * - Complete: Checkmark (✓)
 * - Current: Arrow (→)
 * - Pending: Circle (○)
 */
export const StepIndicator = forwardRef<HTMLDivElement, StepIndicatorProps>(
  ({ status, className, ...props }, ref) => {
    const Icon = status === "complete" ? Check : status === "current" ? ArrowRight : Circle;

    return (
      <div ref={ref} className={stepIndicatorVariants({ status, className })} {...props}>
        <Icon size={16} />
      </div>
    );
  },
);

StepIndicator.displayName = "StepIndicator";
