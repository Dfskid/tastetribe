import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingConfigMessage =
  'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.';

const shouldLogMissingConfigWarning = !supabaseUrl || !supabaseAnonKey;
let hasLoggedMissingConfigWarning = false;

function createRejectedPromise() {
  const rejection = Promise.reject(new Error(missingConfigMessage));
  rejection.catch(() => {});
  return rejection;
}

function createStubClient() {
  if (
    shouldLogMissingConfigWarning &&
    !hasLoggedMissingConfigWarning &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn(missingConfigMessage);
    hasLoggedMissingConfigWarning = true;
  }

  const createProxy = (): any =>
    new Proxy(() => {}, {
      get(_target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          const rejection = createRejectedPromise();
          const method = rejection[prop as keyof Promise<never>];
          return typeof method === 'function' ? method.bind(rejection) : undefined;
        }

        return createProxy();
      },
      apply() {
        return createProxy();
      },
    });

  return createProxy();
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : (createStubClient() as ReturnType<typeof createSupabaseClient>);

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createStubClient() as ReturnType<typeof createSupabaseClient>;
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
