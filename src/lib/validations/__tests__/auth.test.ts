import { signUpSchema, signInSchema } from '../auth';

describe('Auth Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('validates a correct signup form', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123',
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid name formats', () => {
      const testCases = [
        { name: 'A', error: 'Name must be at least 2 characters' },
        { name: 'John123', error: 'Name can only contain letters and spaces' },
        { name: 'John@Doe', error: 'Name can only contain letters and spaces' },
        { name: 'A'.repeat(51), error: 'Name must be less than 50 characters' },
      ];

      testCases.forEach(({ name, error }) => {
        const data = {
          name,
          email: 'john@example.com',
          password: 'StrongPass123',
          confirmPassword: 'StrongPass123',
        };

        const result = signUpSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe(error);
        }
      });
    });

    it('rejects invalid email formats', () => {
      const testCases = [
        'invalid-email',
        'test@',
        '@example.com',
        'test.example.com',
        '',
      ];

      testCases.forEach((email) => {
        const data = {
          name: 'John Doe',
          email,
          password: 'StrongPass123',
          confirmPassword: 'StrongPass123',
        };

        const result = signUpSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    it('rejects weak passwords', () => {
      const testCases = [
        { password: 'short', error: 'Password must be at least 8 characters' },
        { password: 'nouppercase123', error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { password: 'NOLOWERCASE123', error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { password: 'NoNumbers', error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
      ];

      testCases.forEach(({ password, error }) => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          password,
          confirmPassword: password,
        };

        const result = signUpSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const passwordError = result.error.issues.find(issue => issue.path.includes('password'));
          expect(passwordError?.message).toBe(error);
        }
      });
    });

    it('rejects mismatched passwords', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass123',
        confirmPassword: 'DifferentPass123',
      };

      const result = signUpSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(issue => issue.path.includes('confirmPassword'));
        expect(confirmError?.message).toBe('Passwords do not match');
      }
    });

    it('accepts strong passwords', () => {
      const strongPasswords = [
        'StrongPass123',
        'MySecure1Password',
        'Complex123Pass',
        'Secure2024!',
      ];

      strongPasswords.forEach((password) => {
        const data = {
          name: 'John Doe',
          email: 'john@example.com',
          password,
          confirmPassword: password,
        };

        const result = signUpSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('signInSchema', () => {
    it('validates a correct signin form', () => {
      const validData = {
        email: 'john@example.com',
        password: 'anypassword',
      };

      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const data = {
        email: '',
        password: 'password',
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod email validation triggers format error for empty string
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects invalid email format', () => {
      const data = {
        email: 'invalid-email',
        password: 'password',
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects empty password', () => {
      const data = {
        email: 'john@example.com',
        password: '',
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('accepts any non-empty password for signin', () => {
      // For signin, we don't validate password strength
      const passwords = ['weak', 'short', 'StrongPass123'];

      passwords.forEach((password) => {
        const data = {
          email: 'john@example.com',
          password,
        };

        const result = signInSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});