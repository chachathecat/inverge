#!/usr/bin/env node

const required = [
  { key: 'E2E_BASE_URL', secret: false },
  { key: 'E2E_USER_EMAIL', secret: false },
  { key: 'E2E_USER_PASSWORD', secret: true },
];

console.log('Inverge E2E environment check');

for (const { key, secret } of required) {
  const value = process.env[key];
  const isSet = Boolean(value && value.trim().length > 0);

  if (secret) {
    console.log(`- ${key}: ${isSet ? 'SET' : 'MISSING'} (value hidden)`);
  } else {
    console.log(`- ${key}: ${isSet ? 'SET' : 'MISSING'}`);
  }
}

console.log('Done. This check never prints secret values and always exits 0.');
process.exit(0);
