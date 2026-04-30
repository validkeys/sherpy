/**
 * FileTree Component Integration Tests
 *
 * Tests the FileTree component with mock API data
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileTree } from './file-tree';
import { Document, DocumentType } from '../types';
import * as getDocumentsApi from '../api/get-documents';

// Mock documents
const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    projectId: 'test-project',
    documentType: DocumentType.BUSINESS_REQUIREMENTS,
    format: 'yaml',
    content: 'test content',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-2',
    projectId: 'test-project',
    documentType: DocumentType.TECHNICAL_REQUIREMENTS,
    format: 'yaml',
    content: 'test content',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-3',
    projectId: 'test-project',
    documentType: DocumentType.MILESTONES,
    format: 'yaml',
    content: 'test content',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-4',
    projectId: 'test-project',
    documentType: DocumentType.EXECUTIVE_SUMMARY,
    format: 'md',
    content: '# Summary',
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('FileTree', () => {
  let queryClient: QueryClient;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    store = createStore();
    vi.clearAllMocks();
  });

  const renderFileTree = (projectId = 'test-project') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <FileTree projectId={projectId} />
        </Provider>
      </QueryClientProvider>
    );
  };

  it('shows loading state while fetching documents', () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderFileTree();

    // Should show skeleton loaders
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    renderFileTree();

    expect(screen.getByText(/failed to load documents/i)).toBeInTheDocument();
  });

  it('shows empty state when no documents available', () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderFileTree();

    expect(screen.getByText(/no documents available yet/i)).toBeInTheDocument();
  });

  it('renders folder structure with documents', () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: mockDocuments,
      isLoading: false,
      error: null,
    } as any);

    renderFileTree();

    // Check folders are rendered
    expect(screen.getByText('implementation')).toBeInTheDocument();
    expect(screen.getByText('requirements')).toBeInTheDocument();
    expect(screen.getByText('summaries')).toBeInTheDocument();
  });

  it('expands and collapses folders on click', async () => {
    const user = userEvent.setup();
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: mockDocuments,
      isLoading: false,
      error: null,
    } as any);

    renderFileTree();

    const requirementsFolder = screen.getByText('requirements');
    expect(requirementsFolder).toBeInTheDocument();

    // Initially files should not be visible (folder collapsed)
    expect(screen.queryByText(/business-requirements\.yaml/i)).not.toBeInTheDocument();

    // Click to expand
    await user.click(requirementsFolder);

    // Files should now be visible
    await waitFor(() => {
      expect(screen.getByText(/business-requirements\.yaml/i)).toBeInTheDocument();
    });

    // Click to collapse
    await user.click(requirementsFolder);

    // Files should be hidden again
    await waitFor(() => {
      expect(screen.queryByText(/business-requirements\.yaml/i)).not.toBeInTheDocument();
    });
  });

  it('renders files within folders', async () => {
    const user = userEvent.setup();
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: mockDocuments,
      isLoading: false,
      error: null,
    } as any);

    renderFileTree();

    // Expand requirements folder
    await user.click(screen.getByText('requirements'));

    await waitFor(() => {
      expect(screen.getByText(/business-requirements\.yaml/i)).toBeInTheDocument();
      expect(screen.getByText(/technical-requirements\.yaml/i)).toBeInTheDocument();
    });

    // Expand implementation folder
    await user.click(screen.getByText('implementation'));

    await waitFor(() => {
      expect(screen.getByText(/milestones\.yaml/i)).toBeInTheDocument();
    });

    // Expand summaries folder
    await user.click(screen.getByText('summaries'));

    await waitFor(() => {
      expect(screen.getByText(/executive-summary\.md/i)).toBeInTheDocument();
    });
  });
});
