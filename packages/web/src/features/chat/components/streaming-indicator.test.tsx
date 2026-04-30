import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingIndicator } from './streaming-indicator';

describe('StreamingIndicator', () => {
  it('renders streaming message', () => {
    render(<StreamingIndicator />);
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('renders pulsing dots', () => {
    const { container } = render(<StreamingIndicator />);
    const dots = container.querySelectorAll('.animate-pulse');
    expect(dots).toHaveLength(3);
  });

  it('has correct styling classes', () => {
    const { container } = render(<StreamingIndicator />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('renders all three dots with staggered animation', () => {
    const { container } = render(<StreamingIndicator />);
    const dots = Array.from(container.querySelectorAll('.animate-pulse'));

    expect(dots[0]).toBeInTheDocument();
    expect(dots[1]).toBeInTheDocument();
    expect(dots[2]).toBeInTheDocument();
  });
});
