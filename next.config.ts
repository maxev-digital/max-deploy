import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['imapflow', 'nodemailer', 'bullmq', 'ioredis'],
};

export default nextConfig;
