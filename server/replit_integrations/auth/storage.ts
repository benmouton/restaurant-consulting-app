import { users, type User, type UpsertUser, type UserRole } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Admin emails that automatically get admin access
const ADMIN_EMAILS = [
  "benmouton@gmail.com",
  "rick@saucedwingbar.com",
  "alysha.r.wilson@gmail.com",
];

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, firstName: string, restaurantName: string, role?: UserRole): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Automatically set admin status for designated admin emails
    const isAdminEmail = userData.email && ADMIN_EMAILS.includes(userData.email.toLowerCase());
    const dataToInsert = {
      ...userData,
      isAdmin: isAdminEmail ? "true" : userData.isAdmin,
    };
    
    const [user] = await db
      .insert(users)
      .values(dataToInsert)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...dataToInsert,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, firstName: string, restaurantName: string, role?: UserRole): Promise<User> {
    const updateData: Record<string, unknown> = {
      firstName,
      restaurantName,
      updatedAt: new Date(),
    };
    if (role) {
      updateData.role = role;
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
