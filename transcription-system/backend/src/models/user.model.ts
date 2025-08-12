import { db } from '../db/connection';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  permissions: string;
  personal_company?: string;
  business_company?: string;
  transcriber_code?: string;
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
  static async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
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
}