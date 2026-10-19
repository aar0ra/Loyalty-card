import http2 from "node:http2";
import { PASS, loadCertificates } from "./config.js";

// Wallet passes always use the production APNs gateway, authenticated with the
// same Pass Type ID certificate that signs the pass. The payload is empty: it just
// tells the device "go fetch the latest pass from the web service".
const APNS_HOST = "https://api.push.apple.com";

export async function pushUpdate(pushTokens) {
  if (!pushTokens.length) return [];
  const { certs, missing } = loadCertificates();
  if (missing.length) throw new Error(`Missing certificate(s): ${missing.join(", ")}`);

  const client = http2.connect(APNS_HOST, {
    cert: certs.signerCert,
    key: certs.signerKey,
    passphrase: certs.signerKeyPassphrase,
  });

  // Without a listener, a connection error (bad cert, no network) would crash the server.
  const connectionError = new Promise((_, reject) => client.on("error", reject));

  try {
    return await Promise.race([Promise.all(pushTokens.map((token) => sendOne(client, token))), connectionError]);
  } finally {
    client.close();
  }
}

function sendOne(client, token) {
  return new Promise((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      "apns-topic": PASS.passTypeIdentifier,
      "content-type": "application/json",
    });
    let status;
    let body = "";
    req.on("response", (headers) => (status = headers[":status"]));
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve({ token: token.slice(0, 8) + "…", status, body: body || undefined }));
    req.on("error", (err) => resolve({ token: token.slice(0, 8) + "…", status: "error", body: err.message }));
    req.end("{}");
  });
}
