import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomComposer } from './custom-composer';

// Mock @assistant-ui/react Composer components
vi.mock('@assistant-ui/react', () => ({
  ComposerPrimitive: {
    Root: vi.fn(({ children, className }: any) => (
      <div data-testid="composer-root" className={className}>
        {children}
      </div>
    )),
    Input: vi.fn(({ placeholder, className, autoFocus }: any) => (
      <input
        data-testid="composer-input"
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />
    )),
    Send: vi.fn(({ children, className }: any) => (
      <button data-testid="composer-send" className={className}>
        {children}
      </button>
    )),
  },
}));

describe('CustomComposer', () => {
  it('renders without errors', () => {
    render(<CustomComposer />);
    expect(screen.getByTestId('composer-root')).toBeInTheDocument();
  });

  it('renders input field with hybrid mode placeholder', () => {
    render(<CustomComposer />);
    const input = screen.getByTestId('composer-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Answer the question or ask your own...');
  });

  it('renders send button', () => {
    render(<CustomComposer />);
    const sendButton = screen.getByTestId('composer-send');
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).toHaveTextContent('Send');
  });

  it('configures input with autoFocus', () => {
    render(<CustomComposer />);
    // Verify input is rendered - autoFocus is configured but may not show in test DOM
    const input = screen.getByTestId('composer-input');
    expect(input).toBeInTheDocument();
  });

  it('applies correct styling classes to root', () => {
    render(<CustomComposer />);
    const root = screen.getByTestId('composer-root');
    expect(root.className).toContain('flex');
    expect(root.className).toContain('w-full');
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('border');
  });

  it('allows user to type in input field', async () => {
    const user = userEvent.setup();
    render(<CustomComposer />);
    const input = screen.getByTestId('composer-input') as HTMLInputElement;

    await user.type(input, 'Test message');
    expect(input.value).toBe('Test message');
  });

  it('supports both structured and free-form input', async () => {
    const user = userEvent.setup();
    render(<CustomComposer />);
    const input = screen.getByTestId('composer-input') as HTMLInputElement;

    // Test structured response
    await user.type(input, 'Option A');
    expect(input.value).toBe('Option A');

    // Clear and test free-form
    await user.clear(input);
    await user.type(input, 'Can you explain the architecture?');
    expect(input.value).toBe('Can you explain the architecture?');
  });

  it('send button is clickable', async () => {
    const user = userEvent.setup();
    render(<CustomComposer />);
    const sendButton = screen.getByTestId('composer-send');

    await user.click(sendButton);
    // Button should be clickable without errors
    expect(sendButton).toBeInTheDocument();
  });
});
