import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

function loadLocalEnv() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2];
  }
}

async function probe(name, pathAndQuery) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const response = await fetch(`${url}${pathAndQuery}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`${name} failed: HTTP ${response.status} ${body}`);
  }

  console.log(`${name}: ok`);
}

loadLocalEnv();

const checks = [
  ["profiles access columns", "/rest/v1/profiles?select=user_id,email,invite_status,entitlement_tier&limit=1"],
  ["study_profiles table", "/rest/v1/study_profiles?select=user_id,exam_name&limit=1"],
];

let failed = false;

for (const [name, pathAndQuery] of checks) {
  try {
    await probe(name, pathAndQuery);
  } catch (error) {
    failed = true;
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed) {
  process.exitCode = 1;
}
