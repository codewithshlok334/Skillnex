#!/usr/bin/env node
'use strict';

// Run once after Render assigns the API its public HTTPS origin. This is a
// public server address, never a database URL, API key or connection string.
const fs = require('node:fs');
const path = require('node:path');

function createConfig(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter the Render API HTTPS URL, e.g. https://your-skillnex-api.onrender.com'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.onrender\.com$/.test(url.hostname)
      || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use only your https://SERVICE.onrender.com origin, without credentials, path or query.');
  }
  const noCache = [
    { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
    { key: 'CDN-Cache-Control', value: 'no-store' },
    { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
    { key: 'x-vercel-enable-rewrite-caching', value: '0' },
  ];
  return {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: 'vite',
    installCommand: 'npm ci',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    headers: [
      { source: '/(.*)', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; media-src 'self' blob:; connect-src 'self' wss://generativelanguage.googleapis.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'" },
      ] },
      ...['/api/:path*', '/oauth2/:path*', '/login/oauth2/:path*'].map(source => ({ source, headers: noCache })),
    ],
    rewrites: [
      ...['/api/:path*', '/oauth2/:path*', '/login/oauth2/:path*'].map(source => ({ source, destination: url.origin + source })),
      { source: '/((?!api(?:/|$)|oauth2(?:/|$)|login/oauth2(?:/|$)|assets/|audio/|brand/|images/|favicon\\.svg$).*)', destination: '/index.html' },
    ],
  };
}

function configure(input) {
  const config = createConfig(input);
  const destination = path.resolve(__dirname, '../frontend/vercel.json');
  if (fs.existsSync(destination)) {
    // Preserve the old file before changing a deployment origin.
    const backup = path.resolve(__dirname, '../.local-backups');
    fs.mkdirSync(backup, { recursive: true });
    fs.copyFileSync(destination, path.join(backup, `vercel-${Date.now()}.json`), fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(destination, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log('Created frontend/vercel.json. Commit this public routing file with the project.');
  console.log('In Vercel set Root Directory to frontend. In Render set APP_ORIGIN to your exact Vercel HTTPS origin.');
  console.log('No upload or deployment was performed. API keys belong only in Render Environment settings.');
}

module.exports = { createConfig };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/configure-vercel.cjs https://YOUR-API.onrender.com');
    configure(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
