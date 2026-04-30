import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionError } from './connection-error';

describe('ConnectionError', () => {
  const mockOnRetry = vi.fn();

  it('renders error banner', () => {
    render(<ConnectionError onRetry={mockOnRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });

  it('shows reconnecting message when reconnecting', () => {
    render(<ConnectionError onRetry={mockOnRetry} isReconnecting={true} />);
    expect(screen.getByText('Connection lost. Reconnecting...')).toBeInTheDocument();
  });

  it('shows retry button when not reconnecting', () => {
    render(<ConnectionError onRetry={mockOnRetry} isReconnecting={false} />);
    const retryButton = screen.getByRole('button', { name: /retry now/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('hides retry button when reconnecting', () => {
    render(<ConnectionError onRetry={mockOnRetry} isReconnecting={true} />);
    expect(screen.queryByRole('button', { name: /retry now/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    render(<ConnectionError onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry now/i });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('displays helpful message about messages being sent later', () => {
    render(<ConnectionError onRetry={mockOnRetry} />);
    expect(
      screen.getByText('Your messages will be sent once the connection is restored.')
    ).toBeInTheDocument();
  });

  it('shows error icon', () => {
    const { container } = render(<ConnectionError onRetry={mockOnRetry} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-destructive');
  });
});
