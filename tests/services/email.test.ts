import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendFriendRecommendation,
  sendWeeklyDigest,
  sendFriendActivityNotification,
  friendRecommendationTemplate,
  weeklyDigestTemplate,
  friendActivityTemplate,
} from '@/lib/services/email';

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
  });

  describe('Email Templates', () => {
    describe('friendRecommendationTemplate', () => {
      it('should generate friend recommendation template', () => {
        const template = friendRecommendationTemplate(
          'John Doe',
          'Italian Bistro',
          'https://tastetribe.app/restaurant/123'
        );

        expect(template.subject).toContain('John Doe');
        expect(template.subject).toContain('Italian Bistro');
        expect(template.html).toContain('John Doe');
        expect(template.html).toContain('Italian Bistro');
        expect(template.html).toContain('https://tastetribe.app/restaurant/123');
        expect(template.text).toContain('John Doe');
        expect(template.text).toContain('Italian Bistro');
      });

      it('should include proper HTML structure', () => {
        const template = friendRecommendationTemplate(
          'John',
          'Restaurant',
          'https://example.com'
        );

        expect(template.html).toContain('<!DOCTYPE html>');
        expect(template.html).toContain('<html>');
        expect(template.html).toContain('</html>');
        expect(template.html).toContain('class="button"');
      });

      it('should have matching content in HTML and text versions', () => {
        const template = friendRecommendationTemplate(
          'Alice',
          'Sushi Place',
          'https://test.com'
        );

        expect(template.html).toContain('Alice');
        expect(template.text).toContain('Alice');
        expect(template.html).toContain('Sushi Place');
        expect(template.text).toContain('Sushi Place');
      });
    });

    describe('weeklyDigestTemplate', () => {
      it('should generate weekly digest template with trending restaurants', () => {
        const trendingRestaurants = [
          { name: 'Restaurant 1', rating: 4.5, url: 'https://example.com/1' },
          { name: 'Restaurant 2', rating: 4.8, url: 'https://example.com/2' },
        ];
        const friendActivity = [
          { friendName: 'John', action: 'rated Restaurant A' },
        ];

        const template = weeklyDigestTemplate(
          'Alice',
          trendingRestaurants,
          friendActivity
        );

        expect(template.subject).toContain('Weekly');
        expect(template.html).toContain('Alice');
        expect(template.html).toContain('Restaurant 1');
        expect(template.html).toContain('4.5');
        expect(template.html).toContain('John');
        expect(template.text).toContain('Restaurant 1');
      });

      it('should handle empty trending restaurants', () => {
        const template = weeklyDigestTemplate('Bob', [], []);

        expect(template.html).toBeDefined();
        expect(template.text).toBeDefined();
      });

      it('should format ratings correctly', () => {
        const restaurants = [
          { name: 'Test', rating: 4.666666, url: 'https://test.com' },
        ];

        const template = weeklyDigestTemplate('User', restaurants, []);

        expect(template.html).toContain('4.7');
      });
    });

    describe('friendActivityTemplate', () => {
      it('should generate friend activity template with restaurant', () => {
        const template = friendActivityTemplate(
          'John',
          'rated 5 stars',
          'Italian Bistro',
          'https://example.com/restaurant'
        );

        expect(template.subject).toContain('John');
        expect(template.subject).toContain('rated 5 stars');
        expect(template.html).toContain('John');
        expect(template.html).toContain('Italian Bistro');
        expect(template.html).toContain('https://example.com/restaurant');
      });

      it('should work without restaurant information', () => {
        const template = friendActivityTemplate('Alice', 'joined TasteTribe');

        expect(template.subject).toContain('Alice');
        expect(template.subject).toContain('joined TasteTribe');
        expect(template.html).toContain('Alice');
        expect(template.html).not.toContain('class="button"');
      });
    });
  });

  describe('Email Sending', () => {
    describe('sendFriendRecommendation', () => {
      it('should send email successfully', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

        const result = await sendFriendRecommendation(
          'test@example.com',
          'John',
          'Restaurant',
          'https://test.com'
        );

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.sendgrid.com/v3/mail/send',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: expect.stringContaining('Bearer'),
            }),
          })
        );
      });

      it('should handle SendGrid API errors', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        } as Response);

        const result = await sendFriendRecommendation(
          'invalid@example.com',
          'John',
          'Restaurant',
          'https://test.com'
        );

        expect(result.success).toBe(false);
        expect(result.error).not.toBeNull();
      });

      it('should handle missing API key', async () => {
        delete process.env.SENDGRID_API_KEY;

        const result = await sendFriendRecommendation(
          'test@example.com',
          'John',
          'Restaurant',
          'https://test.com'
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('SendGrid not configured');
      });

      it('should include proper email structure', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

        await sendFriendRecommendation(
          'test@example.com',
          'John',
          'Restaurant',
          'https://test.com'
        );

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('personalizations'),
          })
        );

        const callArgs = (global.fetch as any).mock.calls[0][1];
        const body = JSON.parse(callArgs.body);

        expect(body.personalizations[0].to[0].email).toBe('test@example.com');
        expect(body.from.email).toBeDefined();
        expect(body.from.name).toBe('TasteTribe');
        expect(body.content).toHaveLength(2);
        expect(body.content[0].type).toBe('text/plain');
        expect(body.content[1].type).toBe('text/html');
      });
    });

    describe('sendWeeklyDigest', () => {
      it('should send weekly digest successfully', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

        const result = await sendWeeklyDigest(
          'test@example.com',
          'John',
          [{ name: 'Restaurant', rating: 4.5, url: 'https://test.com' }],
          [{ friendName: 'Alice', action: 'rated a restaurant' }]
        );

        expect(result.success).toBe(true);
        expect(result.error).toBeNull();
      });

      it('should handle network errors', async () => {
        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

        const result = await sendWeeklyDigest(
          'test@example.com',
          'John',
          [],
          []
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Network error');
      });
    });

    describe('sendFriendActivityNotification', () => {
      it('should send activity notification with restaurant', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

        const result = await sendFriendActivityNotification(
          'test@example.com',
          'John',
          'rated 5 stars',
          'Italian Bistro',
          'https://test.com'
        );

        expect(result.success).toBe(true);
      });

      it('should send activity notification without restaurant', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 202,
        } as Response);

        const result = await sendFriendActivityNotification(
          'test@example.com',
          'Alice',
          'joined TasteTribe'
        );

        expect(result.success).toBe(true);
      });
    });
  });
});
