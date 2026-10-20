import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PATHS = {
  root: ROOT,
  assets: path.join(ROOT, "assets"),
  certs: path.join(ROOT, "certs"),
  data: path.join(ROOT, "data.json"),
  public: path.join(ROOT, "public"),
};

// Flywire-inspired palette. Tweak here to restyle both the pass and the web pages.
export const BRAND = {
  name: "Flywire",
  navy: "#001A3D",
  blue: "#1D6BFF",
  white: "#FFFFFF",
  lightBlue: "#9CC0FF",
  warning: "#FFB020",
  error: "#FF4D4F",
};

export const PASS = {
  passTypeIdentifier: process.env.PASS_TYPE_ID || "pass.com.example.loyalty",
  teamIdentifier: process.env.TEAM_ID || "ABCDE12345",
  serialNumber: process.env.PASS_SERIAL || "FLY-0001",
  organizationName: "Flywire",
};

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

// Accept a secret as raw PEM or base64-encoded PEM, falling back to a file in /certs.
function loadSecret(envName, fileName) {
  const value = process.env[envName];
  if (value) {
    return value.includes("-----BEGIN") ? value.replace(/\\n/g, "\n") : Buffer.from(value, "base64").toString("utf8");
  }
  const file = path.join(PATHS.certs, fileName);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

export function loadCertificates() {
  const certs = {
    signerCert: loadSecret("SIGNER_CERT", "signerCert.pem"),
    signerKey: loadSecret("SIGNER_KEY", "signerKey.pem"),
    wwdr: loadSecret("WWDR_CERT", "wwdr.pem"),
    signerKeyPassphrase: process.env.SIGNER_KEY_PASSPHRASE || undefined,
  };
  const missing = ["signerCert", "signerKey", "wwdr"].filter((k) => !certs[k]);
  return { certs, missing };
}

export function publicUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  // Use the address the visitor actually used. Wallet requires HTTPS, so assume it
  // everywhere except localhost (Replit's proxy terminates TLS in front of the app).
  const host = req.get("host");
  return `${/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? req.protocol : "https"}://${host}`;
}
