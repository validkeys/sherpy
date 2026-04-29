import { Button } from './button';

/**
 * Button Demo Component
 *
 * Demonstrates all Button variants and sizes from shadcn/ui.
 * This component serves as both documentation and a visual test.
 */
export function ButtonDemo() {
  return (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <span>🎨</span>
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Button States</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Enabled</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled Outline
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Interactive Example</h2>
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => alert('Button clicked!')}>Click Me</Button>
          <Button variant="secondary" onClick={() => alert('Secondary button clicked!')}>
            Secondary Action
          </Button>
        </div>
      </section>
    </div>
  );
}
