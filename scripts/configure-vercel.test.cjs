'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConfig } = require('./configure-vercel.cjs');

test('same-origin proxy preserves API and OAuth paths ahead of page navigation', () => {
  const config = createConfig('https://skillnex-test.onrender.com/');
  assert.deepEqual(config.rewrites.slice(0, 3), [
    { source: '/api/:path*', destination: 'https://skillnex-test.onrender.com/api/:path*' },
    { source: '/oauth2/:path*', destination: 'https://skillnex-test.onrender.com/oauth2/:path*' },
    { source: '/login/oauth2/:path*', destination: 'https://skillnex-test.onrender.com/login/oauth2/:path*' },
  ]);
  assert.equal(config.outputDirectory, 'dist');
});

test('reject private or mistyped endpoints and any embedded secret', () => {
  for (const value of ['http://skillnex.onrender.com', 'https://localhost', 'https://127.0.0.1',
    'https://onrender.com.attacker.test', 'https://user:secret@skillnex.onrender.com',
    'https://skillnex.onrender.com/api', 'https://skillnex.onrender.com?key=secret',
    'https://skillnex.onrender.com#fragment', 'https://skillnex.onrender.com:8080',
    'postgresql://user:secret@host/db', '']) {
    assert.throws(() => createConfig(value), value);
  }
});

test('authenticated responses never opt into CDN caching', () => {
  const config = createConfig('https://skillnex-test.onrender.com');
  for (const rule of config.headers.slice(1)) {
    const headers = Object.fromEntries(rule.headers.map(h => [h.key, h.value]));
    assert.match(headers['Cache-Control'], /no-store/);
    assert.equal(headers['Vercel-CDN-Cache-Control'], 'no-store');
    assert.equal(headers['x-vercel-enable-rewrite-caching'], '0');
  }
});

test('interview allows same-origin hardware, recorded audio and the exact Gemini websocket', () => {
  const headers = Object.fromEntries(createConfig('https://skillnex-test.onrender.com').headers[0].headers.map(h => [h.key, h.value]));
  assert.equal(headers['Permissions-Policy'], 'camera=(self), microphone=(self), geolocation=()');
  assert.match(headers['Content-Security-Policy'], /media-src 'self' blob:/);
  assert.match(headers['Content-Security-Policy'], /connect-src 'self' wss:\/\/generativelanguage\.googleapis\.com;/);
});

test('page fallback covers deep links without swallowing API or static assets', () => {
  const rule = createConfig('https://skillnex-test.onrender.com').rewrites.at(-1);
  const pattern = new RegExp('^' + rule.source + '$');
  for (const page of ['/', '/login', '/signup', '/app/interviews/123', '/app/codelab/trail-total']) assert.ok(pattern.test(page), page);
  for (const resource of ['/api/config', '/api', '/oauth2/authorization/google', '/login/oauth2/code/google',
    '/assets/app.js', '/audio/pcm-capture.js', '/brand/skillnex-mark.png', '/images/maya-ai-interviewer.png', '/favicon.svg']) {
    assert.equal(pattern.test(resource), false, resource);
  }
});
