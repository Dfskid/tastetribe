# TasteTribe Advanced Features Deployment Guide

## Overview

This guide covers deployment of TasteTribe's advanced features including admin dashboard, TMDB integration, Stripe payments, enhanced recommendations, A/B testing, and caching infrastructure.

---

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account** (for hosting)
2. **Supabase Project** (already configured)
3. **Stripe Account** (for payments)
4. **TMDB API Key** (for movie/TV data)
5. **Domain Name** (optional, for production)

---

## Step 1: Environment Configuration

### 1.1 Obtain Required API Keys

#### Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret Key** (starts with `sk_test_` for test mode)
3. Create webhook endpoint and copy **Webhook Secret** (starts with `whsec_`)

#### TMDB API Key

1. Create account at [TMDB](https://www.themoviedb.org/)
2. Go to [API Settings](https://www.themoviedb.org/settings/api)
3. Request an API key (free for non-commercial use)
4. Copy your **API Key (v3 auth)**

#### Supabase Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (keep this secret!)

### 1.2 Update Environment Variables

Update your `.env` file:

```bash
# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# NEW: Add these variables
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
TMDB_API_KEY=your_tmdb_api_key_here
```

---

## Step 2: Database Setup

### 2.1 Run New Migrations

The advanced features require a new database migration. Run:

```bash
# Migration already applied during development
# Verify it exists in Supabase Dashboard > Database > Migrations
```

The migration creates:
- `admin_roles` - Admin user management
- `subscription_tiers` - Payment plans
- `user_subscriptions` - User subscription tracking
- `payment_history` - Payment transaction log
- `categories` - Content category management
- `ab_tests` - A/B testing framework
- `ab_test_assignments` - User test assignments
- `recommendation_performance` - Algorithm performance tracking

### 2.2 Create Admin Users

Grant admin access to your user:

```sql
-- In Supabase SQL Editor
INSERT INTO admin_roles (user_id, role, created_by)
VALUES (
  'your-user-id-here',  -- Replace with your actual user ID
  'super_admin',
  'your-user-id-here'
);
```

To find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

---

## Step 3: Stripe Configuration

### 3.1 Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create products for each tier:

**Basic Tier:**
- Name: "TasteTribe Basic"
- Monthly Price: $4.99
- Yearly Price: $49.90
- Copy the Price IDs

**Premium Tier:**
- Name: "TasteTribe Premium"
- Monthly Price: $9.99
- Yearly Price: $99.90
- Copy the Price IDs

**Enterprise Tier:**
- Name: "TasteTribe Enterprise"
- Monthly Price: $49.99
- Yearly Price: $499.90
- Copy the Price IDs

### 3.2 Update Subscription Tiers

Run in Supabase SQL Editor:

```sql
UPDATE subscription_tiers
SET stripe_price_id_monthly = 'price_xxx_monthly',
    stripe_price_id_yearly = 'price_xxx_yearly'
WHERE name = 'basic';

UPDATE subscription_tiers
SET stripe_price_id_monthly = 'price_yyy_monthly',
    stripe_price_id_yearly = 'price_yyy_yearly'
WHERE name = 'premium';

UPDATE subscription_tiers
SET stripe_price_id_monthly = 'price_zzz_monthly',
    stripe_price_id_yearly = 'price_zzz_yearly'
WHERE name = 'enterprise';
```

### 3.3 Configure Webhook Endpoint

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Update `STRIPE_WEBHOOK_SECRET` in your environment variables

---

## Step 4: Deploy to Vercel

### 4.1 Connect Repository

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### 4.2 Configure Environment Variables

Add all environment variables to Vercel:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add TMDB_API_KEY
```

Or add them via Vercel Dashboard:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable for Production, Preview, and Development

### 4.3 Deploy

```bash
# Deploy to production
vercel --prod
```

---

## Step 5: Seed Initial Data

### 5.1 Seed Movies from TMDB

Use the admin API to populate movies:

```bash
# Get your admin access token from Supabase
# Then make API request

curl -X POST https://your-domain.com/api/admin/seed-tmdb \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "movies",
    "maxPages": 10
  }'
```

### 5.2 Seed TV Shows

```bash
curl -X POST https://your-domain.com/api/admin/seed-tmdb \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tv_shows",
    "maxPages": 10
  }'
```

Expected response:
```json
{
  "success": true,
  "totalFetched": 200,
  "totalInserted": 198,
  "type": "movies"
}
```

---

## Step 6: Testing

### 6.1 Test Admin Dashboard

1. Sign in with your admin account
2. Navigate to `/admin` (you'll need to create this page)
3. Verify you can:
   - View analytics dashboard
   - Create/edit categories
   - Manage A/B tests

### 6.2 Test Stripe Integration

1. Use Stripe test card: `4242 4242 4242 4242`
2. Any future expiration date
3. Any 3-digit CVC
4. Navigate to subscription page
5. Complete checkout flow
6. Verify webhook events in Stripe Dashboard
7. Check `user_subscriptions` table in Supabase

### 6.3 Test Recommendations

```bash
# Test collaborative filtering
curl https://your-domain.com/api/recommendations?category=movies&userId=test-user-id

# Test A/B testing
# Create test, assign users, compare performance
```

### 6.4 Run Load Tests

```bash
# Run load tests locally
npm run test tests/load/load-test.ts

# Or run manual tests
TEST_URL=https://your-domain.com npm run test tests/load/load-test.ts
```

---

## Step 7: Monitoring Setup

### 7.1 Set Up Error Tracking

Monitor errors via:
1. Vercel Dashboard → Analytics → Errors
2. Custom error logging in `/api/log-error`

### 7.2 Monitor Performance

Track key metrics:
```sql
-- Daily KPIs
SELECT * FROM daily_kpis
ORDER BY date DESC
LIMIT 30;

-- Recommendation performance
SELECT
  category,
  algorithm_version,
  AVG(avg_rating) as avg_rating,
  SUM(recommendations_clicked) / SUM(recommendations_shown)::float as ctr
FROM recommendation_performance
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY category, algorithm_version;

-- Subscription revenue
SELECT
  COUNT(*) as active_subscriptions,
  SUM(st.price_monthly) as mrr
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.status = 'active';
```

### 7.3 Set Up Alerts

Configure alerts for:
- Error rate > 5%
- Response time > 2000ms
- Failed payments
- Subscription churns

---

## Step 8: Production Readiness Checklist

### Security

- [ ] All environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Stripe webhook signature verification working
- [ ] RLS policies tested
- [ ] Admin endpoints protected

### Performance

- [ ] Caching enabled for recommendations
- [ ] Database indexes created
- [ ] API response times < 500ms (p95)
- [ ] Load test passed (1000+ concurrent users)

### Monitoring

- [ ] Error tracking configured
- [ ] Analytics dashboard working
- [ ] KPI tracking active
- [ ] Webhook monitoring enabled

### Data

- [ ] Initial content seeded (movies, TV shows)
- [ ] Categories configured
- [ ] Subscription tiers set up
- [ ] Admin users created

### Testing

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Stripe test payments working
- [ ] TMDB API integration working
- [ ] Recommendations generating correctly

---

## Step 9: Going Live

### 9.1 Switch Stripe to Live Mode

1. Go to Stripe Dashboard
2. Toggle from "Test mode" to "Live mode"
3. Copy live API keys
4. Update environment variables:
   - `STRIPE_SECRET_KEY=sk_live_...`
5. Create new webhook endpoint for production
6. Update `STRIPE_WEBHOOK_SECRET`

### 9.2 Update TMDB API

Ensure TMDB API key is approved for production use:
1. Request production access if needed
2. Monitor rate limits (40 requests per 10 seconds)

### 9.3 Final Deployment

```bash
# Update production environment variables
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

# Deploy to production
vercel --prod
```

---

## Troubleshooting

### Stripe Webhook Not Working

**Symptoms:** Subscriptions not updating after payment

**Solutions:**
1. Verify webhook endpoint URL is correct
2. Check webhook signing secret matches
3. View webhook logs in Stripe Dashboard
4. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

### TMDB API Rate Limit

**Symptoms:** 429 Too Many Requests errors

**Solutions:**
1. Implement exponential backoff
2. Reduce `maxPages` parameter
3. Add delays between requests (already implemented)
4. Cache TMDB responses

### Recommendation Engine Not Working

**Symptoms:** Empty or poor recommendations

**Solutions:**
1. Verify users have rated items
2. Check category configuration
3. Review algorithm weights
4. Test with mock data
5. Check cache invalidation

### Admin Dashboard Access Denied

**Symptoms:** 403 Forbidden on admin endpoints

**Solutions:**
1. Verify user has admin role in database
2. Check authorization header format
3. Test RLS policies:
   ```sql
   SELECT is_admin('your-user-id');
   SELECT has_admin_role('super_admin', 'your-user-id');
   ```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check webhook delivery
- Review payment failures

**Weekly:**
- Analyze recommendation performance
- Review A/B test results
- Check subscription metrics

**Monthly:**
- Database maintenance (VACUUM, ANALYZE)
- Update TMDB content
- Review and optimize slow queries
- Backup critical data

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE items;
VACUUM ANALYZE user_ratings;
VACUUM ANALYZE user_subscriptions;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Scaling Considerations

### When to Scale

Monitor these metrics:
- CPU usage > 70% sustained
- Memory usage > 80%
- Database connections > 80% of pool
- API response time > 1000ms (p95)
- Cache hit rate < 80%

### Scaling Strategies

1. **Horizontal Scaling:**
   - Vercel automatically scales Edge Functions
   - Add read replicas for database
   - Implement Redis for distributed caching

2. **Database Optimization:**
   - Add materialized views for analytics
   - Partition large tables
   - Implement connection pooling

3. **Caching Improvements:**
   - Implement Redis/Memcached
   - Add CDN for static assets
   - Cache database query results

4. **Code Optimization:**
   - Profile slow queries
   - Optimize recommendation algorithms
   - Implement lazy loading

---

## Support & Resources

### Documentation
- **API Docs:** `/ADMIN_API_DOCUMENTATION.md`
- **Architecture:** `/SYSTEM_ARCHITECTURE.md`
- **Alpha Guide:** `/ALPHA_LAUNCH_GUIDE.md`

### External Resources
- [Stripe Documentation](https://stripe.com/docs)
- [TMDB API Docs](https://developers.themoviedb.org/3)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Getting Help
- Check logs in Vercel Dashboard
- Review Supabase logs
- Test webhooks in Stripe Dashboard
- Use Stripe CLI for local testing

---

**Last Updated:** October 8, 2025
**Version:** 2.0.0
**Status:** Production Ready ✓
