import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SignupPage from '../signup/page';
import LoginPage from '../login/page';

// Mock Next.js router
const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock auth client
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signUp: {
      email: vi.fn(),
    },
    signIn: {
      email: vi.fn(),
    },
  },
}));

import { authClient } from '@/lib/auth-client';
const mockSignUp = vi.mocked(authClient.signUp.email);
const mockSignIn = vi.mocked(authClient.signIn.email);

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  describe('SignupPage', () => {
    it('renders signup form correctly', () => {
      render(<SignupPage />);
      
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up with google/i })).toBeInTheDocument();
      expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/by continuing, you agree to our/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    });

    it('calls signup API when form is submitted with valid data', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null,
      });

      render(<SignupPage />);
      
      // Fill form with valid data
      fireEvent.change(screen.getByLabelText(/full name/i), { 
        target: { value: 'John Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/email/i), { 
        target: { value: 'john@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/^password/i), { 
        target: { value: 'StrongPass123' } 
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { 
        target: { value: 'StrongPass123' } 
      });
      
      // Wait for form to be valid and submit
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'StrongPass123',
        });
      });
    });
  });

  describe('LoginPage', () => {
    it('renders login form correctly', () => {
      render(<LoginPage />);
      
      expect(screen.getByText('Sign in to Benefitiary')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      // Use type attribute to distinguish the email form submit button
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByText(/by continuing, you agree to our/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    });

    it('calls signin API when form is submitted', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null,
      });

      render(<LoginPage />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/email/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'password123' } 
      });
      
      // Wait for form to be valid and submit
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign In' });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('redirects to dashboard on successful login', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null,
      });

      render(<LoginPage />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'password123' } 
      });
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign In' });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles authentication errors', async () => {
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      render(<LoginPage />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/email/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'wrongpassword' } 
      });
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign In' });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('has Google OAuth button that triggers social sign in', () => {
      render(<LoginPage />);
      
      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      
      expect(googleButton).toBeInTheDocument();
      expect(googleButton).not.toBeDisabled();
    });
  });
});