import { createClient } from '@/lib/supabase/client';

export interface AdminRole {
  id: string;
  user_id: string;
  role: 'super_admin' | 'content_manager' | 'analyst';
  permissions: Record<string, boolean>;
  created_at: string;
  created_by: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  recommendation_config: {
    algorithm: string;
    weights: Record<string, number>;
    min_ratings: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ABTest {
  id: string;
  name: string;
  category: string;
  variants: Array<{
    name: string;
    config: Record<string, any>;
    traffic_percentage: number;
  }>;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export class AdminService {
  private supabase = createClient();

  async isAdmin(userId?: string): Promise<boolean> {
    try {
      const uid = userId || (await this.supabase.auth.getUser()).data.user?.id;
      if (!uid) return false;

      const { data } = await this.supabase
        .rpc('is_admin', { check_user_id: uid });

      return data === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async hasRole(role: string, userId?: string): Promise<boolean> {
    try {
      const uid = userId || (await this.supabase.auth.getUser()).data.user?.id;
      if (!uid) return false;

      const { data } = await this.supabase
        .rpc('has_admin_role', { required_role: role, check_user_id: uid });

      return data === true;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }

  async getAdminRoles(): Promise<AdminRole[]> {
    const { data, error } = await this.supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async grantAdminRole(
    userId: string,
    role: 'super_admin' | 'content_manager' | 'analyst',
    permissions: Record<string, boolean> = {}
  ): Promise<AdminRole> {
    const currentUser = (await this.supabase.auth.getUser()).data.user;

    const { data, error } = await this.supabase
      .from('admin_roles')
      .insert({
        user_id: userId,
        role,
        permissions,
        created_by: currentUser?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async revokeAdminRole(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_roles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getAllCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCategory(slug: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getABTests(): Promise<ABTest[]> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createABTest(test: Omit<ABTest, 'id' | 'created_at' | 'updated_at'>): Promise<ABTest> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .insert(test)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateABTest(id: string, updates: Partial<ABTest>): Promise<ABTest> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteABTest(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('ab_tests')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async assignUserToTest(testId: string, userId: string, variant: string): Promise<void> {
    const { error } = await this.supabase
      .from('ab_test_assignments')
      .insert({
        test_id: testId,
        user_id: userId,
        variant
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }

  async getUserTestVariant(testId: string, userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('ab_test_assignments')
      .select('variant')
      .eq('test_id', testId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.variant || null;
  }

  async trackRecommendationPerformance(params: {
    category: string;
    algorithmVersion: string;
    variant?: string;
    shown?: number;
    clicked?: number;
    rated?: number;
    avgRating?: number;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await this.supabase
      .from('recommendation_performance')
      .upsert({
        category: params.category,
        algorithm_version: params.algorithmVersion,
        variant: params.variant || null,
        date: today,
        recommendations_shown: params.shown || 0,
        recommendations_clicked: params.clicked || 0,
        recommendations_rated: params.rated || 0,
        avg_rating: params.avgRating || null
      }, {
        onConflict: 'category,algorithm_version,variant,date',
        ignoreDuplicates: false
      });

    if (error) throw error;
  }

  async getRecommendationPerformance(
    category: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('recommendation_performance')
      .select('*')
      .eq('category', category)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async bulkCreateItems(items: Array<{
    category: string;
    name: string;
    attributes: Record<string, any>;
  }>): Promise<number> {
    const currentUser = (await this.supabase.auth.getUser()).data.user;

    const itemsWithCreator = items.map(item => ({
      ...item,
      created_by: currentUser?.id
    }));

    const { data, error } = await this.supabase
      .from('items')
      .insert(itemsWithCreator)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  async getAdminAnalytics(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    categoriesCount: number;
    itemsCount: number;
    ratingsCount: number;
  }> {
    const [users, subscriptions, payments, categories, items, ratings] = await Promise.all([
      this.supabase.from('profiles').select('id', { count: 'exact', head: true }),
      this.supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      this.supabase.from('payment_history').select('amount').eq('status', 'succeeded'),
      this.supabase.from('categories').select('id', { count: 'exact', head: true }),
      this.supabase.from('items').select('id', { count: 'exact', head: true }),
      this.supabase.from('user_ratings').select('id', { count: 'exact', head: true })
    ]);

    const totalRevenue = payments.data?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return {
      totalUsers: users.count || 0,
      activeSubscriptions: subscriptions.count || 0,
      totalRevenue,
      categoriesCount: categories.count || 0,
      itemsCount: items.count || 0,
      ratingsCount: ratings.count || 0
    };
  }
}

export const adminService = new AdminService();
