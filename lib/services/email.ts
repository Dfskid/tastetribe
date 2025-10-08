/**
 * Email Notification Service
 *
 * Handles sending emails via SendGrid for various user notifications.
 */

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@tastetribe.app';
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email via SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    if (!SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return { success: false, error: new Error('SendGrid not configured') };
    }

    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'TasteTribe' },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'No response';
      throw new Error(`SendGrid API error: ${response?.status || 'N/A'} - ${errorText}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Email template: Friend recommendation
 */
export function friendRecommendationTemplate(
  friendName: string,
  restaurantName: string,
  restaurantUrl: string
): EmailTemplate {
  return {
    subject: `${friendName} recommended ${restaurantName} for you!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #ffffff; padding: 30px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Recommendation!</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              <p>${friendName} thinks you'd love <strong>${restaurantName}</strong> and wanted to share it with you.</p>
              <p>Check it out and let them know what you think!</p>
              <a href="${restaurantUrl}" class="button">View Restaurant</a>
            </div>
            <div class="footer">
              <p>TasteTribe - Discover restaurants with friends</p>
              <p><a href="#">Unsubscribe</a> | <a href="#">Manage preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi there!\n\n${friendName} thinks you'd love ${restaurantName} and wanted to share it with you.\n\nCheck it out: ${restaurantUrl}\n\nTasteTribe - Discover restaurants with friends`,
  };
}

/**
 * Email template: Weekly digest
 */
export function weeklyDigestTemplate(
  userName: string,
  trendingRestaurants: Array<{ name: string; rating: number; url: string }>,
  friendActivity: Array<{ friendName: string; action: string }>,
): EmailTemplate {
  const restaurantsList = trendingRestaurants
    .map(
      (r) => `<li><strong>${r.name}</strong> - ${r.rating.toFixed(1)} stars <a href="${r.url}">View</a></li>`
    )
    .join('');

  const activityList = friendActivity
    .map((a) => `<li>${a.friendName} ${a.action}</li>`)
    .join('');

  return {
    subject: 'Your Weekly TasteTribe Digest',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #ffffff; padding: 30px; }
            .section { margin-bottom: 30px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            ul { padding-left: 20px; }
            li { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Weekly Digest</h1>
            </div>
            <div class="content">
              <p>Hi ${userName}!</p>
              <p>Here's what's been happening on TasteTribe this week:</p>

              <div class="section">
                <h2>🔥 Trending Restaurants</h2>
                <ul>${restaurantsList}</ul>
              </div>

              <div class="section">
                <h2>👥 Friend Activity</h2>
                <ul>${activityList}</ul>
              </div>

              <p>Don't miss out - check out these spots and share your thoughts!</p>
            </div>
            <div class="footer">
              <p>TasteTribe - Discover restaurants with friends</p>
              <p><a href="#">Unsubscribe</a> | <a href="#">Manage preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${userName}!\n\nHere's your weekly TasteTribe digest:\n\nTrending Restaurants:\n${trendingRestaurants.map((r) => `- ${r.name} (${r.rating.toFixed(1)} stars)`).join('\n')}\n\nFriend Activity:\n${friendActivity.map((a) => `- ${a.friendName} ${a.action}`).join('\n')}\n\nTasteTribe - Discover restaurants with friends`,
  };
}

/**
 * Email template: Friend activity notification
 */
export function friendActivityTemplate(
  friendName: string,
  activity: string,
  restaurantName?: string,
  restaurantUrl?: string
): EmailTemplate {
  return {
    subject: `${friendName} ${activity}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; color: white; }
            .content { background: #ffffff; padding: 30px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Friend Activity</h1>
            </div>
            <div class="content">
              <p><strong>${friendName}</strong> ${activity}${restaurantName ? ` at ${restaurantName}` : ''}.</p>
              ${restaurantUrl ? `<a href="${restaurantUrl}" class="button">Check it out</a>` : ''}
            </div>
            <div class="footer">
              <p>TasteTribe - Discover restaurants with friends</p>
              <p><a href="#">Unsubscribe</a> | <a href="#">Manage preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `${friendName} ${activity}${restaurantName ? ` at ${restaurantName}` : ''}.\n\n${restaurantUrl ? `Check it out: ${restaurantUrl}` : ''}\n\nTasteTribe - Discover restaurants with friends`,
  };
}

/**
 * Send friend recommendation email
 */
export async function sendFriendRecommendation(
  toEmail: string,
  friendName: string,
  restaurantName: string,
  restaurantUrl: string
): Promise<{ success: boolean; error: Error | null }> {
  const template = friendRecommendationTemplate(friendName, restaurantName, restaurantUrl);
  return await sendEmail(toEmail, template.subject, template.html, template.text);
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigest(
  toEmail: string,
  userName: string,
  trendingRestaurants: Array<{ name: string; rating: number; url: string }>,
  friendActivity: Array<{ friendName: string; action: string }>
): Promise<{ success: boolean; error: Error | null }> {
  const template = weeklyDigestTemplate(userName, trendingRestaurants, friendActivity);
  return await sendEmail(toEmail, template.subject, template.html, template.text);
}

/**
 * Send friend activity notification
 */
export async function sendFriendActivityNotification(
  toEmail: string,
  friendName: string,
  activity: string,
  restaurantName?: string,
  restaurantUrl?: string
): Promise<{ success: boolean; error: Error | null }> {
  const template = friendActivityTemplate(friendName, activity, restaurantName, restaurantUrl);
  return await sendEmail(toEmail, template.subject, template.html, template.text);
}
