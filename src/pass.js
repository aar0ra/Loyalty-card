import fs from "node:fs";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { BRAND, PASS, PATHS, loadCertificates } from "./config.js";

const STATUS = {
  ok: { header: "ACTIVE", icon: "✅", labelColor: BRAND.lightBlue },
  warning: { header: "WARNING", icon: "⚠️", labelColor: BRAND.warning },
  error: { header: "ACTION NEEDED", icon: "⛔️", labelColor: BRAND.error },
};

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

export const money = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount) || 0);

const prettyDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function loadImages() {
  const images = {};
  for (const file of fs.readdirSync(PATHS.assets)) {
    if (file.endsWith(".png")) images[file] = fs.readFileSync(path.join(PATHS.assets, file));
  }
  return images;
}

export function buildPass({ member, authToken, updatedAt }, webServiceURL) {
  const { certs, missing } = loadCertificates();
  if (missing.length) {
    throw new Error(`Missing certificate(s): ${missing.join(", ")}. See README → "Certificates".`);
  }

  const status = STATUS[member.status] || STATUS.ok;
  const plan = member.installment || {};

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: PASS.passTypeIdentifier,
    teamIdentifier: PASS.teamIdentifier,
    serialNumber: PASS.serialNumber,
    organizationName: PASS.organizationName,
    description: "Flywire Loyalty Card",
    backgroundColor: rgb(BRAND.navy),
    foregroundColor: rgb(BRAND.white),
    labelColor: rgb(status.labelColor),
    authenticationToken: authToken,
    webServiceURL,
    sharingProhibited: true,
    storeCard: {},
  };

  const pass = new PKPass({ ...loadImages(), "pass.json": Buffer.from(JSON.stringify(passJson)) }, certs);

  pass.headerFields.push({
    key: "status",
    label: "STATUS",
    value: status.header,
    changeMessage: "Account status: %@",
  });

  pass.primaryFields.push({
    key: "balance",
    label: "BALANCE DUE",
    value: Number(member.balance) || 0,
    currencyCode: member.currency || "USD",
    changeMessage: "Your balance is now %@",
  });

  pass.secondaryFields.push({ key: "member", label: "MEMBER", value: member.name });
  pass.secondaryFields.push({
    key: "plan",
    label: "INSTALLMENT PLAN",
    value: plan.enabled ? `${money(plan.amount, member.currency)} ${plan.frequency}` : "Not set up",
    changeMessage: "Installment plan: %@",
  });

  pass.auxiliaryFields.push({
    key: "statusText",
    label: "ACCOUNT",
    value: `${status.icon} ${member.statusText}`,
    changeMessage: "%@",
  });
  if (plan.enabled) {
    pass.auxiliaryFields.push({ key: "nextPayment", label: "NEXT PAYMENT", value: prettyDate(plan.nextDate), textAlignment: "PKTextAlignmentRight" });
  }

  pass.backFields.push(
    { key: "message", label: "Latest message", value: member.message || "—", changeMessage: "%@" },
    { key: "memberId", label: "Member ID", value: member.memberId },
    { key: "balanceBack", label: "Balance", value: money(member.balance, member.currency) },
    {
      key: "planBack",
      label: "Installment plan",
      value: plan.enabled
        ? `${money(plan.amount, member.currency)} ${plan.frequency}\nNext payment: ${prettyDate(plan.nextDate)}\nPayments remaining: ${plan.remaining}`
        : "No installment plan set up.",
    },
    { key: "updated", label: "Last updated", value: new Date(updatedAt).toISOString(), dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" },
    { key: "support", label: "Help", value: "Visit flywire.com for support.", dataDetectorTypes: ["PKDataDetectorTypeLink"] },
  );

  pass.setBarcodes({
    message: member.memberId,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: member.memberId,
  });

  return pass.getAsBuffer();
}
