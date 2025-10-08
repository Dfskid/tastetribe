# TasteTribe System Architecture

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Recommendation Engine](#recommendation-engine)
7. [Authentication & Authorization](#authentication--authorization)
8. [Payment Processing](#payment-processing)
9. [Caching Strategy](#caching-strategy)
10. [Scalability & Performance](#scalability--performance)
11. [Security](#security)
12. [Monitoring & Analytics](#monitoring--analytics)
13. [Deployment Architecture](#deployment-architecture)

---

## Overview

TasteTribe is a multi-category social recommendation platform built on a modern, scalable architecture. The system supports restaurants, movies, TV shows, travel destinations, and is extensible to additional categories.

### Key Features

- Multi-category content management
- Advanced recommendation algorithms (collaborative filtering, content-based, hybrid)
- Social networking features
- Subscription-based monetization
- Admin dashboard with analytics
- A/B testing framework
- TMDB API integration for movies/TV shows
- Stripe payment processing

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │         │
│  │  (Next.js)   │  │   (Future)   │  │  (Next.js)   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          Next.js API Routes + Middleware                │    │
│  │  • Authentication  • Rate Limiting  • Validation        │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Admin       │  │  Recommend   │  │  Stripe      │         │
│  │  Service     │  │  Engine      │  │  Service     │         │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤         │
│  │  TMDB        │  │  Social      │  │  Analytics   │         │
│  │  Service     │  │  Service     │  │  Service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Supabase (PostgreSQL)                      │    │
│  │  • Auth  • Database  • RLS  • Real-time                │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            In-Memory Cache                              │    │
│  │  • Recommendations  • User Data  • Categories          │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Stripe      │  │  TMDB API    │  │  Email       │         │
│  │  Payments    │  │  (Movies/TV) │  │  Service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **State Management:** React Context + Hooks
- **Form Handling:** React Hook Form + Zod validation

### Backend

- **Runtime:** Node.js
- **Framework:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **ORM:** Supabase Client
- **Validation:** Zod

### Infrastructure

- **Hosting:** Vercel
- **Database:** Supabase (Managed PostgreSQL)
- **Payments:** Stripe
- **External APIs:** TMDB (The Movie Database)
- **Caching:** In-Memory (Node.js Map)

### Development Tools

- **Testing:** Vitest
- **Linting:** ESLint
- **Type Checking:** TypeScript
- **Package Manager:** npm

---

## Database Schema

### Core Tables

#### profiles
```sql
- id (uuid, PK, FK to auth.users)
- display_name (text)
- avatar_url (text)
- onboarding_completed (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### items
```sql
- id (uuid, PK)
- category (text) -- 'restaurants', 'movies', 'tv_shows', 'travel'
- name (text)
- attributes (jsonb) -- Flexible category-specific data
- created_by (uuid, FK to profiles)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### user_ratings
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- item_id (uuid, FK to items)
- rating (integer, 1-5)
- review (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE(user_id, item_id)
```

### Social Tables

#### friendships
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- friend_id (uuid, FK to profiles)
- status (text) -- 'pending', 'accepted', 'rejected', 'blocked'
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### activity_feed
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- activity_type (text) -- 'rating', 'favorite', 'friend_joined'
- item_id (uuid, FK to items, nullable)
- metadata (jsonb)
- created_at (timestamptz)
```

### Admin Tables

#### admin_roles
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles, UNIQUE)
- role (text) -- 'super_admin', 'content_manager', 'analyst'
- permissions (jsonb)
- created_at (timestamptz)
- created_by (uuid, FK to profiles)
```

#### categories
```sql
- id (uuid, PK)
- name (text, UNIQUE)
- slug (text, UNIQUE)
- description (text)
- icon (text)
- active (boolean)
- recommendation_config (jsonb)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### ab_tests
```sql
- id (uuid, PK)
- name (text)
- category (text)
- variants (jsonb) -- Array of variant configurations
- active (boolean)
- start_date (timestamptz)
- end_date (timestamptz)
- created_at (timestamptz)
```

### Subscription Tables

#### subscription_tiers
```sql
- id (uuid, PK)
- name (text, UNIQUE) -- 'free', 'basic', 'premium', 'enterprise'
- price_monthly (integer) -- cents
- price_yearly (integer) -- cents
- features (jsonb)
- stripe_price_id_monthly (text)
- stripe_price_id_yearly (text)
- active (boolean)
- created_at (timestamptz)
```

#### user_subscriptions
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles, UNIQUE)
- tier_id (uuid, FK to subscription_tiers)
- status (text) -- 'active', 'canceled', 'past_due', 'trialing'
- stripe_customer_id (text)
- stripe_subscription_id (text)
- current_period_start (timestamptz)
- current_period_end (timestamptz)
- cancel_at_period_end (boolean)
- created_at (timestamptz)
```

#### payment_history
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- stripe_payment_id (text, UNIQUE)
- amount (integer)
- currency (text)
- status (text) -- 'succeeded', 'failed', 'pending', 'refunded'
- description (text)
- created_at (timestamptz)
```

### Analytics Tables

#### user_events
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- event_type (text)
- event_data (jsonb)
- created_at (timestamptz)
```

#### recommendation_performance
```sql
- id (uuid, PK)
- category (text)
- algorithm_version (text)
- variant (text, nullable)
- recommendations_shown (integer)
- recommendations_clicked (integer)
- recommendations_rated (integer)
- avg_rating (numeric)
- date (date)
- created_at (timestamptz)
- UNIQUE(category, algorithm_version, variant, date)
```

---

## API Architecture

### Authentication Flow

```
1. User submits credentials to Supabase Auth
2. Supabase returns access_token and refresh_token
3. Client stores tokens securely
4. Client includes Bearer token in all API requests
5. Middleware validates token and extracts user context
6. RLS policies enforce data access rules
```

### API Route Structure

```
/api
├── /admin
│   ├── /categories (GET, POST)
│   ├── /categories/[id] (PATCH, DELETE)
│   ├── /seed-tmdb (POST)
│   ├── /analytics (GET)
│   └── /ab-tests (GET, POST, PATCH, DELETE)
├── /stripe
│   ├── /checkout (POST)
│   ├── /portal (POST)
│   └── /webhook (POST)
├── /partner
│   └── /restaurants (GET, POST, PATCH, DELETE)
└── /webhooks
    └── /partner (POST)
```

### Middleware Chain

```
Request → Auth Middleware → Rate Limit Middleware →
Validation Middleware → Handler → Response
```

---

## Recommendation Engine

### Algorithm Types

#### 1. Collaborative Filtering
Used for: Restaurants, general recommendations

**Weights:**
- Friend Similarity: 40%
- Popularity: 30%
- Recency: 20%
- Taste Profile: 10%

**Process:**
1. Find similar users (friends + taste similarity)
2. Aggregate ratings from similar users
3. Calculate weighted scores
4. Filter by minimum rating threshold
5. Sort and return top N items

#### 2. Content-Based Filtering
Used for: Movies, TV Shows

**Weights:**
- Genre Match: 35%
- Ratings: 25%
- Friend Similarity: 25%
- Recency: 15%

**Process:**
1. Extract user's favorite genres from past ratings
2. Calculate genre similarity for each item
3. Weight by average rating and friend preferences
4. Apply recency boost
5. Return personalized recommendations

#### 3. Hybrid Filtering
Combines collaborative and content-based

**Process:**
1. Generate recommendations from both algorithms
2. Normalize scores to 0-1 range
3. Combine with 50/50 weighting
4. Deduplicate and sort by combined score

#### 4. Location-Based Filtering
Used for: Restaurants, Travel

**Weights:**
- Friend Similarity: 35%
- Location Proximity: 30%
- Ratings: 20%
- Season/Time: 15%

### A/B Testing Integration

1. Check if user has active test assignment
2. If no assignment, randomly assign based on traffic percentages
3. Apply test variant's algorithm configuration
4. Track performance metrics for variant
5. Compare variants to determine winner

### Caching Strategy

```typescript
// Cache key format
recommendations:{userId}:{category}:{filters}

// TTL: 10 minutes (600 seconds)
// Invalidation triggers:
// - User rates new item
// - User adds friend
// - Category config changes
```

---

## Authentication & Authorization

### User Authentication (Supabase Auth)

```
Sign Up → Email Verification (optional) → Profile Creation
                                                ↓
Sign In → Access Token + Refresh Token → Authenticated Session
```

### Admin Authorization

**Role Hierarchy:**
1. **super_admin**: Full system access
2. **content_manager**: Manage categories, seed content
3. **analyst**: View analytics, manage A/B tests

**Permission Check Flow:**
```
Request → Extract Token → Verify User →
Check Admin Role → Validate Required Role → Allow/Deny
```

### Row-Level Security (RLS)

All tables have RLS policies enforcing:
- Users can only access their own data
- Public read access for non-sensitive data
- Admin bypass for management operations
- Friend-based access for social features

---

## Payment Processing

### Stripe Integration Flow

#### Subscription Creation
```
1. User selects subscription tier
2. Frontend calls /api/stripe/checkout
3. Backend creates Stripe Checkout Session
4. User redirected to Stripe payment page
5. User completes payment
6. Stripe webhook notifies backend
7. Backend updates user_subscriptions table
8. User redirected to success page
```

#### Webhook Event Handling

**Supported Events:**
- `checkout.session.completed`: Create subscription record
- `customer.subscription.updated`: Update subscription status
- `customer.subscription.deleted`: Downgrade to free tier
- `invoice.payment_succeeded`: Record payment, activate subscription
- `invoice.payment_failed`: Mark subscription as past_due

**Security:**
- Webhook signature verification using Stripe secret
- Idempotency handling for duplicate events
- Transaction-safe database updates

---

## Caching Strategy

### Cache Layers

#### 1. Application Cache (In-Memory)

**Recommendation Cache:**
- TTL: 10 minutes
- Key Format: `recommendations:{userId}:{category}`
- Invalidation: On user rating, friend addition

**User Cache:**
- TTL: 5 minutes
- Key Format: `user:{userId}:{dataType}`
- Invalidation: On profile update

**Category Cache:**
- TTL: 30 minutes
- Key Format: `category:{slug}`
- Invalidation: On category update

#### 2. Supabase Cache

**Database Query Cache:**
- Automatic caching for RLS-filtered queries
- Cache warming on first access
- Stale-while-revalidate pattern

### Cache Invalidation Patterns

```typescript
// Pattern-based invalidation
invalidatePattern('recommendations:user-123:.*');

// Cascade invalidation
onUserRating → invalidate user recommendations
onFriendAdded → invalidate both users' recommendations
onCategoryUpdate → invalidate all recommendations for category
```

---

## Scalability & Performance

### Current Capacity

- **Users:** 10,000+ concurrent
- **Requests:** 1,000+ req/sec
- **Database:** PostgreSQL with connection pooling
- **Cache:** In-memory with LRU eviction

### Horizontal Scaling Strategy

```
Load Balancer (Vercel)
    ├── App Instance 1
    ├── App Instance 2
    ├── App Instance 3
    └── App Instance N

Shared Resources:
    ├── Supabase (Managed PostgreSQL)
    └── Redis (Future: Distributed cache)
```

### Performance Optimizations

1. **Database Indexing:**
   - B-tree indexes on foreign keys
   - GIN indexes for full-text search
   - Composite indexes for common queries

2. **Query Optimization:**
   - Select only required columns
   - Use pagination for large result sets
   - Implement query result caching

3. **Asset Optimization:**
   - Next.js automatic code splitting
   - Image optimization via Next/Image
   - Lazy loading for below-fold content

4. **API Rate Limiting:**
   - Per-user rate limits
   - Per-endpoint rate limits
   - Exponential backoff for retries

---

## Security

### Application Security

1. **Authentication:**
   - JWT-based authentication
   - Secure token storage
   - Automatic token refresh

2. **Authorization:**
   - Role-based access control (RBAC)
   - Row-level security (RLS)
   - API endpoint protection

3. **Data Protection:**
   - Input validation (Zod schemas)
   - XSS prevention (sanitization)
   - SQL injection prevention (parameterized queries)
   - CSRF protection (SameSite cookies)

4. **API Security:**
   - Rate limiting
   - Request size limits
   - CORS configuration
   - Webhook signature verification

### Infrastructure Security

1. **Network Security:**
   - HTTPS only (TLS 1.3)
   - Security headers (CSP, HSTS, X-Frame-Options)
   - DDoS protection (Vercel/Cloudflare)

2. **Data Security:**
   - Encrypted at rest (Supabase)
   - Encrypted in transit (TLS)
   - Regular backups
   - PII data minimization

3. **Secrets Management:**
   - Environment variables
   - No hardcoded credentials
   - Separate keys per environment

---

## Monitoring & Analytics

### Application Monitoring

1. **Error Tracking:**
   - Client-side error boundary
   - Server-side error logging
   - Error aggregation and alerting

2. **Performance Monitoring:**
   - API response times
   - Database query performance
   - Cache hit rates
   - Page load times

3. **User Analytics:**
   - Event tracking (ratings, favorites, shares)
   - Funnel analysis
   - Retention cohorts
   - Viral coefficient

### Business Metrics

1. **User Metrics:**
   - Daily/Monthly Active Users (DAU/MAU)
   - User retention rates
   - Onboarding completion rate

2. **Engagement Metrics:**
   - Ratings per user
   - Friend connections
   - Content interactions

3. **Revenue Metrics:**
   - Monthly Recurring Revenue (MRR)
   - Customer Lifetime Value (LTV)
   - Churn rate
   - Conversion rate

---

## Deployment Architecture

### Environments

1. **Development:**
   - Local development server
   - Development Supabase instance
   - Stripe test mode

2. **Staging:**
   - Vercel preview deployments
   - Staging Supabase instance
   - Stripe test mode

3. **Production:**
   - Vercel production deployment
   - Production Supabase instance
   - Stripe live mode

### CI/CD Pipeline

```
Code Push → GitHub
    ↓
Automated Tests (Vitest)
    ↓
Type Checking (TypeScript)
    ↓
Linting (ESLint)
    ↓
Build (Next.js)
    ↓
Deploy to Vercel
    ↓
Database Migrations (Supabase)
    ↓
Health Checks
    ↓
Production Live ✓
```

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TMDB_API_KEY`

**Optional:**
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `RESEND_API_KEY`

---

## Future Enhancements

### Phase 2 (Q1 2026)

1. **Mobile Apps:**
   - React Native iOS/Android apps
   - Push notifications
   - Offline support

2. **Advanced Features:**
   - AI-powered recommendations (OpenAI integration)
   - Image recognition for food photos
   - Voice search

3. **Infrastructure:**
   - Redis distributed cache
   - Elasticsearch for advanced search
   - CDN for static assets

### Phase 3 (Q2 2026)

1. **Enterprise Features:**
   - White-label solutions
   - API access for partners
   - Custom branding

2. **Advanced Analytics:**
   - Real-time dashboards
   - Predictive analytics
   - A/B testing framework UI

---

**Document Version:** 1.0.0
**Last Updated:** October 8, 2025
**Maintained By:** TasteTribe Engineering Team
