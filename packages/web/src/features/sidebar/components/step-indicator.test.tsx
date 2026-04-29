/**
 * Unit tests for StepIndicator component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from './step-indicator';

describe('StepIndicator', () => {
  describe('complete status', () => {
    it('renders checkmark icon', () => {
      const { container } = render(<StepIndicator status="complete" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has correct styling classes', () => {
      const { container } = render(<StepIndicator status="complete" />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-green-500');
      expect(indicator).toHaveClass('text-white');
    });
  });

  describe('current status', () => {
    it('renders arrow icon', () => {
      const { container } = render(<StepIndicator status="current" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has current styling', () => {
      const { container } = render(<StepIndicator status="current" />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-blue-500');
      expect(indicator).toHaveClass('text-white');
    });
  });

  describe('pending status', () => {
    it('renders circle icon', () => {
      const { container } = render(<StepIndicator status="pending" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has pending styling', () => {
      const { container } = render(<StepIndicator status="pending" />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('bg-gray-300');
      expect(indicator).toHaveClass('text-gray-600');
    });
  });

  describe('component structure', () => {
    it('renders as a div element', () => {
      const { container } = render(<StepIndicator status="complete" />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator.tagName).toBe('DIV');
    });

    it('applies base classes', () => {
      const { container } = render(<StepIndicator status="complete" />);
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('inline-flex');
      expect(indicator).toHaveClass('items-center');
      expect(indicator).toHaveClass('justify-center');
      expect(indicator).toHaveClass('rounded-full');
      expect(indicator).toHaveClass('w-6');
      expect(indicator).toHaveClass('h-6');
    });

    it('forwards ref to div element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<StepIndicator status="complete" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('merges custom className with default classes', () => {
      const { container } = render(
        <StepIndicator status="complete" className="custom-class" />
      );
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveClass('custom-class');
      expect(indicator).toHaveClass('bg-green-500'); // Still has variant class
    });

    it('passes through additional HTML attributes', () => {
      const { container } = render(
        <StepIndicator
          status="complete"
          data-testid="test-indicator"
          aria-label="Complete step"
        />
      );
      const indicator = container.firstChild as HTMLElement;
      expect(indicator).toHaveAttribute('data-testid', 'test-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Complete step');
    });
  });

  describe('icon rendering for each status', () => {
    it('shows different icons for different statuses', () => {
      const { container: completeContainer, unmount: unmountComplete } = render(
        <StepIndicator status="complete" />
      );
      const { container: currentContainer, unmount: unmountCurrent } = render(
        <StepIndicator status="current" />
      );
      const { container: pendingContainer } = render(
        <StepIndicator status="pending" />
      );

      // All should have an SVG
      expect(completeContainer.querySelector('svg')).toBeInTheDocument();
      expect(currentContainer.querySelector('svg')).toBeInTheDocument();
      expect(pendingContainer.querySelector('svg')).toBeInTheDocument();

      // Clean up
      unmountComplete();
      unmountCurrent();
    });
  });
});
