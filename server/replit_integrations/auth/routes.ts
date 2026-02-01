import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { USER_ROLES, type UserRole } from "@shared/models/auth";

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
  role: z.enum([USER_ROLES.OWNER, USER_ROLES.GENERAL_MANAGER, USER_ROLES.MANAGER]).optional(),
});

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile (name and restaurant name)
  app.patch("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = updateProfileSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { firstName, phone, restaurantName, role } = result.data;
      
      // Security: Only allow role to be set during initial onboarding (when restaurantName is not yet set)
      // After onboarding, role changes are restricted to prevent privilege escalation
      const currentUser = await authStorage.getUser(userId);
      const allowedRole = !currentUser?.restaurantName ? (role as UserRole | undefined) : undefined;
      
      const updatedUser = await authStorage.updateUserProfile(userId, firstName, phone, restaurantName, allowedRole);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
}
