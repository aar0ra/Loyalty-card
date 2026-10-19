import fs from "node:fs";
import crypto from "node:crypto";
import { PATHS } from "./config.js";

// Tiny JSON-file "database". Fine for a single-pass prototype.
const DEFAULTS = {
  authToken: crypto.randomBytes(24).toString("hex"),
  updatedAt: Date.now(),
  member: {
    name: "Alex Johnson",
    memberId: "FW-100234",
    balance: 1250.0,
    currency: "USD",
    installment: {
      enabled: true,
      amount: 250.0,
      frequency: "Monthly",
      nextDate: "2026-11-01",
      remaining: 5,
    },
    status: "ok", // ok | warning | error
    statusText: "Account in good standing",
    message: "Welcome to Flywire!",
  },
  registrations: [], // { deviceLibraryIdentifier, pushToken, serialNumber }
};

let db;

function load() {
  if (db) return db;
  if (fs.existsSync(PATHS.data)) {
    db = { ...structuredClone(DEFAULTS), ...JSON.parse(fs.readFileSync(PATHS.data, "utf8")) };
  } else {
    db = structuredClone(DEFAULTS);
    save();
  }
  return db;
}

function save() {
  fs.writeFileSync(PATHS.data, JSON.stringify(db, null, 2));
}

export const store = {
  get: () => load(),

  updateMember(patch) {
    load();
    db.member = { ...db.member, ...patch };
    db.updatedAt = Date.now();
    save();
    return db.member;
  },

  register(deviceLibraryIdentifier, pushToken, serialNumber) {
    load();
    const existing = db.registrations.find(
      (r) => r.deviceLibraryIdentifier === deviceLibraryIdentifier && r.serialNumber === serialNumber,
    );
    if (existing) {
      existing.pushToken = pushToken;
      save();
      return false;
    }
    db.registrations.push({ deviceLibraryIdentifier, pushToken, serialNumber });
    save();
    return true;
  },

  unregister(deviceLibraryIdentifier, serialNumber) {
    load();
    db.registrations = db.registrations.filter(
      (r) => !(r.deviceLibraryIdentifier === deviceLibraryIdentifier && r.serialNumber === serialNumber),
    );
    save();
  },

  registrationsForDevice(deviceLibraryIdentifier) {
    return load().registrations.filter((r) => r.deviceLibraryIdentifier === deviceLibraryIdentifier);
  },
};
