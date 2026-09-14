const encoder = new TextEncoder();

// Maximum actuellement accepte par le runtime Web Crypto de Cloudflare Workers.
export const PASSWORD_ITERATIONS = 100_000;

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashPassword(password, salt = randomToken(16), iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", salt: base64UrlToBytes(salt), iterations },
    key,
    256
  );
  return { hash: bytesToBase64Url(new Uint8Array(bits)), salt, iterations };
}

export async function verifyPassword(password, salt, expectedHash, iterations) {
  const actual = await hashPassword(password, salt, iterations);
  return timingSafeEqual(base64UrlToBytes(actual.hash), base64UrlToBytes(expectedHash));
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function timingSafeEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
