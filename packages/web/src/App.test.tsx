import { describe, expect, it } from 'vitest';
import { render, screen } from './test/utils';
import App from './App';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('Sherpy Flow UI Refactor')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<App />);
    expect(screen.getByText(/React 19 \+ Vite \+ TypeScript \+ Tailwind CSS/)).toBeInTheDocument();
  });

  it('renders a button with initial count', () => {
    render(<App />);
    expect(screen.getByRole('button')).toHaveTextContent('Count is 0');
  });

  it('increments count when button is clicked', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;

    render(<App />);
    const button = screen.getByRole('button');

    await userEvent.click(button);
    expect(button).toHaveTextContent('Count is 1');

    await userEvent.click(button);
    expect(button).toHaveTextContent('Count is 2');
  });
});
