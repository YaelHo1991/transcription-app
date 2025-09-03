import { db } from '../db/connection';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  full_name?: string;
  permissions: string;
  personal_company?: string;
  business_company?: string;
  transcriber_code?: string;
  reset_token?: string | null;
  reset_token_expires?: Date | null;
  created_at: Date;
  last_login: Date | null;
  is_active: boolean;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  email: string;
  permissions?: string;
}

export class UserModel {
  // Find user by username
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE username = $1 AND is_active = true',
        [username]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Create new user
  static async create(userData: CreateUserDTO): Promise<User> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const result = await db.query(
        `INSERT INTO users (username, password, email, permissions) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.username, hashedPassword, userData.email, userData.permissions || '']
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(user: any, password: string): Promise<boolean> {
    try {
      // In development mode, check plain_password first if it exists
      if (process.env.NODE_ENV === 'development' && user.plain_password) {
        if (password === user.plain_password) {
          return true;
        }
      }
      
      // Also check if password is stored as plain text (for dev)
      if (user.password === password) {
        return true;
      }
      
      // Otherwise check hashed password
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // Get all users (for dev tools)
  static async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.query(
        'SELECT id, username, email, permissions, created_at, last_login, is_active FROM users WHERE is_active = true ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Update user permissions
  static async updatePermissions(id: string, permissions: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET permissions = $1 WHERE id = $2',
        [permissions, id]
      );
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
    }
  }

  // Deactivate user (soft delete)
  static async deactivate(id: string): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [id]
      );
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Check if username exists
  static async usernameExists(username: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM users WHERE username = $1',
        [username]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking username:', error);
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM users WHERE email = $1',
        [email]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  }

  // Generate secure reset token
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Set password reset token
  static async setResetToken(email: string, token: string, expiresAt: Date): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 AND is_active = true',
        [token, expiresAt, email]
      );
      return result.rowCount && result.rowCount > 0;
    } catch (error) {
      console.error('Error setting reset token:', error);
      throw error;
    }
  }

  // Find user by reset token
  static async findByResetToken(token: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW() AND is_active = true',
        [token]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      throw error;
    }
  }

  // Reset password and clear token
  static async resetPassword(token: string, hashedPassword: string): Promise<boolean> {
    try {
      const result = await db.query(
        'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2 AND reset_token_expires > NOW() AND is_active = true',
        [hashedPassword, token]
      );
      return result.rowCount && result.rowCount > 0;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Clear expired reset tokens (cleanup method)
  static async clearExpiredResetTokens(): Promise<void> {
    try {
      await db.query(
        'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE reset_token_expires < NOW()'
      );
    } catch (error) {
      console.error('Error clearing expired reset tokens:', error);
      throw error;
    }
  }
}