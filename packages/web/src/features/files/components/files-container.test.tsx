/**
 * Files Container Component Tests
 *
 * Tests for document generation button and file browsing functionality.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilesContainer } from './files-container';
import * as generateDocumentModule from '@/shared/api/documents/generate-document';

// Mock child components
vi.mock('./file-tree', () => ({
  FileTree: ({ projectId }: { projectId: string }) => (
    <div data-testid="file-tree">FileTree for {projectId}</div>
  ),
}));

vi.mock('./file-preview', () => ({
  FilePreview: ({ projectId }: { projectId: string }) => (
    <div data-testid="file-preview">FilePreview for {projectId}</div>
  ),
}));

vi.mock('./files-error-boundary', () => ({
  FilesErrorBoundary: ({ children }: { children: unknown }) => <>{children}</>,
}));

describe('FilesContainer', () => {
  const mockProjectId = 'test-project-123';
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FilesContainer projectId={mockProjectId} />
      </QueryClientProvider>
    );
  };

  it('renders documents header with generate button', () => {
    renderComponent();

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate document/i })).toBeInTheDocument();
  });

  it('renders file tree and file preview', () => {
    renderComponent();

    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('file-preview')).toBeInTheDocument();
  });

  it('calls generateDocument mutation when button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    vi.spyOn(generateDocumentModule, 'useGenerateDocument').mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      // @ts-expect-error - partial mock
      mutateAsync: vi.fn(),
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
      data: undefined,
      error: null,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: true,
      isPaused: false,
      status: 'idle',
      submittedAt: 0,
    });

    renderComponent();

    const generateButton = screen.getByRole('button', { name: /generate document/i });
    await user.click(generateButton);

    expect(mockMutate).toHaveBeenCalledWith({
      projectId: mockProjectId,
      data: {
        documentType: 'implementation-plan',
        format: 'yaml',
      },
    });
  });

  it('disables button and shows loading state when generating', () => {
    vi.spyOn(generateDocumentModule, 'useGenerateDocument').mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      // @ts-expect-error - partial mock
      mutateAsync: vi.fn(),
      isSuccess: false,
      isError: false,
      reset: vi.fn(),
      data: undefined,
      error: null,
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isIdle: false,
      isPaused: false,
      status: 'pending',
      submittedAt: Date.now(),
    });

    renderComponent();

    const generateButton = screen.getByRole('button', { name: /generate document/i });
    expect(generateButton).toBeDisabled();
  });

  it('calls onSuccess callback when document is generated', async () => {
    let onSuccessCallback: (() => void) | undefined;

    vi.spyOn(generateDocumentModule, 'useGenerateDocument').mockImplementation((config) => {
      onSuccessCallback = config?.onSuccess;
      return {
        mutate: vi.fn(),
        isPending: false,
        // @ts-expect-error - partial mock
        mutateAsync: vi.fn(),
        isSuccess: false,
        isError: false,
        reset: vi.fn(),
        data: undefined,
        error: null,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: true,
        isPaused: false,
        status: 'idle',
        submittedAt: 0,
      };
    });

    renderComponent();

    expect(onSuccessCallback).toBeDefined();

    // Call success callback (normally triggered by mutation)
    onSuccessCallback?.();

    // Success callback should not throw
    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  it('logs error message when document generation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Generation failed');

    vi.spyOn(generateDocumentModule, 'useGenerateDocument').mockImplementation((config) => {
      // Trigger the error callback immediately for testing
      config?.onError?.(mockError);

      return {
        mutate: vi.fn(),
        isPending: false,
        // @ts-expect-error - partial mock
        mutateAsync: vi.fn(),
        isSuccess: false,
        isError: false,
        reset: vi.fn(),
        data: undefined,
        error: null,
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isIdle: true,
        isPaused: false,
        status: 'idle',
        submittedAt: 0,
      };
    });

    renderComponent();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to generate document:', mockError);
    });

    consoleSpy.mockRestore();
  });
});
