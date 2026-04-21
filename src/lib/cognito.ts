/**
 * Small server-side helpers for Cognito hosted-login.
 *
 * Two public functions:
 *   - getHostedLoginUrl(state, redirectUri): URL to redirect the browser to.
 *   - exchangeCodeForTokens(code, redirectUri): POST /oauth2/token.
 *
 * v0.1: email/password, no MFA, single user pool.
 */

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set — see .env.example`);
  return v;
}

export function getHostedLoginUrl(
  redirectUri: string,
  state?: string,
): string {
  const domain = reqEnv("COGNITO_DOMAIN");
  const clientId = reqEnv("COGNITO_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: redirectUri,
  });
  if (state) params.set("state", state);
  // Both http and https domains use /login; we always force https on deploy.
  const scheme = domain.startsWith("http") ? "" : "https://";
  return `${scheme}${domain}/login?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const domain = reqEnv("COGNITO_DOMAIN");
  const clientId = reqEnv("COGNITO_CLIENT_ID");
  const scheme = domain.startsWith("http") ? "" : "https://";
  const url = `${scheme}${domain}/oauth2/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(
      `Cognito token exchange failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export function getLogoutUrl(redirectUri: string): string {
  const domain = reqEnv("COGNITO_DOMAIN");
  const clientId = reqEnv("COGNITO_CLIENT_ID");
  const scheme = domain.startsWith("http") ? "" : "https://";
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: redirectUri,
  });
  return `${scheme}${domain}/logout?${params.toString()}`;
}
