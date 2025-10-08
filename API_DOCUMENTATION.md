# TasteTribe API Documentation

Version: 1.0.0

## Overview

TasteTribe provides RESTful APIs for partner integrations, allowing third-party services to access restaurant data and submit their own listings.

## Base URL

```
Production: https://yourdomain.com
Development: http://localhost:3000
```

## Authentication

All API requests require authentication via API key. Include your API key in the request header:

```
X-API-Key: your-api-key-here
```

### Obtaining an API Key

Contact our partnership team at partnerships@tastetribe.app to request API access.

## Rate Limiting

- Default limit: 1000 requests per hour
- Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

When rate limited, you'll receive a `429 Too Many Requests` response.

## Endpoints

### Restaurants

#### GET /api/partner/restaurants

Retrieve a list of restaurants with optional filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Results per page (default: 20, max: 100) |
| cuisine_type | string | No | Filter by cuisine type |
| price_range | string | No | Filter by price range ($, $$, $$$, $$$$) |
| min_rating | number | No | Minimum rating (0-5) |
| latitude | number | No | Latitude for location-based search |
| longitude | number | No | Longitude for location-based search |
| max_distance_km | number | No | Maximum distance in kilometers (default: 50) |

**Example Request:**

```bash
curl -X GET "https://yourdomain.com/api/partner/restaurants?page=1&limit=20&cuisine_type=Italian" \
  -H "X-API-Key: your-api-key"
```

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Restaurant Name",
      "category": "restaurant",
      "category_type": "restaurant",
      "external_id": "google_place_id",
      "external_source": "google_places",
      "verified": true,
      "location": {
        "latitude": 39.7392,
        "longitude": -104.9903
      },
      "attributes": {
        "cuisine_type": "Italian",
        "price_range": "$$",
        "address": "123 Main St, Denver, CO 80202",
        "phone": "(303) 555-1234",
        "website": "https://restaurant.com",
        "google_rating": 4.5,
        "google_review_count": 250,
        "hours": [
          "Monday: 11:00 AM - 10:00 PM",
          "Tuesday: 11:00 AM - 10:00 PM"
        ],
        "open_now": true
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 20,
    "total_pages": 25
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

#### POST /api/partner/restaurants

Submit a new restaurant listing. Requires write permissions.

**Request Body:**

```json
{
  "name": "Restaurant Name",
  "external_id": "your-unique-id",
  "location": {
    "latitude": 39.7392,
    "longitude": -104.9903
  },
  "attributes": {
    "cuisine_type": "Italian",
    "price_range": "$$",
    "address": "123 Main St, Denver, CO 80202",
    "phone": "(303) 555-1234",
    "website": "https://restaurant.com",
    "description": "Authentic Italian cuisine in downtown Denver",
    "hours": [
      "Monday: 11:00 AM - 10:00 PM",
      "Tuesday: 11:00 AM - 10:00 PM"
    ]
  }
}
```

**Required Fields:**
- `name`: Restaurant name
- `external_id`: Unique identifier from your system
- `location.latitude`: Latitude coordinate
- `location.longitude`: Longitude coordinate
- `attributes.cuisine_type`: Type of cuisine
- `attributes.price_range`: Price range ($, $$, $$$, $$$$)
- `attributes.address`: Physical address

**Example Request:**

```bash
curl -X POST "https://yourdomain.com/api/partner/restaurants" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Restaurant",
    "external_id": "partner-123",
    "location": {
      "latitude": 39.7392,
      "longitude": -104.9903
    },
    "attributes": {
      "cuisine_type": "Italian",
      "price_range": "$$",
      "address": "123 Main St"
    }
  }'
```

**Success Response (201 Created):**

```json
{
  "id": "uuid",
  "name": "New Restaurant",
  "external_id": "partner-123",
  "external_source": "partner_api",
  "verified": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid data or missing required fields
- `401 Unauthorized`: Invalid API key or insufficient permissions
- `409 Conflict`: Restaurant with this external_id already exists
- `429 Too Many Requests`: Rate limit exceeded

---

#### GET /api/partner/restaurants/:id

Retrieve details for a specific restaurant.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Restaurant ID (UUID) |

**Example Request:**

```bash
curl -X GET "https://yourdomain.com/api/partner/restaurants/uuid" \
  -H "X-API-Key: your-api-key"
```

**Success Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "Restaurant Name",
  "category": "restaurant",
  "location": {
    "latitude": 39.7392,
    "longitude": -104.9903
  },
  "attributes": {
    "cuisine_type": "Italian",
    "price_range": "$$",
    "address": "123 Main St",
    "phone": "(303) 555-1234"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Restaurant not found

---

### Webhooks

#### POST /api/partner/webhooks

Receive webhook notifications for restaurant updates.

**Webhook Events:**

- `restaurant.created`: New restaurant added
- `restaurant.updated`: Restaurant information updated
- `restaurant.deleted`: Restaurant removed
- `restaurant.verified`: Restaurant verified by admin

**Request Headers:**

```
X-Webhook-Signature: HMAC-SHA256 signature
Content-Type: application/json
```

**Webhook Payload:**

```json
{
  "event": "restaurant.updated",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "id": "uuid",
    "name": "Restaurant Name",
    "changes": {
      "rating": {
        "old": 4.3,
        "new": 4.5
      }
    }
  }
}
```

**Signature Verification:**

Verify webhook signatures to ensure requests are from TasteTribe:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === digest;
}
```

**Webhook Configuration:**

Configure your webhook endpoint in the partner dashboard or contact support.

---

## Data Models

### Restaurant Object

```typescript
interface Restaurant {
  id: string;                    // UUID
  name: string;                  // Restaurant name
  category: string;              // Category (e.g., "restaurant")
  category_type: string;         // Specific type (e.g., "restaurant")
  external_id: string;           // External identifier
  external_source: string;       // Source system
  verified: boolean;             // Verification status
  location: {
    latitude: number;            // Latitude coordinate
    longitude: number;           // Longitude coordinate
  };
  attributes: {
    cuisine_type: string;        // Type of cuisine
    price_range: string;         // $, $$, $$$, or $$$$
    address: string;             // Physical address
    phone?: string;              // Phone number
    website?: string;            // Website URL
    google_rating?: number;      // Google rating (0-5)
    google_review_count?: number;// Number of reviews
    hours?: string[];            // Operating hours
    open_now?: boolean;          // Currently open
    description?: string;        // Description
  };
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;            // ISO 8601 timestamp
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;                 // Error message
  code?: string;                 // Error code
  details?: any;                 // Additional details
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | API key lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INVALID_REQUEST` | Request data is invalid |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `VALIDATION_ERROR` | Data validation failed |
| `INTERNAL_ERROR` | Server error |

---

## Best Practices

### 1. Handle Rate Limits

Implement exponential backoff when rate limited:

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = response.headers.get('Retry-After') || Math.pow(2, i);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }

  throw new Error('Max retries exceeded');
}
```

### 2. Validate Webhook Signatures

Always verify webhook signatures to ensure authenticity:

```javascript
const isValid = verifySignature(
  req.body,
  req.headers['x-webhook-signature'],
  process.env.WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 3. Use Pagination

For large datasets, always use pagination:

```javascript
let page = 1;
let allRestaurants = [];

while (true) {
  const response = await fetch(
    `${API_BASE}/restaurants?page=${page}&limit=100`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  const { data, pagination } = await response.json();
  allRestaurants = allRestaurants.concat(data);

  if (page >= pagination.total_pages) break;
  page++;
}
```

### 4. Cache Responses

Cache API responses to reduce unnecessary requests:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedRestaurant(id) {
  const cached = cache.get(id);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(`${API_BASE}/restaurants/${id}`);
  const data = await response.json();

  cache.set(id, { data, timestamp: Date.now() });
  return data;
}
```

---

## OpenAPI Specification

Download the complete OpenAPI 3.0 specification:

```
GET /api/openapi.json
```

Use this with tools like Swagger UI, Postman, or code generators.

---

## Support

For API support:

- Email: api-support@tastetribe.app
- Documentation: https://docs.tastetribe.app
- Status Page: https://status.tastetribe.app

For partnership inquiries:
- Email: partnerships@tastetribe.app
- Phone: (555) 123-4567

---

## Changelog

### Version 1.0.0 (2024-01-01)

- Initial API release
- Restaurant endpoints (GET, POST)
- Webhook support
- Rate limiting implementation
- API key authentication

---

## Terms of Service

By using the TasteTribe API, you agree to our:

- [API Terms of Service](https://tastetribe.app/api-terms)
- [Privacy Policy](https://tastetribe.app/privacy)
- [Acceptable Use Policy](https://tastetribe.app/acceptable-use)

Violations may result in API access suspension or termination.
