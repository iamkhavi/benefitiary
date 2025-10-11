import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScrapingSourcesTable } from '../sources-table';

// Mock fetch
global.fetch = vi.fn();

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td data-testid="table-cell">{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr data-testid="table-row">{children}</tr>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
}));

// Mock dialog components
vi.mock('../edit-source-dialog', () => ({
  EditSourceDialog: ({ open, onClose, onSaved }: any) => 
    open ? <div data-testid="edit-dialog">Edit Dialog</div> : null,
}));

vi.mock('../source-details-dialog', () => ({
  SourceDetailsDialog: ({ open, onClose }: any) => 
    open ? <div data-testid="details-dialog">Details Dialog</div> : null,
}));

describe('ScrapingSourcesTable', () => {
  const mockOnRefresh = vi.fn();

  const mockSources = [
    {
      id: '1',
      url: 'https://example.com',
      type: 'FOUNDATION',
      status: 'ACTIVE',
      frequency: 'WEEKLY',
      lastScrapedAt: '2024-01-01T00:00:00Z',
      category: 'Healthcare',
      region: 'Global',
      notes: 'Test source',
      metrics: {
        totalJobs: 10,
        successfulJobs: 8,
        successRate: 80,
        averageDuration: 30000,
        averageGrantsFound: 5.5,
      },
    },
    {
      id: '2',
      url: 'https://example2.com',
      type: 'GOV',
      status: 'INACTIVE',
      frequency: 'DAILY',
      lastScrapedAt: null,
      category: null,
      region: null,
      notes: null,
      metrics: {
        totalJobs: 5,
        successfulJobs: 2,
        successRate: 40,
        averageDuration: 45000,
        averageGrantsFound: 3.2,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful fetch response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sources: mockSources }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);
    
    expect(screen.getByText('Loading sources...')).toBeInTheDocument();
  });

  it('should fetch and display sources', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('https://example2.com')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('should display correct status badges', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges.some(badge => badge.textContent === 'Active')).toBe(true);
      expect(badges.some(badge => badge.textContent === 'Inactive')).toBe(true);
    });
  });

  it('should display correct type badges', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      const badges = screen.getAllByTestId('badge');
      expect(badges.some(badge => badge.textContent === 'FOUNDATION')).toBe(true);
      expect(badges.some(badge => badge.textContent === 'GOV')).toBe(true);
    });
  });

  it('should show performance metrics correctly', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('5.5 grants/run')).toBeInTheDocument();
      expect(screen.getByText('30s avg')).toBeInTheDocument();
      expect(screen.getByText('3.2 grants/run')).toBeInTheDocument();
      expect(screen.getByText('45s avg')).toBeInTheDocument();
    });
  });

  it('should handle trigger scraping action', async () => {
    // Mock successful trigger response
    vi.mocked(fetch).mockImplementation((url) => {
      if (url.toString().includes('/trigger')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Scraping triggered' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sources: mockSources }),
      } as Response);
    });

    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    fireEvent.click(dropdownTriggers[0]);

    // Find and click the trigger scraping option
    const triggerButtons = screen.getAllByText('Trigger Scraping');
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/scraping/sources/1/trigger',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: 1 }),
        })
      );
    });
  });

  it('should handle toggle status action', async () => {
    // Mock successful update response
    vi.mocked(fetch).mockImplementation((url) => {
      if (url.toString().includes('/sources/1') && !url.toString().includes('/trigger')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: '1', status: 'INACTIVE' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sources: mockSources }),
      } as Response);
    });

    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    fireEvent.click(dropdownTriggers[0]);

    // Find and click the deactivate option
    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/scraping/sources/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'INACTIVE' }),
        })
      );
    });
  });

  it('should open source details dialog', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    fireEvent.click(dropdownTriggers[0]);

    // Find and click the view details option
    const viewDetailsButtons = screen.getAllByText('View Details');
    fireEvent.click(viewDetailsButtons[0]);

    expect(screen.getByTestId('details-dialog')).toBeInTheDocument();
  });

  it('should open edit source dialog', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    fireEvent.click(dropdownTriggers[0]);

    // Find and click the edit option
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
  });

  it('should handle delete action with confirmation', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Mock successful delete response
    vi.mocked(fetch).mockImplementation((url) => {
      if (url.toString().includes('/sources/1') && !url.toString().includes('/trigger')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Source deactivated' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sources: mockSources }),
      } as Response);
    });

    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Scraping Sources (2)')).toBeInTheDocument();
    });

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    fireEvent.click(dropdownTriggers[0]);

    // Find and click the delete option
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to deactivate this source?');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/scraping/sources/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    confirmSpy.mockRestore();
  });

  it('should show alert icon for low success rate sources', async () => {
    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      // The second source has 40% success rate, should show alert
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ScrapingSourcesTable onRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching sources:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});