import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PreferencesForm } from '../preferences-form';
import { preferencesSchema, type PreferencesFormData } from '@/lib/validations/onboarding';

// Mock the form wrapper component
function TestWrapper({ onSubmit, initialCategories = [] }: { 
  onSubmit: (data: PreferencesFormData) => Promise<void>;
  initialCategories?: PreferencesFormData['categories'];
}) {
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      categories: initialCategories,
    },
  });

  return (
    <PreferencesForm
      onSubmit={onSubmit}
      selectedCategories={form.watch('categories')}
      isLoading={false}
      form={form}
    />
  );
}

describe('PreferencesForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders all grant categories', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Healthcare & Public Health')).toBeInTheDocument();
    expect(screen.getByText('Education & Training')).toBeInTheDocument();
    expect(screen.getByText('Agriculture & Food Security')).toBeInTheDocument();
    expect(screen.getByText('Climate & Environment')).toBeInTheDocument();
    expect(screen.getByText('Technology & Innovation')).toBeInTheDocument();
    expect(screen.getByText('Women & Youth Empowerment')).toBeInTheDocument();
    expect(screen.getByText('Arts & Culture')).toBeInTheDocument();
    expect(screen.getByText('Community Development')).toBeInTheDocument();
    expect(screen.getByText('Human Rights & Governance')).toBeInTheDocument();
    expect(screen.getByText('SME / Business Growth')).toBeInTheDocument();
  });

  it('displays category descriptions', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Medical research, public health initiatives, disease prevention')).toBeInTheDocument();
    expect(screen.getByText('Educational programs, skill development, capacity building')).toBeInTheDocument();
    expect(screen.getByText('Small business support, entrepreneurship, economic development')).toBeInTheDocument();
  });

  it('allows selecting multiple categories', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const healthcareCheckbox = screen.getByLabelText('Healthcare & Public Health');
    const educationCheckbox = screen.getByLabelText('Education & Training');

    fireEvent.click(healthcareCheckbox);
    fireEvent.click(educationCheckbox);

    expect(healthcareCheckbox).toBeChecked();
    expect(educationCheckbox).toBeChecked();
  });

  it('shows validation error when no categories are selected', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /complete setup/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select at least one category')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with selected categories', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const healthcareCheckbox = screen.getByLabelText('Healthcare & Public Health');
    const educationCheckbox = screen.getByLabelText('Education & Training');

    fireEvent.click(healthcareCheckbox);
    fireEvent.click(educationCheckbox);

    const submitButton = screen.getByRole('button', { name: /complete setup/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        categories: ['HEALTHCARE_PUBLIC_HEALTH', 'EDUCATION_TRAINING']
      });
    });
  });

  it('allows deselecting categories', async () => {
    render(<TestWrapper onSubmit={mockOnSubmit} initialCategories={['HEALTHCARE_PUBLIC_HEALTH']} />);

    const healthcareCheckbox = screen.getByLabelText('Healthcare & Public Health');
    expect(healthcareCheckbox).toBeChecked();

    fireEvent.click(healthcareCheckbox);
    expect(healthcareCheckbox).not.toBeChecked();
  });

  it('highlights selected category cards', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} initialCategories={['HEALTHCARE_PUBLIC_HEALTH']} />);

    const healthcareCard = screen.getByLabelText('Healthcare & Public Health').closest('.cursor-pointer');
    expect(healthcareCard).toHaveClass('ring-2', 'ring-primary', 'bg-primary/5');
  });

  it('shows back button', () => {
    render(<TestWrapper onSubmit={mockOnSubmit} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('disables form when loading', () => {
    function LoadingTestWrapper() {
      const form = useForm<PreferencesFormData>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: { categories: [] },
      });

      return (
        <PreferencesForm
          onSubmit={mockOnSubmit}
          selectedCategories={[]}
          isLoading={true}
          form={form}
        />
      );
    }

    render(<LoadingTestWrapper />);

    const submitButton = screen.getByRole('button', { name: /complete setup/i });
    const backButton = screen.getByRole('button', { name: /back/i });

    expect(submitButton).toBeDisabled();
    expect(backButton).toBeDisabled();
  });

  it('shows loading spinner when submitting', () => {
    function LoadingSpinnerTestWrapper() {
      const form = useForm<PreferencesFormData>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: { categories: [] },
      });

      return (
        <PreferencesForm
          onSubmit={mockOnSubmit}
          selectedCategories={[]}
          isLoading={true}
          form={form}
        />
      );
    }

    render(<LoadingSpinnerTestWrapper />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});