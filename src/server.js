import express from "express";
import QRCode from "qrcode";
import { ADMIN_PASSWORD, PASS, PATHS, loadCertificates, publicUrl } from "./config.js";
import { store } from "./store.js";
import { buildPass } from "./pass.js";
import { pushUpdate } from "./apns.js";
import { homePage, adminPage } from "./views.js";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(PATHS.public));
app.use("/assets", express.static(PATHS.assets));

const log = (...args) => console.log(new Date().toISOString(), ...args);

function sendPass(req, res) {
  try {
    const buffer = buildPass(store.get(), publicUrl(req));
    res
      .set({
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="flywire-loyalty.pkpass"`,
        "Last-Modified": new Date(store.get().updatedAt).toUTCString(),
        "Cache-Control": "no-store",
      })
      .send(buffer);
  } catch (err) {
    log("Pass build failed:", err.message);
    res.status(500).type("text").send(`Could not build pass: ${err.message}`);
  }
}

// ---------- Web pages ----------

app.get("/", async (req, res) => {
  const passUrl = `${publicUrl(req)}/pass.pkpass`;
  const qr = await QRCode.toDataURL(publicUrl(req), { margin: 1, width: 220 });
  res.send(homePage({ db: store.get(), passUrl, qr, certsMissing: loadCertificates().missing }));
});

app.get("/pass.pkpass", sendPass);

// QR image for the on-page card preview (same content as the QR on the pass)
app.get("/member-qr.png", async (req, res) => {
  res.type("png").send(await QRCode.toBuffer(store.get().member.memberId, { margin: 1, width: 240 }));
});

function adminAuth(req, res, next) {
  const [, encoded] = (req.headers.authorization || "").split(" ");
  const [, password] = Buffer.from(encoded || "", "base64").toString().split(":");
  if (password === ADMIN_PASSWORD) return next();
  res.set("WWW-Authenticate", 'Basic realm="Flywire Admin"').status(401).send("Authentication required");
}

app.get("/admin", adminAuth, (req, res) => {
  res.send(adminPage({ db: store.get(), certsMissing: loadCertificates().missing, publicUrl: publicUrl(req) }));
});

app.post("/admin", adminAuth, async (req, res) => {
  const b = req.body;
  store.updateMember({
    name: b.name,
    memberId: b.memberId,
    balance: Number(b.balance) || 0,
    installment: {
      enabled: b.installmentEnabled === "on",
      amount: Number(b.installmentAmount) || 0,
      frequency: b.installmentFrequency || "Monthly",
      nextDate: b.installmentNextDate,
      remaining: Number(b.installmentRemaining) || 0,
    },
    status: ["ok", "warning", "error"].includes(b.status) ? b.status : "ok",
    statusText: b.statusText,
    message: b.message,
  });

  let result;
  try {
    const tokens = [...new Set(store.get().registrations.map((r) => r.pushToken))];
    const pushes = await pushUpdate(tokens);
    result = { ok: true, text: `Saved. Push sent to ${pushes.length} device(s).`, details: pushes };
  } catch (err) {
    result = { ok: false, text: `Saved, but push failed: ${err.message}` };
  }
  log("Admin update:", result.text, JSON.stringify(result.details || []));
  res.send(adminPage({ db: store.get(), certsMissing: loadCertificates().missing, publicUrl: publicUrl(req), result }));
});

// ---------- Apple Wallet web service (PassKit protocol) ----------
// https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

function walletAuth(req, res, next) {
  if (req.params.passTypeIdentifier !== PASS.passTypeIdentifier) return res.sendStatus(404);
  if (req.headers.authorization !== `ApplePass ${store.get().authToken}`) return res.sendStatus(401);
  next();
}

// Device registers for updates to a pass
app.post("/v1/devices/:deviceId/registrations/:passTypeIdentifier/:serial", walletAuth, (req, res) => {
  const created = store.register(req.params.deviceId, req.body.pushToken, req.params.serial);
  log("Device registered:", req.params.deviceId, created ? "(new)" : "(existing)");
  res.sendStatus(created ? 201 : 200);
});

// Device stops receiving updates (pass removed)
app.delete("/v1/devices/:deviceId/registrations/:passTypeIdentifier/:serial", walletAuth, (req, res) => {
  store.unregister(req.params.deviceId, req.params.serial);
  log("Device unregistered:", req.params.deviceId);
  res.sendStatus(200);
});

// Device asks which passes changed since its last update
app.get("/v1/devices/:deviceId/registrations/:passTypeIdentifier", (req, res) => {
  if (req.params.passTypeIdentifier !== PASS.passTypeIdentifier) return res.sendStatus(404);
  const regs = store.registrationsForDevice(req.params.deviceId);
  if (!regs.length) return res.sendStatus(404);
  const { updatedAt } = store.get();
  const since = Number(req.query.passesUpdatedSince) || 0;
  if (updatedAt <= since) return res.sendStatus(204);
  res.json({ serialNumbers: [...new Set(regs.map((r) => r.serialNumber))], lastUpdated: String(updatedAt) });
});

// Device downloads the latest version of the pass
app.get("/v1/passes/:passTypeIdentifier/:serial", walletAuth, (req, res) => {
  if (req.params.serial !== PASS.serialNumber) return res.sendStatus(404);
  log("Device fetched latest pass");
  sendPass(req, res);
});

// Wallet sends error logs here — very handy when debugging
app.post("/v1/log", (req, res) => {
  log("Wallet log:", JSON.stringify(req.body));
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  const { missing } = loadCertificates();
  log(`Flywire loyalty app running on port ${port}`);
  if (missing.length) log(`⚠️  Missing certificates: ${missing.join(", ")} — see README.`);
});
