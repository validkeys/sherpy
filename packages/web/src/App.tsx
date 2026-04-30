import { Sidebar } from '@/features/sidebar';
import { Button } from '@/shared/components/ui/button';

function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">Sherpy Planning Pipeline</h1>
          <p className="text-gray-600 mb-6">
            Navigate through the workflow steps using the sidebar to track your progress.
          </p>
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-2">Main Content Area</h2>
            <p className="text-gray-600 mb-4">
              This is where the content for each workflow step will be displayed. Select a step from
              the sidebar to begin.
            </p>
            <div className="flex gap-2">
              <Button>Default Button</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="outline">Outline</Button>
              <Button isLoading>Loading</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
