import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, hashSessionToken, randomToken, verifyPassword } from "../worker/crypto.js";

test("passwords are salted and verifiable", async () => {
  const first = await hashPassword("mot-de-passe-solide");
  const second = await hashPassword("mot-de-passe-solide");
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyPassword("mot-de-passe-solide", first.salt, first.hash, first.iterations), true);
  assert.equal(await verifyPassword("mauvais-mot-de-passe", first.salt, first.hash, first.iterations), false);
});

test("session tokens are random and only their hash is stable", async () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.equal(await hashSessionToken(first), await hashSessionToken(first));
  assert.notEqual(await hashSessionToken(first), first);
});
