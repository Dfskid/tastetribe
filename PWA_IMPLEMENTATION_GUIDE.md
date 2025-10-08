# TasteTribe PWA Implementation Guide

## Overview

TasteTribe has been transformed into a native mobile app experience using Progressive Web App (PWA) technologies. This guide covers the implementation details, architecture decisions, and usage instructions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core PWA Features](#core-pwa-features)
3. [Mobile-Native Components](#mobile-native-components)
4. [Installation Instructions](#installation-instructions)
5. [Testing Procedures](#testing-procedures)
6. [Performance Optimization](#performance-optimization)
7. [Offline Functionality](#offline-functionality)
8. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS with custom mobile-first utilities
- **PWA**: Custom Service Worker with advanced caching strategies
- **Animations**: Framer Motion for native-like transitions
- **State Management**: React Context + Supabase Realtime

### File Structure

```
project/
├── public/
│   ├── manifest.json              # PWA manifest with app configuration
│   ├── sw.js                      # Service worker with offline strategies
│   ├── offline.html               # Offline fallback page
│   └── icons/                     # App icons (72px - 512px)
├── lib/
│   ├── pwa/
│   │   ├── haptics.ts            # Haptic feedback utilities
│   │   └── install-prompt.ts     # Intelligent install prompt logic
│   └── hooks/
│       └── usePullToRefresh.ts   # Pull-to-refresh hook
├── components/
│   ├── pwa/
│   │   ├── PullToRefresh.tsx     # Pull-to-refresh component
│   │   ├── BottomSheet.tsx       # Native-style bottom sheet
│   │   └── InstallPrompt.tsx     # Smart install banner
│   └── ui/
│       └── SkeletonLoader.tsx    # Loading state components
```

---

## Core PWA Features

### 1. Manifest Configuration

**Location**: `public/manifest.json`

The manifest defines how the app appears when installed:

```json
{
  "name": "TasteTribe - Restaurant Discovery",
  "short_name": "TasteTribe",
  "display": "standalone",
  "theme_color": "#FF6347",
  "background_color": "#FFEFD5",
  "start_url": "/?source=pwa"
}
```

**Key Features**:
- Standalone display mode (hides browser UI)
- Custom theme colors matching brand
- App shortcuts for quick access to features
- Share target integration
- Multiple icon sizes for all devices

### 2. Service Worker

**Location**: `public/sw.js`

Implements multiple caching strategies:

#### Cache Strategy Matrix

| Resource Type | Strategy | Cache Duration | Max Items |
|--------------|----------|----------------|-----------|
| Static Assets | Cache First | Indefinite | N/A |
| Images | Cache First | 7 days | 50 |
| API Calls | Network First | 5 minutes | 100 |
| Pages | Stale While Revalidate | Dynamic | 50 |

#### Background Sync

Queues user actions when offline:
- Restaurant ratings
- Social posts
- Friend requests

**Usage**:
```typescript
// In your API call
try {
  await fetch('/api/rate', { ... });
} catch (error) {
  // Store in IndexedDB for background sync
  await queuePendingRating(ratingData);
  await registration.sync.register('sync-ratings');
}
```

### 3. Install Prompt

**Location**: `lib/pwa/install-prompt.ts`

Intelligent install prompting based on user engagement:

**Trigger Conditions**:
- User has rated 3+ restaurants
- User hasn't dismissed prompt 3+ times
- 7+ days since last prompt (if dismissed)
- Not already installed

**Platform Detection**:
- iOS: Shows manual installation instructions
- Android/Desktop: Shows native install button

---

## Mobile-Native Components

### Pull-to-Refresh

**Usage**:
```tsx
import { PullToRefresh } from '@/components/pwa/PullToRefresh';

function MyFeedPage() {
  const handleRefresh = async () => {
    await fetchLatestData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <FeedContent />
    </PullToRefresh>
  );
}
```

**Features**:
- Native-style loading indicator
- Rubber-band effect
- Haptic feedback on trigger
- Smooth 60fps animations

### Bottom Sheet Modal

**Usage**:
```tsx
import { BottomSheet } from '@/components/pwa/BottomSheet';

function RestaurantDetails() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Restaurant Details"
      snapPoints={[0.9, 0.5]}
    >
      <RestaurantInfo />
    </BottomSheet>
  );
}
```

**Features**:
- Swipe-to-dismiss gesture
- Multi-snap points support
- iOS-style handle indicator
- Haptic feedback on drag

### Haptic Feedback

**Usage**:
```typescript
import { haptics } from '@/lib/pwa/haptics';

// Button press
<button onClick={() => {
  haptics.light();
  handleAction();
}}>

// Success action
haptics.success();

// Error state
haptics.error();

// Star rating selection
haptics.selection();
```

**Available Patterns**:
- `light`: Subtle feedback (10ms)
- `medium`: Standard feedback (20ms)
- `heavy`: Strong feedback (30ms)
- `success`: Double pulse
- `warning`: Triple pulse
- `error`: Five pulses
- `selection`: Quick tap (5ms)

### Skeleton Loaders

**Usage**:
```tsx
import { RestaurantGridSkeleton } from '@/components/ui/SkeletonLoader';

function DiscoverPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <RestaurantGridSkeleton count={6} />;
  }

  return <RestaurantGrid data={restaurants} />;
}
```

**Available Skeletons**:
- `RestaurantCardSkeleton`
- `RestaurantGridSkeleton`
- `ActivityFeedSkeleton`
- `MovieCardSkeleton`
- `ProfileHeaderSkeleton`
- `PageSkeleton`

---

## Installation Instructions

### For Users

#### iOS (Safari)

1. Open https://tastetribe.app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. The app icon appears on your home screen

#### Android (Chrome)

1. Open https://tastetribe.app in Chrome
2. Tap "Install" when the banner appears (or)
3. Open menu (⋮) → "Install app" / "Add to Home Screen"
4. Confirm installation
5. The app appears in your app drawer

### For Developers

#### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

#### Service Worker Testing

```bash
# Build the app
npm run build

# Serve production build locally
npx serve -s out -p 3000

# Test in Chrome DevTools → Application → Service Workers
```

#### Generate PWA Icons

Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator):

```bash
npx pwa-asset-generator public/logo.svg public/icons \
  --background "#FFEFD5" \
  --padding "10%" \
  --splash-only false \
  --icon-only false
```

---

## Testing Procedures

### 1. PWA Installation Test

**Chrome DevTools**:
1. Open DevTools → Application → Manifest
2. Verify all fields are populated correctly
3. Check "Add to homescreen" link appears

**Lighthouse PWA Audit**:
```bash
# Run Lighthouse PWA audit
npx lighthouse https://tastetribe.app \
  --only-categories=pwa \
  --view
```

**Target Scores**:
- PWA: 90+
- Performance: 85+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### 2. Service Worker Test

**Manual Testing**:
1. Open app in Chrome
2. DevTools → Application → Service Workers
3. Check "Offline" checkbox
4. Navigate through app
5. Verify cached content loads
6. Verify offline page appears for uncached routes

**Automated Testing**:
```javascript
// In your test file
describe('Service Worker', () => {
  it('should register successfully', async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    expect(registration).toBeDefined();
  });

  it('should cache critical assets', async () => {
    const cache = await caches.open('tastetribe-static-v2.0.0');
    const cachedUrls = await cache.keys();
    expect(cachedUrls.length).toBeGreaterThan(0);
  });
});
```

### 3. Gesture Test Matrix

| Gesture | Expected Behavior | Test Status |
|---------|------------------|-------------|
| Pull-to-refresh | Reload feed content | ✓ |
| Swipe bottom sheet down | Dismiss modal | ✓ |
| Long-press restaurant card | Show context menu | ✓ |
| Swipe left/right on images | Navigate carousel | ✓ |
| Pinch-to-zoom | Disabled (prevents accidental zoom) | ✓ |

### 4. Performance Test

**Core Web Vitals**:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Test Commands**:
```bash
# Run performance audit
npm run lighthouse -- --only-categories=performance

# Test 3G network
# Chrome DevTools → Network → Slow 3G

# Bundle size analysis
npm run build && npx next-bundle-analyzer
```

---

## Performance Optimization

### 1. Image Optimization

All images use Next.js Image component with:
- Automatic WebP conversion
- Lazy loading by default
- Responsive srcset generation
- Blur-up placeholders

```tsx
import Image from 'next/image';

<Image
  src="/restaurant.jpg"
  alt="Restaurant"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  priority={false}
/>
```

### 2. Code Splitting

**Route-based splitting** (automatic):
- Each page is a separate bundle
- Shared components are extracted to common chunks

**Component lazy loading**:
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <SkeletonLoader />,
  ssr: false
});
```

### 3. Critical CSS

Inline critical CSS for above-the-fold content:
```css
/* globals.css */
/* Above-the-fold styles are inlined automatically by Next.js */
```

### 4. Preloading Strategies

```tsx
// In layout.tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://api.supabase.co" />
<link rel="preload" href="/critical.css" as="style" />
```

---

## Offline Functionality

### Supported Offline Features

#### ✅ Fully Functional Offline
- View cached restaurant listings
- Browse previously loaded content
- View friend profiles (if cached)
- Access navigation between pages

#### ⚠️ Queued for Sync
- Rate restaurants (syncs when online)
- Post to activity feed (syncs when online)
- Send friend requests (syncs when online)

#### ❌ Requires Connection
- Search new restaurants
- Load latest recommendations
- Real-time social feed updates
- Authentication (first time)

### Offline Storage Strategy

**IndexedDB Structure**:
```javascript
{
  stores: {
    pendingRatings: [
      { id: 1, restaurantId: 'abc', rating: 5, timestamp: '...' }
    ],
    pendingPosts: [
      { id: 1, content: '...', timestamp: '...' }
    ],
    cachedRestaurants: [
      { id: 'abc', name: '...', data: {...} }
    ]
  }
}
```

### Background Sync Implementation

```typescript
// Queue action for background sync
async function queueRating(ratingData) {
  const db = await openDB();
  await db.put('pendingRatings', ratingData);

  if ('serviceWorker' in navigator && 'sync' in registration) {
    await registration.sync.register('sync-ratings');
  }
}

// In service worker (sw.js)
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-ratings') {
    event.waitUntil(syncPendingRatings());
  }
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Generate all required icon sizes (72px - 512px)
- [ ] Create Apple splash screens for common device sizes
- [ ] Update manifest.json with production URLs
- [ ] Set correct theme colors in manifest and meta tags
- [ ] Test service worker in production build
- [ ] Run Lighthouse PWA audit (target: 90+)
- [ ] Test on physical iOS and Android devices
- [ ] Verify offline functionality works
- [ ] Test install flow on both platforms
- [ ] Check safe area insets on notched devices

### Deployment

- [ ] Build production bundle: `npm run build`
- [ ] Verify bundle size: `next-bundle-analyzer`
- [ ] Deploy to hosting (Vercel, Netlify, etc.)
- [ ] Configure HTTPS (required for PWA)
- [ ] Set up CDN for static assets
- [ ] Configure cache headers:
  ```
  /sw.js: max-age=0, no-cache
  /_next/static/*: max-age=31536000, immutable
  /icons/*: max-age=31536000, immutable
  ```

### Post-Deployment

- [ ] Test PWA installation on production URL
- [ ] Verify service worker updates correctly
- [ ] Monitor Core Web Vitals in production
- [ ] Test offline functionality on live site
- [ ] Verify push notifications (if implemented)
- [ ] Test background sync on mobile data
- [ ] Submit to app directories (optional):
  - Google Play Store (via TWA)
  - Microsoft Store
  - Samsung Galaxy Store

---

## Browser Support

### Fully Supported
- Chrome/Edge 90+ (Android, Desktop, iOS)
- Safari 15+ (iOS, macOS)
- Firefox 90+ (Android, Desktop)
- Samsung Internet 15+

### Partial Support
- Safari 14 (iOS): No install prompt, manual installation only
- Firefox iOS: Uses Safari WebKit, same limitations

### Not Supported
- Internet Explorer (deprecated)
- Opera Mini (limited JavaScript)

---

## Troubleshooting

### Issue: Install prompt not showing

**Solution**:
1. Check if app is already installed
2. Verify HTTPS is enabled
3. Check manifest.json is valid
4. Clear browser cache and try again
5. Check browser console for errors

### Issue: Service worker not updating

**Solution**:
```javascript
// Force update service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.update());
  });
}
```

### Issue: Offline page not displaying

**Solution**:
1. Verify `/offline.html` is in `public/` folder
2. Check service worker cached it on install
3. Clear cache and reinstall service worker

### Issue: Haptic feedback not working

**Solution**:
- iOS requires user interaction before vibration works
- Check browser supports Vibration API
- Ensure device has vibration hardware

---

## Performance Monitoring

### Analytics to Track

```typescript
// Track PWA metrics
{
  'pwa.installed': boolean,
  'pwa.standalone': boolean,
  'pwa.install_prompt_shown': number,
  'pwa.install_prompt_accepted': boolean,
  'pwa.offline_usage': number,
  'pwa.background_sync_completed': number
}
```

### Real User Monitoring

```typescript
// Report Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  analytics.track('web_vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
```

---

## Future Enhancements

### Planned Features

1. **Web Share API Integration**
   - Share restaurants with friends
   - Share activity feed posts

2. **Media Capture API**
   - Take photos directly in app
   - Upload restaurant photos

3. **Geolocation Background Updates**
   - Notify when near favorite restaurant
   - Location-based recommendations

4. **Push Notifications**
   - Friend activity updates
   - New recommendations available
   - Restaurant promotions

5. **Shortcuts API Enhancement**
   - Dynamic shortcuts based on usage
   - Quick actions from home screen

---

## Additional Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (Alternative to custom SW)](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)

---

## Support

For issues or questions:
- GitHub Issues: [github.com/tastetribe/tastetribe](https://github.com/tastetribe/tastetribe)
- Email: support@tastetribe.app
- Documentation: [docs.tastetribe.app](https://docs.tastetribe.app)

---

**Last Updated**: October 2025
**Version**: 2.0.0
**Minimum Lighthouse PWA Score**: 90+
