const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const resolvedEnv = required.reduce((acc, key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[env] Missing required env var: ${key}`);
  }

  acc[key] = value;
  return acc;
}, {});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  env: resolvedEnv,
};

module.exports = nextConfig;
