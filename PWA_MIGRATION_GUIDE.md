# TasteTribe PWA Migration Guide

## Overview

This guide provides step-by-step instructions for deploying the PWA enhancements to production without breaking existing users or functionality.

---

## Pre-Migration Checklist

### 1. Environment Preparation

- [ ] Backup current production database
- [ ] Clone production environment to staging
- [ ] Test all API endpoints are working
- [ ] Verify Supabase connection strings
- [ ] Ensure HTTPS is configured (required for PWA)

### 2. Asset Generation

#### Generate PWA Icons

You'll need to create icons for all required sizes. Use [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator):

```bash
# Install globally
npm install -g pwa-asset-generator

# Generate all icons from logo
pwa-asset-generator \
  ./public/logo.svg \
  ./public \
  --background "#FFEFD5" \
  --padding "10%" \
  --splash-only false \
  --icon-only false \
  --manifest ./public/manifest.json
```

**Required icon sizes:**
- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)
- icon-maskable-192.png (192x192, maskable)
- icon-maskable-512.png (512x512, maskable)

#### Generate Apple Splash Screens

```bash
# Generate iOS splash screens
pwa-asset-generator \
  ./public/logo.svg \
  ./public \
  --background "#FFEFD5" \
  --splash-only true \
  --type png
```

**Required splash screens:**
- apple-splash-750-1334.png (iPhone 8)
- apple-splash-828-1792.png (iPhone 11)
- apple-splash-1125-2436.png (iPhone X/XS)
- apple-splash-1242-2688.png (iPhone XS Max)
- apple-splash-1536-2048.png (iPad)
- apple-splash-1668-2388.png (iPad Pro 11")
- apple-splash-2048-2732.png (iPad Pro 12.9")

### 3. Code Review

Review all changed files:

```bash
# List all new/modified files
git status

# Review key files
git diff manifest.json
git diff sw.js
git diff app/layout.tsx
```

**Key files to review:**
- `public/manifest.json` - PWA configuration
- `public/sw.js` - Service worker
- `public/offline.html` - Offline fallback
- `app/layout.tsx` - iOS meta tags
- `lib/pwa/*` - PWA utilities
- `components/pwa/*` - PWA components

---

## Migration Steps

### Step 1: Deploy to Staging

```bash
# Build production bundle
npm run build

# Test build locally
npx serve -s out -p 3000

# Deploy to staging environment
# (Your deployment command here)
```

### Step 2: Staging Tests

#### A. PWA Functionality Test

1. **Open staging URL in Chrome**
   - Open Chrome DevTools
   - Go to Application tab
   - Check Manifest section
   - Verify all fields are populated

2. **Test Service Worker**
   - Application → Service Workers
   - Verify SW registered successfully
   - Check Update on reload

3. **Test Installation**
   - Click install prompt (if available)
   - OR Chrome menu → Install TasteTribe
   - Verify app installs to desktop/home screen
   - Launch installed app
   - Verify runs in standalone mode

4. **Test Offline**
   - With app open, check "Offline" in DevTools
   - Navigate between pages
   - Verify cached content loads
   - Try to rate a restaurant (should queue)
   - Uncheck "Offline"
   - Verify queued action syncs

#### B. Mobile Device Testing

**iOS Testing:**
```
1. Open Safari on iPhone
2. Navigate to staging URL
3. Tap Share button
4. Scroll to "Add to Home Screen"
5. Tap "Add"
6. Return to home screen
7. Launch app icon
8. Verify:
   - Runs full-screen (no Safari UI)
   - Safe area insets work
   - Pull-to-refresh works
   - Haptic feedback works
```

**Android Testing:**
```
1. Open Chrome on Android
2. Navigate to staging URL
3. Tap "Install" banner
4. OR Menu → Install app
5. Verify app appears in app drawer
6. Launch app
7. Test:
   - Standalone mode
   - Pull-to-refresh
   - Haptic feedback
   - Offline functionality
```

#### C. Performance Testing

```bash
# Run Lighthouse audit
npx lighthouse https://staging.tastetribe.app \
  --only-categories=pwa,performance,accessibility \
  --view

# Verify scores:
# - PWA: 90+
# - Performance: 85+
# - Accessibility: 90+
```

#### D. Cross-Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Safari iOS (latest)
- [ ] Safari macOS (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Samsung Internet

### Step 3: Backward Compatibility Verification

Ensure existing functionality still works:

- [ ] User authentication (login/signup)
- [ ] Restaurant search and discovery
- [ ] Rating restaurants
- [ ] Social feed
- [ ] Friend connections
- [ ] Profile management
- [ ] Movie discovery
- [ ] All API endpoints

**Automated Testing:**
```bash
# Run test suite
npm test

# Run E2E tests if available
npm run test:e2e
```

### Step 4: Production Deployment

#### A. Pre-Deployment

```bash
# Final production build
npm run build

# Verify bundle size
ls -lh .next/static/chunks/

# Check for any errors
npm run lint
npm run typecheck
```

#### B. Deploy

```bash
# Your production deployment command
# Examples:
# Vercel: vercel --prod
# Netlify: netlify deploy --prod
# Custom: npm run deploy:production
```

#### C. Post-Deployment Verification

1. **Immediate Checks**
   ```bash
   # Check site is live
   curl -I https://tastetribe.app

   # Verify manifest
   curl https://tastetribe.app/manifest.json

   # Verify service worker
   curl https://tastetribe.app/sw.js
   ```

2. **Browser Checks**
   - Open https://tastetribe.app
   - Check DevTools → Application → Manifest
   - Verify no console errors
   - Check Service Worker registers

3. **Install Test**
   - Install app on test device
   - Verify all features work
   - Test offline functionality
   - Check background sync

---

## Cache Configuration

### CDN/Server Headers

Configure these cache headers:

```nginx
# Service Worker - NO caching
location = /sw.js {
  add_header Cache-Control "max-age=0, no-cache, no-store, must-revalidate";
  add_header Pragma "no-cache";
}

# Manifest - Short cache
location = /manifest.json {
  add_header Cache-Control "max-age=3600, must-revalidate";
}

# Static assets - Long cache
location /_next/static/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Icons - Long cache
location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML - No cache
location / {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

### Vercel Configuration

Create/update `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=0, no-cache, no-store, must-revalidate"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=3600, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Rollback Plan

If issues arise, follow this rollback procedure:

### Immediate Rollback

```bash
# Revert to previous deployment
# (Your platform-specific command)
# Vercel: vercel rollback
# Netlify: netlify rollback

# OR redeploy previous version
git revert HEAD
git push origin main
```

### Service Worker Cleanup

If service worker causes issues:

1. **Force SW Update**
   ```javascript
   // In browser console on production
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });

   // Then refresh page
   location.reload();
   ```

2. **Communicate to Users**
   - Post announcement about temporary issues
   - Instruct users to clear cache if needed
   - Provide manual uninstall instructions

### Database Rollback

If database changes needed:

```bash
# Restore from backup
# Your backup restoration command

# Verify restoration
psql -h your-db-host -U your-user -d your-db -c "SELECT COUNT(*) FROM restaurants;"
```

---

## Monitoring & Analytics

### Key Metrics to Track

#### PWA Installation
```javascript
// Track install events
window.addEventListener('appinstalled', () => {
  analytics.track('pwa_installed', {
    platform: navigator.platform,
    user_agent: navigator.userAgent
  });
});
```

#### Service Worker Performance
```javascript
// Track SW cache hits
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data.type === 'cache-hit') {
    analytics.track('cache_hit', {
      url: event.data.url,
      cache: event.data.cacheName
    });
  }
});
```

#### Offline Usage
```javascript
// Track offline sessions
window.addEventListener('offline', () => {
  analytics.track('went_offline');
});

window.addEventListener('online', () => {
  analytics.track('came_online');
});
```

### Dashboard Metrics

Create dashboards to monitor:

1. **Installation Metrics**
   - Install prompt shown count
   - Install acceptance rate
   - Uninstall rate
   - Platform breakdown

2. **Performance Metrics**
   - Service worker hit rate
   - Average load time
   - Time to interactive
   - Offline usage percentage

3. **Engagement Metrics**
   - Daily active PWA users
   - Session duration (PWA vs web)
   - Feature usage (pull-to-refresh, etc.)
   - Retention rates

---

## Troubleshooting Common Issues

### Issue 1: Service Worker Not Updating

**Symptoms:**
- Users see old version of app
- Changes not appearing
- Console shows old SW version

**Solution:**
```javascript
// Force update in code
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.update();
    });
  });
}

// Or increase SW version
// In sw.js: const CACHE_VERSION = 'v2.0.1'; // Increment
```

### Issue 2: Install Prompt Not Showing

**Symptoms:**
- Users don't see install banner
- beforeinstallprompt not firing

**Check:**
1. HTTPS enabled?
2. Manifest.json valid?
3. Service worker registered?
4. User already installed?
5. User dismissed recently?

**Debug:**
```javascript
// Check PWA eligibility
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available!');
});

// Check if standalone
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Already installed');
}
```

### Issue 3: Offline Page Not Showing

**Symptoms:**
- Blank page when offline
- Network errors visible

**Fix:**
```javascript
// Verify offline.html is cached
caches.open('tastetribe-static-v2.0.0').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached URLs:', keys.map(k => k.url));
  });
});

// Ensure it's in STATIC_ASSETS
const STATIC_ASSETS = [
  '/',
  '/offline.html', // Must be here
  // ...
];
```

### Issue 4: Haptic Feedback Not Working

**Symptoms:**
- No vibration on interactions
- Silent button presses

**Check:**
1. Device has vibration motor?
2. Vibration enabled in device settings?
3. Browser supports Vibration API?

**Test:**
```javascript
// Test vibration support
if ('vibrate' in navigator) {
  navigator.vibrate(200); // Should vibrate
} else {
  console.log('Vibration not supported');
}
```

### Issue 5: iOS Installation Issues

**Symptoms:**
- Install doesn't work on iOS
- App doesn't launch full-screen

**Remember:**
- iOS doesn't show install prompt automatically
- Must guide users through manual installation
- Requires Safari (not Chrome on iOS)
- Check meta tags are correct

---

## User Communication

### Announcement Email Template

```
Subject: TasteTribe is Now an App! 📱

Hi [Name],

Great news! TasteTribe is now available as a mobile app that you can install directly to your phone's home screen.

What's New:
✨ Works offline - browse restaurants even without internet
✨ Faster loading - instant access from your home screen
✨ Native experience - feels just like a regular app
✨ No app store needed - install directly from your browser

How to Install:

iPhone/iPad:
1. Open tastetribe.app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add"

Android:
1. Open tastetribe.app in Chrome
2. Tap "Install" when prompted
3. Or tap menu → "Install app"

That's it! The TasteTribe icon will appear on your home screen just like any other app.

Try it out and let us know what you think!

The TasteTribe Team
```

### In-App Notification

```javascript
// Show toast notification
{
  title: "TasteTribe is now installable! 🎉",
  description: "Add to your home screen for a better experience",
  action: {
    label: "Learn How",
    onClick: () => showInstallGuide()
  }
}
```

---

## Success Criteria

Migration is considered successful when:

- [ ] Lighthouse PWA score: 90+
- [ ] No increase in error rates
- [ ] Service worker registration: > 95%
- [ ] Install rate: > 5% of visitors
- [ ] No degradation in key metrics:
  - Page load time
  - API response time
  - Conversion rates
  - User engagement
- [ ] Positive user feedback
- [ ] No critical bugs reported

---

## Timeline

Recommended migration timeline:

**Week 1: Preparation**
- Day 1-2: Generate all assets
- Day 3-4: Deploy to staging
- Day 5-7: Staging testing

**Week 2: Testing**
- Day 8-10: Extended staging tests
- Day 11-12: Load testing
- Day 13-14: User acceptance testing

**Week 3: Production**
- Day 15: Deploy to production (low traffic time)
- Day 16-17: Monitor closely
- Day 18-21: Address any issues

**Week 4: Optimization**
- Day 22-28: Collect metrics
- Optimize based on data
- Plan future enhancements

---

## Support Resources

### Documentation
- PWA Implementation Guide: `PWA_IMPLEMENTATION_GUIDE.md`
- Transformation Summary: `PWA_TRANSFORMATION_SUMMARY.md`
- API Documentation: `API_DOCUMENTATION.md`

### External Help
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)
- [PWA Builder Support](https://www.pwabuilder.com/)

### Testing Tools
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [PWA Test](https://www.pwabuilder.com/test)
- [Web Manifest Validator](https://manifest-validator.appspot.com/)

---

## Final Checklist

Before going live:

- [ ] All assets generated and uploaded
- [ ] Manifest.json configured correctly
- [ ] Service worker tested thoroughly
- [ ] iOS meta tags in place
- [ ] Cache headers configured
- [ ] Staging tests passed
- [ ] Mobile device testing complete
- [ ] Lighthouse scores meet targets
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team briefed
- [ ] Monitoring dashboards ready
- [ ] User communication prepared
- [ ] Documentation updated

---

**Good luck with your PWA migration! 🚀**

For questions or issues, refer to the troubleshooting section or contact the development team.

---

**Last Updated**: October 2025
**Version**: 2.0.0
**Status**: Ready for Production
