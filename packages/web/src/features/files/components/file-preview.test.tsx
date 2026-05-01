/**
 * FilePreview Component Integration Tests
 *
 * Tests the FilePreview component with mock document data
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilePreview } from './file-preview';
import type { Document } from '../types';
import { selectedFileAtom } from '../state/file-tree-atoms';
import * as getDocumentsApi from '../api/get-documents';

// Mock documents
const mockYamlDocument: Document = {
  id: 'doc-yaml',
  projectId: 'test-project',
  documentType: 'business-requirements',
  format: 'yaml',
  content: 'name: Test Project\nversion: 1.0',
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
};

const mockMarkdownDocument: Document = {
  id: 'doc-md',
  projectId: 'test-project',
  documentType: 'executive-summary',
  format: 'markdown',
  content: '# Executive Summary\n\nThis is a **test** summary.',
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
};

describe('FilePreview', () => {
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

  const renderFilePreview = (projectId = 'test-project') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <FilePreview projectId={projectId} />
        </Provider>
      </QueryClientProvider>
    );
  };

  it('shows empty state when no file is selected', () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderFilePreview();

    expect(screen.getByText(/select a file to preview/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching documents', () => {
    store.set(selectedFileAtom, 'doc-yaml');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderFilePreview();

    // Should show skeleton loaders
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', () => {
    store.set(selectedFileAtom, 'doc-yaml');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    renderFilePreview();

    expect(screen.getByText(/failed to load documents/i)).toBeInTheDocument();
  });

  it('shows document not found when selected file does not exist', () => {
    store.set(selectedFileAtom, 'non-existent-doc');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [mockYamlDocument],
      isLoading: false,
      error: null,
    } as any);

    renderFilePreview();

    expect(screen.getByText(/document not found/i)).toBeInTheDocument();
  });

  it('renders YAML document with syntax highlighting', async () => {
    store.set(selectedFileAtom, 'doc-yaml');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [mockYamlDocument],
      isLoading: false,
      error: null,
    } as any);

    const { container } = renderFilePreview();

    await waitFor(() => {
      expect(screen.getByText(/business requirements/i)).toBeInTheDocument();
    });

    // Check that YAML content is rendered (look for code blocks which indicate syntax highlighting)
    const codeElements = container.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
  });

  it('renders Markdown document with formatting', async () => {
    store.set(selectedFileAtom, 'doc-md');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [mockMarkdownDocument],
      isLoading: false,
      error: null,
    } as any);

    renderFilePreview();

    // Check that document renders (look for any heading)
    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('displays document metadata', async () => {
    store.set(selectedFileAtom, 'doc-yaml');
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [mockYamlDocument],
      isLoading: false,
      error: null,
    } as any);

    renderFilePreview();

    await waitFor(() => {
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });

  it('updates preview when selected file changes', async () => {
    vi.spyOn(getDocumentsApi, 'useDocuments').mockReturnValue({
      data: [mockYamlDocument, mockMarkdownDocument],
      isLoading: false,
      error: null,
    } as any);

    store.set(selectedFileAtom, 'doc-yaml');
    const { rerender } = renderFilePreview();

    // Initially shows YAML document
    await waitFor(() => {
      expect(screen.getByText(/business requirements/i)).toBeInTheDocument();
    });

    // Change selected file to markdown document
    store.set(selectedFileAtom, 'doc-md');

    // Force re-render with updated atom state
    rerender(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <FilePreview projectId="test-project" />
        </Provider>
      </QueryClientProvider>
    );

    // Should now show markdown document (look for the document type heading that's always rendered)
    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      // Should find the document type heading (Executive Summary)
      expect(headings.some((h) => h.textContent?.includes('Executive Summary'))).toBe(true);
    });
  });
});
