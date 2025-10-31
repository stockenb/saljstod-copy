const required = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", fallback: "SUPABASE_URL" },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    fallback: "SUPABASE_ANON_KEY",
  },
];

const resolvedEnv = required.reduce((acc, { key, fallback }) => {
  const value = process.env[key] ?? (fallback ? process.env[fallback] : undefined);

  if (!value) {
    console.warn(
      `[env] Missing ${key}${fallback ? ` (or ${fallback})` : ""}`
    );
    return acc;
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
