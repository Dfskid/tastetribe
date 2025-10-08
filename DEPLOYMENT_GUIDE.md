# TasteTribe Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Google Places API key
- SendGrid account (optional, for emails)
- Domain name (for production)

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Places API
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# SendGrid (Optional)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=notifications@yourdomain.com

# Analytics (Optional)
NEXT_PUBLIC_GA_TRACKING_ID=your_ga_tracking_id

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Database Setup

### 1. Apply Migrations

All migrations are in the `supabase/migrations` directory. They should be automatically applied by Supabase.

To manually apply:

```bash
npx supabase db push
```

### 2. Populate Restaurant Data

Run the data population script:

```bash
npx tsx scripts/populate-restaurants.ts
```

This will fetch restaurants from Google Places API and populate your database.

### 3. Generate Seed Data (Optional, for testing)

```bash
npx tsx scripts/generate-seed-data.ts
```

This creates test users, friendships, ratings, and other sample data.

## Build and Test Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to test locally.

### 3. Build for Production

```bash
npm run build
```

### 4. Test Production Build

```bash
npm start
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in project settings
4. Deploy

Vercel will automatically detect Next.js and configure optimally.

### Option 2: Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t tastetribe .
docker run -p 3000:3000 --env-file .env.local tastetribe
```

### Option 3: Traditional Node.js Server

1. Build the application: `npm run build`
2. Copy `.next`, `public`, `package.json`, and `node_modules` to server
3. Run with: `NODE_ENV=production npm start`

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test user registration and login
- [ ] Test restaurant search and recommendations
- [ ] Verify email notifications (if SendGrid configured)
- [ ] Test PWA installation on mobile
- [ ] Check Google Analytics tracking
- [ ] Verify API endpoints with rate limiting
- [ ] Test social features (friends, invitations)
- [ ] Check SEO meta tags in page source
- [ ] Test dark mode functionality
- [ ] Verify service worker caching
- [ ] Test offline functionality

## Monitoring and Maintenance

### Database Backups

Supabase provides automatic backups. Configure additional backups in Supabase dashboard.

### Update Restaurant Data

Set up a cron job to periodically update restaurant data:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/app && npx tsx scripts/populate-restaurants.ts
```

### Monitor Performance

- Enable Vercel Analytics or use Google Analytics
- Monitor Supabase dashboard for database performance
- Check API rate limits and usage

### Log Aggregation

Configure log aggregation service:
- Vercel: Built-in logging
- Self-hosted: Use Winston, Pino, or similar

## Scaling Considerations

### Database

- Enable connection pooling in Supabase
- Add database indexes for frequently queried fields
- Consider read replicas for high traffic

### API Rate Limiting

Implemented in partner API endpoints. Configure limits in database:

```sql
UPDATE api_keys
SET rate_limit = 10000, rate_limit_window = 3600
WHERE partner_id = 'your-partner-id';
```

### CDN

Configure CDN for static assets:
- Vercel: Automatic edge caching
- Self-hosted: Use Cloudflare or AWS CloudFront

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues

- Verify environment variables
- Check Supabase project status
- Verify API keys are not expired

### Google Places API Errors

- Check API key restrictions
- Verify billing is enabled
- Check daily quota limits

### Email Delivery Issues

- Verify SendGrid API key
- Check sender email verification
- Review SendGrid logs

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables
2. **Enable RLS** - All database tables have Row Level Security
3. **Rate limit APIs** - Implemented for partner endpoints
4. **Validate user input** - Always sanitize data
5. **Use HTTPS** - Required for PWA and secure cookies
6. **Regular updates** - Keep dependencies updated
7. **Monitor logs** - Watch for suspicious activity

## Support

For issues or questions:
- Check GitHub issues
- Review documentation
- Contact support@tastetribe.app
