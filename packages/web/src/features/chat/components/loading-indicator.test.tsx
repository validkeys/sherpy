import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingIndicator } from './loading-indicator';

describe('LoadingIndicator', () => {
  it('renders loading message', () => {
    render(<LoadingIndicator />);
    expect(screen.getByText('Invoking skill...')).toBeInTheDocument();
  });

  it('renders spinner icon', () => {
    const { container } = render(<LoadingIndicator />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<LoadingIndicator />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
  });
});
