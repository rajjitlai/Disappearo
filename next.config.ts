import type { NextConfig } from "next";
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

// Dynamically include Appwrite endpoint host for Next/Image remote loader
const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
let appwriteHost = "";
try {
  if (appwriteEndpoint) appwriteHost = new URL(appwriteEndpoint).hostname;
} catch { }

const makePattern = (hostname: string): RemotePattern => ({
  protocol: 'https',
  hostname,
  port: '',
  pathname: '/**',
});

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...(appwriteHost ? [makePattern(appwriteHost)] : []),
      // Appwrite Cloud default + regions
      makePattern('cloud.appwrite.io'),
      makePattern('nyc.cloud.appwrite.io'),
      makePattern('sgp.cloud.appwrite.io'),
      makePattern('fra.cloud.appwrite.io'),
      // Other hosts used in the app
      makePattern('rjsblog.in'),
      makePattern('rajjitlaishram.netlify.app'),
      makePattern('github.com'),
      makePattern('linkedin.com'),
      makePattern('twitter.com'),
      makePattern('dev.to'),
      makePattern('medium.com'),
      makePattern('rajjitlaishram.netlify.app'),
    ],
  },
};

export default nextConfig;
