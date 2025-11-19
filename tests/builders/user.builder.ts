import { DataUtils } from '../utils/data.utils';

/**
 * Test user data interface
 */
export interface TestUserData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation?: string;
  role?: 'user' | 'admin';
}

/**
 * User Builder
 * Fluent API for creating test users
 */
export class UserBuilder {
  private data: Partial<TestUserData> = {};

  /**
   * Create a new user builder
   */
  static create(): UserBuilder {
    return new UserBuilder();
  }

  /**
   * Set the user name
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Set the email
   */
  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  /**
   * Generate a random email
   */
  withRandomEmail(prefix = 'test'): this {
    this.data.email = DataUtils.generateEmail(prefix);
    return this;
  }

  /**
   * Set the password
   */
  withPassword(password: string): this {
    this.data.password = password;
    this.data.passwordConfirmation = password;
    return this;
  }

  /**
   * Set different password confirmation (for validation testing)
   */
  withPasswordConfirmation(passwordConfirmation: string): this {
    this.data.passwordConfirmation = passwordConfirmation;
    return this;
  }

  /**
   * Set user role to admin
   */
  admin(): this {
    this.data.role = 'admin';
    return this;
  }

  /**
   * Set user role to regular user
   */
  user(): this {
    this.data.role = 'user';
    return this;
  }

  /**
   * Create user with valid data (convenience method)
   */
  valid(): this {
    if (!this.data.name) {
      this.data.name = `Test User ${DataUtils.randomString(6)}`;
    }
    if (!this.data.email) {
      this.data.email = DataUtils.generateEmail('user');
    }
    if (!this.data.password) {
      this.data.password = 'password123';
      this.data.passwordConfirmation = 'password123';
    }
    return this;
  }

  /**
   * Create user with invalid email (for validation testing)
   */
  withInvalidEmail(): this {
    this.data.email = 'invalid-email';
    return this;
  }

  /**
   * Create user with short password (for validation testing)
   */
  withShortPassword(): this {
    this.data.password = '123';
    this.data.passwordConfirmation = '123';
    return this;
  }

  /**
   * Create user with mismatched passwords (for validation testing)
   */
  withMismatchedPasswords(): this {
    this.data.password = 'password123';
    this.data.passwordConfirmation = 'different123';
    return this;
  }

  /**
   * Build the test user data
   */
  build(): TestUserData {
    return {
      name: this.data.name || `Test User ${DataUtils.randomString(6)}`,
      email: this.data.email || DataUtils.generateEmail('user'),
      password: this.data.password || 'password123',
      passwordConfirmation: this.data.passwordConfirmation || this.data.password || 'password123',
      role: this.data.role || 'user'
    };
  }

  /**
   * Build and return registration data (without role)
   */
  buildForRegistration(): Omit<TestUserData, 'role'> {
    const user = this.build();
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      passwordConfirmation: user.passwordConfirmation
    };
  }

  /**
   * Build and return login credentials
   */
  buildForLogin(): { email: string; password: string } {
    const user = this.build();
    return {
      email: user.email,
      password: user.password
    };
  }
}
