---
id: shadcn-component-pattern
name: Shadcn Component Pattern with CVA
category: UI Components
tags: [shadcn, radix-ui, cva, variants, composition]
created: 2026-04-28
---

## Overview

Shared UI components using shadcn style: Radix UI primitives + Tailwind + CVA variants + forwardRef for composition. Components are in `src/components/ui/` and can be used across all features.

## Source Reference

**Pattern**: shadcn/ui Component Library
**Documentation**: https://ui.shadcn.com/docs/components
**Example**: https://ui.shadcn.com/docs/components/button

## Code Example

```typescript
// src/components/ui/button/button.tsx

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// Define variants with CVA
const buttonVariants = cva(
  // Base classes applied to all variants
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Define props type
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  };

// Component with forwardRef for composition
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
```

## Usage in Components

```typescript
import { Button } from '@/components/ui/button';

export const Example = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="flex gap-2">
      {/* Default variant */}
      <Button onClick={() => console.log('clicked')}>
        Click Me
      </Button>

      {/* With variant and size */}
      <Button variant="destructive" size="sm">
        Delete
      </Button>

      {/* With loading state */}
      <Button isLoading={isLoading}>
        Submit
      </Button>

      {/* As child (composition) */}
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>

      {/* Custom className override */}
      <Button className="w-full">
        Full Width
      </Button>
    </div>
  );
};
```

## What This Demonstrates

- **Variants with CVA**: Type-safe variant props
- **Composition**: `asChild` prop for rendering as different element
- **Accessibility**: ForwardRef for proper ref handling
- **Customization**: className override with cn() utility
- **Loading States**: Built-in loading indicator
- **TypeScript**: Full type inference for props and variants
- **Tailwind**: Utility classes for styling

## When to Use

- When creating shared UI components used across multiple features
- When you need consistent styling with variants
- When building on top of Radix UI primitives
- When you need accessible, composable components

## Pattern Requirements

✓ Use `cva()` to define base classes and variants
✓ Use `React.forwardRef` for proper ref forwarding
✓ Include `asChild` prop with `Slot` for composition
✓ Extend native HTML element props (e.g., `React.ButtonHTMLAttributes`)
✓ Use `VariantProps<typeof variants>` for variant prop types
✓ Use `cn()` utility to merge className with variants
✓ Set `displayName` for better debugging
✓ Define `defaultVariants` for sensible defaults
✓ Place shared components in `src/components/ui/`

## Common Mistakes to Avoid

❌ Not using forwardRef (breaks ref forwarding)
❌ Forgetting `asChild` prop (limits composition)
❌ Hardcoding classes instead of using CVA variants
❌ Not spreading `...props` (loses native element props)
❌ Putting feature-specific components in ui/ (use feature/components/ instead)
❌ Not setting displayName (makes debugging harder)
❌ Using inline styles instead of Tailwind classes
❌ Not extracting variants when component has multiple styles

## Related Anchors

- `feature-module-structure` - Where feature-specific components belong
- `tailwind-composition` - Composing Tailwind classes with cn()
- `radix-ui-primitives` - Using Radix UI as foundation

## Test Coverage

**Component Rendering Test**:
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('disables when loading', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

**Interaction Test**:
```typescript
import userEvent from '@testing-library/user-event';

describe('Button interactions', () => {
  it('calls onClick handler', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```
