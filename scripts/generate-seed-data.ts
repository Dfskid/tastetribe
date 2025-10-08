/**
 * Seed Data Generator
 *
 * Generates comprehensive test data including users, friendships, ratings, and reviews.
 * Run with: npx tsx scripts/generate-seed-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NUM_USERS = 50;
const NUM_FRIENDSHIPS_PER_USER = 5;
const NUM_RATINGS_PER_USER = 15;

interface User {
  id: string;
  email: string;
  password: string;
}

async function createTestUsers(count: number): Promise<User[]> {
  console.log(`Creating ${count} test users...`);
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email().toLowerCase();
    const password = 'Test123!@#';

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: faker.person.fullName(),
        },
      });

      if (error) {
        console.error(`Failed to create user ${email}:`, error.message);
        continue;
      }

      if (data.user) {
        users.push({
          id: data.user.id,
          email,
          password,
        });

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          display_name: faker.person.fullName(),
          avatar_url: faker.image.avatar(),
          onboarding_completed: true,
          onboarding_step: 3,
          onboarding_completed_at: faker.date.past().toISOString(),
        });

        if (profileError) {
          console.error(`Failed to create profile for ${email}:`, profileError.message);
        }
      }

      if ((i + 1) % 10 === 0) {
        console.log(`Created ${i + 1}/${count} users`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error creating user ${email}:`, error);
    }
  }

  console.log(`Successfully created ${users.length} users\n`);
  return users;
}

async function createFriendships(users: User[], friendshipsPerUser: number) {
  console.log(`Creating friendships (${friendshipsPerUser} per user)...`);
  let created = 0;

  for (const user of users) {
    const friendIndices = new Set<number>();
    while (friendIndices.size < Math.min(friendshipsPerUser, users.length - 1)) {
      const randomIndex = Math.floor(Math.random() * users.length);
      if (users[randomIndex].id !== user.id) {
        friendIndices.add(randomIndex);
      }
    }

    for (const friendIndex of Array.from(friendIndices)) {
      const friend = users[friendIndex];

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${user.id})`
        )
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('friendships').insert({
          user_id: user.id,
          friend_id: friend.id,
          status: 'accepted',
          created_at: faker.date.past().toISOString(),
          updated_at: faker.date.past().toISOString(),
        });

        if (!error) {
          created++;
        }
      }
    }
  }

  console.log(`Created ${created} friendships\n`);
}

async function createRatings(users: User[], ratingsPerUser: number) {
  console.log(`Creating ratings (${ratingsPerUser} per user)...`);

  const { data: restaurants } = await supabase
    .from('items')
    .select('id')
    .eq('category_type', 'restaurant')
    .limit(200);

  if (!restaurants || restaurants.length === 0) {
    console.log('No restaurants found. Skipping ratings creation.');
    return;
  }

  let created = 0;

  for (const user of users) {
    const ratedRestaurants = new Set<string>();

    for (let i = 0; i < ratingsPerUser; i++) {
      const randomRestaurant =
        restaurants[Math.floor(Math.random() * restaurants.length)];

      if (ratedRestaurants.has(randomRestaurant.id)) {
        continue;
      }

      ratedRestaurants.add(randomRestaurant.id);

      const rating = Math.floor(Math.random() * 3) + 3;
      const hasReview = Math.random() > 0.7;

      const { error } = await supabase.from('user_ratings').insert({
        user_id: user.id,
        item_id: randomRestaurant.id,
        rating,
        review: hasReview ? faker.lorem.paragraph() : null,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.past().toISOString(),
      });

      if (!error) {
        created++;
      }
    }
  }

  console.log(`Created ${created} ratings\n`);
}

async function createInvitations(users: User[]) {
  console.log('Creating sample invitations...');
  let created = 0;

  for (let i = 0; i < Math.min(20, users.length); i++) {
    const user = users[i];

    const { error } = await supabase.from('invitations').insert({
      inviter_id: user.id,
      invitee_email: faker.internet.email(),
      invitation_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      status: Math.random() > 0.5 ? 'accepted' : 'pending',
      sent_via: ['email', 'link', 'sms'][Math.floor(Math.random() * 3)],
      sent_at: faker.date.past().toISOString(),
      accepted_at: Math.random() > 0.5 ? faker.date.past().toISOString() : null,
      expires_at: faker.date.future().toISOString(),
    });

    if (!error) {
      created++;
    }
  }

  console.log(`Created ${created} invitations\n`);
}

async function main() {
  console.log('=== Starting Seed Data Generation ===\n');

  const users = await createTestUsers(NUM_USERS);

  if (users.length === 0) {
    console.error('No users created. Exiting.');
    return;
  }

  await createFriendships(users, NUM_FRIENDSHIPS_PER_USER);
  await createRatings(users, NUM_RATINGS_PER_USER);
  await createInvitations(users);

  console.log('=== Seed Data Generation Complete ===');
  console.log(`\nGenerated:`);
  console.log(`- ${users.length} users`);
  console.log(`- ~${users.length * NUM_FRIENDSHIPS_PER_USER} friendships`);
  console.log(`- ~${users.length * NUM_RATINGS_PER_USER} ratings`);
  console.log(`- 20 invitations`);
}

main().catch(console.error);
