# TasteTribe Admin API Documentation

## Overview

This document provides comprehensive documentation for the TasteTribe Admin API, including authentication, endpoints, request/response formats, and usage examples.

**Base URL:** `https://your-domain.com/api`

**API Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Admin Management](#admin-management)
3. [Category Management](#category-management)
4. [TMDB Integration](#tmdb-integration)
5. [A/B Testing](#ab-testing)
6. [Analytics](#analytics)
7. [Subscription Management](#subscription-management)
8. [Stripe Integration](#stripe-integration)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Authentication

All admin endpoints require authentication using a Bearer token obtained from Supabase authentication.

### Headers

```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

### Authentication Roles

- **super_admin**: Full access to all admin features
- **content_manager**: Can manage categories and content
- **analyst**: Can view analytics and manage A/B tests

### Checking Admin Status

Use the Supabase client to check admin status:

```typescript
const { data } = await supabase.rpc('is_admin', { check_user_id: userId });
const { data } = await supabase.rpc('has_admin_role', { required_role: 'super_admin', check_user_id: userId });
```

---

## Admin Management

### Grant Admin Role

**Endpoint:** `POST /api/admin/roles`

**Required Role:** `super_admin`

**Request Body:**

```json
{
  "userId": "uuid",
  "role": "content_manager",
  "permissions": {
    "manage_categories": true,
    "seed_content": true
  }
}
```

**Response:**

```json
{
  "adminRole": {
    "id": "uuid",
    "user_id": "uuid",
    "role": "content_manager",
    "permissions": {},
    "created_at": "2025-10-08T00:00:00Z",
    "created_by": "uuid"
  }
}
```

### Revoke Admin Role

**Endpoint:** `DELETE /api/admin/roles/:userId`

**Required Role:** `super_admin`

**Response:**

```json
{
  "success": true
}
```

### List Admin Roles

**Endpoint:** `GET /api/admin/roles`

**Required Role:** `super_admin`

**Response:**

```json
{
  "adminRoles": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "content_manager",
      "permissions": {},
      "created_at": "2025-10-08T00:00:00Z"
    }
  ]
}
```

---

## Category Management

### List All Categories

**Endpoint:** `GET /api/admin/categories`

**Required Role:** `content_manager` or higher

**Response:**

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Movies",
      "slug": "movies",
      "description": "Discover your next favorite movie",
      "icon": "film",
      "active": true,
      "recommendation_config": {
        "algorithm": "content_based",
        "weights": {
          "genre_match": 0.35,
          "friend_similarity": 0.25,
          "ratings": 0.25,
          "recency": 0.15
        },
        "min_ratings": 5
      },
      "created_at": "2025-10-08T00:00:00Z",
      "updated_at": "2025-10-08T00:00:00Z"
    }
  ]
}
```

### Create Category

**Endpoint:** `POST /api/admin/categories`

**Required Role:** `content_manager` or higher

**Request Body:**

```json
{
  "name": "Books",
  "slug": "books",
  "description": "Find your next great read",
  "icon": "book",
  "active": true,
  "recommendation_config": {
    "algorithm": "collaborative_filtering",
    "weights": {
      "friend_similarity": 0.4,
      "taste_profile": 0.3,
      "popularity": 0.2,
      "recency": 0.1
    },
    "min_ratings": 3
  }
}
```

**Response:**

```json
{
  "category": {
    "id": "uuid",
    "name": "Books",
    "slug": "books",
    "description": "Find your next great read",
    "icon": "book",
    "active": true,
    "recommendation_config": {},
    "created_at": "2025-10-08T00:00:00Z",
    "updated_at": "2025-10-08T00:00:00Z"
  }
}
```

### Update Category

**Endpoint:** `PATCH /api/admin/categories/:id`

**Required Role:** `content_manager` or higher

**Request Body:**

```json
{
  "active": false,
  "recommendation_config": {
    "algorithm": "hybrid",
    "weights": {
      "friend_similarity": 0.3,
      "taste_profile": 0.3,
      "popularity": 0.25,
      "recency": 0.15
    },
    "min_ratings": 5
  }
}
```

**Response:**

```json
{
  "category": {
    "id": "uuid",
    "name": "Books",
    "slug": "books",
    "active": false,
    "recommendation_config": {},
    "updated_at": "2025-10-08T00:00:00Z"
  }
}
```

### Delete Category

**Endpoint:** `DELETE /api/admin/categories/:id`

**Required Role:** `super_admin`

**Response:**

```json
{
  "success": true
}
```

---

## TMDB Integration

### Seed Movies from TMDB

**Endpoint:** `POST /api/admin/seed-tmdb`

**Required Role:** `content_manager` or higher

**Request Body:**

```json
{
  "type": "movies",
  "maxPages": 5
}
```

**Parameters:**

- `type`: Either `"movies"` or `"tv_shows"`
- `maxPages`: Number of pages to fetch from TMDB (1-20)

**Response:**

```json
{
  "success": true,
  "totalFetched": 100,
  "totalInserted": 98,
  "type": "movies"
}
```

### Seed TV Shows from TMDB

**Endpoint:** `POST /api/admin/seed-tmdb`

**Required Role:** `content_manager` or higher

**Request Body:**

```json
{
  "type": "tv_shows",
  "maxPages": 10
}
```

**Response:**

```json
{
  "success": true,
  "totalFetched": 200,
  "totalInserted": 195,
  "type": "tv_shows"
}
```

---

## A/B Testing

### List A/B Tests

**Endpoint:** `GET /api/admin/ab-tests`

**Required Role:** `analyst` or higher

**Response:**

```json
{
  "tests": [
    {
      "id": "uuid",
      "name": "Movie Recommendation Algorithm Test",
      "category": "movies",
      "variants": [
        {
          "name": "control",
          "config": {
            "weights": {
              "genre_match": 0.35,
              "ratings": 0.25
            }
          },
          "traffic_percentage": 50
        },
        {
          "name": "variant_a",
          "config": {
            "weights": {
              "genre_match": 0.5,
              "ratings": 0.3
            }
          },
          "traffic_percentage": 50
        }
      ],
      "active": true,
      "start_date": "2025-10-08T00:00:00Z",
      "end_date": "2025-11-08T00:00:00Z",
      "created_at": "2025-10-08T00:00:00Z"
    }
  ]
}
```

### Create A/B Test

**Endpoint:** `POST /api/admin/ab-tests`

**Required Role:** `analyst` or higher

**Request Body:**

```json
{
  "name": "Restaurant Algorithm Test",
  "category": "restaurants",
  "variants": [
    {
      "name": "control",
      "config": {
        "weights": {
          "friend_similarity": 0.4,
          "popularity": 0.3
        }
      },
      "traffic_percentage": 50
    },
    {
      "name": "friend_focused",
      "config": {
        "weights": {
          "friend_similarity": 0.6,
          "popularity": 0.2
        }
      },
      "traffic_percentage": 50
    }
  ],
  "active": true,
  "start_date": "2025-10-08T00:00:00Z",
  "end_date": "2025-11-08T00:00:00Z"
}
```

**Response:**

```json
{
  "test": {
    "id": "uuid",
    "name": "Restaurant Algorithm Test",
    "category": "restaurants",
    "variants": [],
    "active": true,
    "created_at": "2025-10-08T00:00:00Z"
  }
}
```

### Update A/B Test

**Endpoint:** `PATCH /api/admin/ab-tests/:id`

**Required Role:** `analyst` or higher

**Request Body:**

```json
{
  "active": false
}
```

**Response:**

```json
{
  "test": {
    "id": "uuid",
    "active": false,
    "updated_at": "2025-10-08T00:00:00Z"
  }
}
```

### Delete A/B Test

**Endpoint:** `DELETE /api/admin/ab-tests/:id`

**Required Role:** `super_admin`

**Response:**

```json
{
  "success": true
}
```

---

## Analytics

### Get Admin Dashboard Analytics

**Endpoint:** `GET /api/admin/analytics`

**Required Role:** Any admin role

**Response:**

```json
{
  "analytics": {
    "totalUsers": 1250,
    "activeSubscriptions": 320,
    "totalRevenue": 159800,
    "categoriesCount": 4,
    "itemsCount": 12500,
    "ratingsCount": 45600
  }
}
```

### Get Recommendation Performance

**Endpoint:** `GET /api/admin/analytics/recommendations`

**Required Role:** `analyst` or higher

**Query Parameters:**

- `category`: Category slug (required)
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Example:** `GET /api/admin/analytics/recommendations?category=movies&startDate=2025-10-01&endDate=2025-10-08`

**Response:**

```json
{
  "performance": [
    {
      "date": "2025-10-08",
      "category": "movies",
      "algorithm_version": "v2.0",
      "variant": "control",
      "recommendations_shown": 1500,
      "recommendations_clicked": 450,
      "recommendations_rated": 120,
      "avg_rating": 4.2
    }
  ]
}
```

---

## Subscription Management

### Get Subscription Tiers

**Endpoint:** `GET /api/subscription/tiers`

**Authentication:** Required

**Response:**

```json
{
  "tiers": [
    {
      "id": "uuid",
      "name": "free",
      "price_monthly": 0,
      "price_yearly": 0,
      "features": {
        "max_ratings_per_day": 10,
        "max_favorites": 50,
        "social_features": true
      },
      "stripe_price_id_monthly": null,
      "stripe_price_id_yearly": null,
      "active": true
    },
    {
      "id": "uuid",
      "name": "premium",
      "price_monthly": 999,
      "price_yearly": 9990,
      "features": {
        "max_ratings_per_day": -1,
        "max_favorites": -1,
        "priority_support": true
      },
      "stripe_price_id_monthly": "price_xxx",
      "stripe_price_id_yearly": "price_yyy",
      "active": true
    }
  ]
}
```

### Get User Subscription

**Endpoint:** `GET /api/subscription/me`

**Authentication:** Required

**Response:**

```json
{
  "subscription": {
    "id": "uuid",
    "user_id": "uuid",
    "tier": {
      "name": "premium",
      "features": {}
    },
    "status": "active",
    "current_period_start": "2025-10-01T00:00:00Z",
    "current_period_end": "2025-11-01T00:00:00Z",
    "cancel_at_period_end": false
  }
}
```

---

## Stripe Integration

### Create Checkout Session

**Endpoint:** `POST /api/stripe/checkout`

**Authentication:** Required

**Request Body:**

```json
{
  "tierId": "uuid",
  "billingPeriod": "monthly"
}
```

**Response:**

```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxx"
}
```

**Usage:**

```typescript
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tierId: 'tier-uuid',
    billingPeriod: 'monthly'
  })
});

const { url } = await response.json();
window.location.href = url;
```

### Create Customer Portal Session

**Endpoint:** `POST /api/stripe/portal`

**Authentication:** Required

**Response:**

```json
{
  "url": "https://billing.stripe.com/session/xxx"
}
```

**Usage:**

```typescript
const response = await fetch('/api/stripe/portal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});

const { url } = await response.json();
window.location.href = url;
```

### Stripe Webhook

**Endpoint:** `POST /api/stripe/webhook`

**Authentication:** Stripe signature verification

**Headers:**

```
stripe-signature: t=xxx,v1=xxx
```

**Handled Events:**

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response:**

```json
{
  "received": true
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "details": []
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource successfully created
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Errors

#### Authentication Error

```json
{
  "error": "Invalid authentication token"
}
```

#### Permission Error

```json
{
  "error": "Unauthorized: super_admin role required"
}
```

#### Validation Error

```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["name"]
    }
  ]
}
```

---

## Rate Limiting

Rate limits are enforced per user per endpoint type:

- **Admin API**: 100 requests per minute
- **Auth endpoints**: 5 requests per 5 minutes
- **Content creation**: 30 requests per minute
- **Analytics**: 50 requests per minute

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696780800
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded. Please try again in 45 seconds."
}
```

---

## Code Examples

### TypeScript/JavaScript

```typescript
// Admin service usage
import { adminService } from '@/lib/services/admin';

// Create a category
const category = await adminService.createCategory({
  name: 'Books',
  slug: 'books',
  description: 'Find your next great read',
  icon: 'book',
  active: true,
  recommendation_config: {
    algorithm: 'collaborative_filtering',
    weights: {
      friend_similarity: 0.4,
      taste_profile: 0.3,
      popularity: 0.2,
      recency: 0.1
    },
    min_ratings: 3
  }
});

// Seed TMDB data
const response = await fetch('/api/admin/seed-tmdb', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'movies',
    maxPages: 10
  })
});

// Get analytics
const analytics = await adminService.getAdminAnalytics();
console.log(`Total users: ${analytics.totalUsers}`);
console.log(`Revenue: $${analytics.totalRevenue / 100}`);
```

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store access tokens securely** (never in localStorage)
3. **Implement proper error handling** for all API calls
4. **Respect rate limits** to avoid service disruptions
5. **Use pagination** for large data sets
6. **Cache responses** when appropriate
7. **Monitor webhook failures** and implement retry logic
8. **Validate all input** on both client and server
9. **Use environment variables** for sensitive configuration
10. **Test with Stripe test mode** before going live

---

## Support

For API support, please contact:
- Email: api-support@tastetribe.com
- Documentation: https://docs.tastetribe.com
- Status Page: https://status.tastetribe.com

---

**Last Updated:** October 8, 2025
**API Version:** 1.0.0
