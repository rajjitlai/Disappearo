import type { NextConfig } from "next";

// Dynamically include Appwrite endpoint host for Next/Image remote loader
const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
let appwriteHost = "";
try {
  if (appwriteEndpoint) appwriteHost = new URL(appwriteEndpoint).hostname;
} catch { }

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...(appwriteHost
        ? [{ protocol: 'https', hostname: appwriteHost, port: '', pathname: '/**' }]
        : []),
      // Appwrite Cloud default host
      { protocol: 'https', hostname: 'cloud.appwrite.io', port: '', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'rjsblog.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rajjitlaishram.netlify.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'linkedin.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'twitter.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dev.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'medium.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rajjitlaishram.netlify.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
