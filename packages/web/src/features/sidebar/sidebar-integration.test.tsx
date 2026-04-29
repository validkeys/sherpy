/**
 * Feature integration smoke test
 *
 * Validates that the sidebar feature can be imported and used through
 * its public API only, ensuring proper encapsulation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

// Import ONLY from feature index (no deep imports)
import {
  Sidebar,
  type WorkflowStep,
  type WorkflowStepConfig,
  type StepStatus,
  currentStepAtom,
  completedStepsAtom,
  stepStatusesAtom,
} from './index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Sidebar Feature Public API', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorageMock.clear();
    store = createStore();
  });

  describe('component export', () => {
    it('exports Sidebar component', () => {
      expect(Sidebar).toBeDefined();
      expect(typeof Sidebar).toBe('function');
    });

    it('renders Sidebar component without errors', () => {
      const { container } = render(
        <Provider store={store}>
          <Sidebar />
        </Provider>
      );

      // Should render an aside element
      const aside = container.querySelector('aside');
      expect(aside).toBeInTheDocument();
    });

    it('Sidebar displays workflow steps', () => {
      const { container } = render(
        <Provider store={store}>
          <Sidebar />
        </Provider>
      );

      // Should have multiple step buttons
      const buttons = container.querySelectorAll('[role="button"]');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('type exports', () => {
    it('exports WorkflowStep type', () => {
      // TypeScript compilation validates this
      const step: WorkflowStep = 'intake';
      expect(step).toBe('intake');

      // Should accept all valid workflow steps
      const validSteps: WorkflowStep[] = [
        'intake',
        'gap-analysis',
        'business-requirements',
        'technical-requirements',
        'style-anchors',
        'implementation-planning',
        'plan-review',
        'architecture-decisions',
        'delivery-timeline',
        'qa-test-plan',
      ];

      expect(validSteps).toHaveLength(10);
    });

    it('exports WorkflowStepConfig type', () => {
      // TypeScript compilation validates this
      const stepConfig: WorkflowStepConfig = {
        id: 'intake',
        name: 'Intake',
        description: 'Initial discovery',
      };

      expect(stepConfig.id).toBe('intake');
      expect(stepConfig.name).toBe('Intake');
    });

    it('exports StepStatus type', () => {
      // TypeScript compilation validates this
      const statuses: StepStatus[] = ['complete', 'current', 'pending'];

      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('complete');
      expect(statuses).toContain('current');
      expect(statuses).toContain('pending');
    });
  });

  describe('atom exports', () => {
    it('exports currentStepAtom', () => {
      expect(currentStepAtom).toBeDefined();

      // Can read from atom
      const currentStep = store.get(currentStepAtom);
      expect(currentStep).toBe('intake'); // default value

      // Can write to atom
      store.set(currentStepAtom, 'business-requirements');
      const updatedStep = store.get(currentStepAtom);
      expect(updatedStep).toBe('business-requirements');
    });

    it('exports completedStepsAtom', () => {
      expect(completedStepsAtom).toBeDefined();

      // Can read from atom
      const completedSteps = store.get(completedStepsAtom);
      expect(completedSteps).toEqual([]); // default empty array

      // Can write to atom
      store.set(completedStepsAtom, ['intake', 'gap-analysis']);
      const updatedSteps = store.get(completedStepsAtom);
      expect(updatedSteps).toEqual(['intake', 'gap-analysis']);
    });

    it('exports stepStatusesAtom', () => {
      expect(stepStatusesAtom).toBeDefined();

      // Can read derived atom
      const statuses = store.get(stepStatusesAtom);
      expect(statuses).toBeInstanceOf(Map);
      expect(statuses.size).toBeGreaterThan(0);

      // Should have status for intake (current by default)
      const intakeStatus = statuses.get('intake');
      expect(intakeStatus).toBe('current');
    });

    it('atoms work together correctly', () => {
      // Set some completed steps
      store.set(completedStepsAtom, ['intake', 'gap-analysis']);
      // Set current step
      store.set(currentStepAtom, 'business-requirements');

      // Check derived statuses
      const statuses = store.get(stepStatusesAtom);

      expect(statuses.get('intake')).toBe('complete');
      expect(statuses.get('gap-analysis')).toBe('complete');
      expect(statuses.get('business-requirements')).toBe('current');
      expect(statuses.get('technical-requirements')).toBe('pending');
    });
  });

  describe('feature encapsulation', () => {
    it('does not export internal components', async () => {
      // This test validates at TypeScript level
      // If SidebarStep or StepIndicator were exported, these imports would work
      // Since they're not exported, TypeScript should prevent these imports

      // @ts-expect-error - SidebarStep should not be accessible
      const SidebarStepImport = (await import('./index')).SidebarStep;
      expect(SidebarStepImport).toBeUndefined();

      // @ts-expect-error - StepIndicator should not be accessible
      const StepIndicatorImport = (await import('./index')).StepIndicator;
      expect(StepIndicatorImport).toBeUndefined();
    });

    it('exports only intended public API members', async () => {
      const featureExports = await import('./index');
      const exportedKeys = Object.keys(featureExports);

      // Should export these public members
      expect(exportedKeys).toContain('Sidebar');
      expect(exportedKeys).toContain('currentStepAtom');
      expect(exportedKeys).toContain('completedStepsAtom');
      expect(exportedKeys).toContain('stepStatusesAtom');

      // Should NOT export internal components
      expect(exportedKeys).not.toContain('SidebarStep');
      expect(exportedKeys).not.toContain('StepIndicator');
    });
  });

  describe('app integration', () => {
    it('Sidebar works in Provider context', () => {
      // Simulate app usage
      const { container } = render(
        <Provider store={store}>
          <div className="flex">
            <Sidebar />
            <main className="flex-1">
              <h1>Main Content</h1>
            </main>
          </div>
        </Provider>
      );

      // Sidebar should render
      const aside = container.querySelector('aside');
      expect(aside).toBeInTheDocument();

      // Main content should also render
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('atoms can be used for app-level state access', () => {
      // App might want to read current step outside sidebar
      store.set(currentStepAtom, 'delivery-timeline');

      // Some other component could read this
      const currentStep = store.get(currentStepAtom);
      expect(currentStep).toBe('delivery-timeline');

      // Could also check if certain steps are completed
      store.set(completedStepsAtom, [
        'intake',
        'gap-analysis',
        'business-requirements',
      ]);
      const completed = store.get(completedStepsAtom);
      expect(completed).toHaveLength(3);
      expect(completed).toContain('intake');
    });
  });
});
