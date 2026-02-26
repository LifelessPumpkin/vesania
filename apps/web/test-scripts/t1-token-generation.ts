// T1 — generateToken() produces valid tokens
import crypto from "crypto";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const tokens = Array.from({ length: 10 }, generateToken);

const allCorrectLength = tokens.every(t => t.length === 64);
const allHex = tokens.every(t => /^[a-f0-9]{64}$/.test(t));
const allUnique = new Set(tokens).size === 10;

console.log("=== T1: generateToken() ===");
console.log("Length check (all 64 chars):", allCorrectLength);
console.log("Hex check (lowercase a-f 0-9):", allHex);
console.log("Uniqueness check (10 unique):", allUnique);
console.log("Sample token:", tokens[0]);
console.log("RESULT:", allCorrectLength && allHex && allUnique ? "PASS" : "FAIL");
