import { readFile } from 'node:fs/promises';

const zipPath =
  process.env.CHROME_EXTENSION_ZIP ?? '.output/meaningful-chrome-mv3.zip';
const extensionId = getRequiredEnv('CHROME_EXTENSION_ID');
const clientId = getRequiredEnv('CHROME_CLIENT_ID');
const clientSecret = getRequiredEnv('CHROME_CLIENT_SECRET');
const refreshToken = getRequiredEnv('CHROME_REFRESH_TOKEN');

const accessToken = await getAccessToken({
  clientId,
  clientSecret,
  refreshToken,
});

await uploadPackage({ accessToken, extensionId, zipPath });
await publishPackage({ accessToken, extensionId });

console.log(`Published Chrome extension ${extensionId}`);

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await readJsonResponse(response);

  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(`Chrome auth failed: ${JSON.stringify(payload)}`);
  }

  return payload.access_token;
}

async function uploadPackage({ accessToken, extensionId, zipPath }) {
  const zip = await readFile(zipPath);
  const response = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/zip',
        'x-goog-api-version': '2',
      },
      body: zip,
    },
  );
  const payload = await readJsonResponse(response);

  if (!response.ok || payload.uploadState !== 'SUCCESS') {
    throw new Error(`Chrome upload failed: ${JSON.stringify(payload)}`);
  }
}

async function publishPackage({ accessToken, extensionId }) {
  const response = await fetch(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-length': '0',
        'x-goog-api-version': '2',
      },
    },
  );
  const payload = await readJsonResponse(response);

  if (!response.ok || !['OK', 'ITEM_PENDING_REVIEW'].includes(payload.status?.[0])) {
    throw new Error(`Chrome publish failed: ${JSON.stringify(payload)}`);
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
