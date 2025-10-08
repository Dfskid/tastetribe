import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from '@/lib/services/admin';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      })
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn()
    }))
  })
}));

describe('AdminService', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
  });

  describe('isAdmin', () => {
    it('should return true for admin users', async () => {
      const supabase = (adminService as any).supabase;
      supabase.rpc.mockResolvedValue({ data: true });

      const result = await adminService.isAdmin('admin-user-id');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('is_admin', {
        check_user_id: 'admin-user-id'
      });
    });

    it('should return false for non-admin users', async () => {
      const supabase = (adminService as any).supabase;
      supabase.rpc.mockResolvedValue({ data: false });

      const result = await adminService.isAdmin('regular-user-id');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const supabase = (adminService as any).supabase;
      supabase.rpc.mockRejectedValue(new Error('Database error'));

      const result = await adminService.isAdmin('user-id');

      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has required role', async () => {
      const supabase = (adminService as any).supabase;
      supabase.rpc.mockResolvedValue({ data: true });

      const result = await adminService.hasRole('super_admin', 'user-id');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('has_admin_role', {
        required_role: 'super_admin',
        check_user_id: 'user-id'
      });
    });

    it('should return false when user lacks required role', async () => {
      const supabase = (adminService as any).supabase;
      supabase.rpc.mockResolvedValue({ data: false });

      const result = await adminService.hasRole('super_admin', 'user-id');

      expect(result).toBe(false);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const mockCategory = {
        id: 'cat-123',
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
        icon: 'test-icon',
        active: true,
        recommendation_config: {
          algorithm: 'collaborative_filtering',
          weights: { friend_similarity: 0.5 },
          min_ratings: 3
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const supabase = (adminService as any).supabase;
      const mockSingle = vi.fn().mockResolvedValue({ data: mockCategory, error: null });
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: mockSingle
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await adminService.createCategory({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test description',
        icon: 'test-icon',
        active: true,
        recommendation_config: {
          algorithm: 'collaborative_filtering',
          weights: { friend_similarity: 0.5 },
          min_ratings: 3
        }
      });

      expect(result).toEqual(mockCategory);
    });

    it('should throw error on database failure', async () => {
      const supabase = (adminService as any).supabase;
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: mockSingle
      };
      supabase.from.mockReturnValue(mockChain);

      await expect(
        adminService.createCategory({
          name: 'Test',
          slug: 'test',
          description: '',
          icon: '',
          active: true,
          recommendation_config: {
            algorithm: 'collaborative_filtering',
            weights: {},
            min_ratings: 3
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('bulkCreateItems', () => {
    it('should create multiple items in bulk', async () => {
      const items = [
        {
          category: 'movies',
          name: 'Test Movie 1',
          attributes: { year: 2025 }
        },
        {
          category: 'movies',
          name: 'Test Movie 2',
          attributes: { year: 2024 }
        }
      ];

      const supabase = (adminService as any).supabase;
      const mockSelect = vi.fn().mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }],
        error: null
      });
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: mockSelect
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await adminService.bulkCreateItems(items);

      expect(result).toBe(2);
    });

    it('should handle empty array', async () => {
      const supabase = (adminService as any).supabase;
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: mockSelect
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await adminService.bulkCreateItems([]);

      expect(result).toBe(0);
    });
  });

  describe('getAdminAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const supabase = (adminService as any).supabase;

      // Mock the from() method to return different chains for each call
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // profiles
          return {
            select: vi.fn().mockResolvedValue({ count: 1000, error: null })
          };
        } else if (callCount === 2) {
          // user_subscriptions
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 250, error: null })
          };
        } else if (callCount === 3) {
          // payment_history
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { amount: 9900 },
                { amount: 4900 },
                { amount: 9900 }
              ],
              error: null
            })
          };
        } else if (callCount === 4) {
          // categories
          return {
            select: vi.fn().mockResolvedValue({ count: 4, error: null })
          };
        } else if (callCount === 5) {
          // items
          return {
            select: vi.fn().mockResolvedValue({ count: 5000, error: null })
          };
        } else {
          // ratings
          return {
            select: vi.fn().mockResolvedValue({ count: 12000, error: null })
          };
        }
      });

      const result = await adminService.getAdminAnalytics();

      expect(result).toEqual({
        totalUsers: 1000,
        activeSubscriptions: 250,
        totalRevenue: 24700,
        categoriesCount: 4,
        itemsCount: 5000,
        ratingsCount: 12000
      });
    });
  });
});
