// Bill-reminder sender for the Expense Tracker web app.
//
// Runs once a morning from GitHub Actions (see
// .github/workflows/bill-reminders.yml). Reads every user's bills and
// push-device subscriptions from Firestore with a service account,
// decides which bills need a push today, and sends standard Web Push
// messages (no FCM — subscriptions come straight from the Push API in
// the app, so iPhone Home Screen apps work too).
//
// Per bill (dueDate = its NEXT due date; marking a bill paid in the app
// advances it, which re-arms all three reminders for the new cycle):
//   1. Reminder  — the day the bill enters its own "Remind Me" window
//                  (per-bill reminderDays, user-chosen; also catches
//                  bills created already inside their window)
//   2. Due       — on the due date itself
//   3. Past due  — the first morning it is overdue (once per cycle)
// Each send is recorded on the bill doc (reminderSentForDue /
// dueSentForDue / pastDueSentForDue, compared against the current
// dueDate) so nothing ever sends twice for the same cycle.
// Every notification carries the bill name, amount, and due date.
//
// Required env (GitHub Secrets):
//   FIREBASE_SERVICE_ACCOUNT_JSON — full JSON of the sender's Firebase
//                                   service account key
//   VAPID_PRIVATE_KEY             — private half of the VAPID key pair
//                                   (public half is in app.js + below)
// Optional env:
//   DRY_RUN=true                  — log what would be sent, send nothing
//                                   and write no markers

"use strict";

const admin = require("firebase-admin");
const webpush = require("web-push");

// Must match WEB_PUSH_PUBLIC_KEY in app.js.
const VAPID_PUBLIC_KEY = "BFvMoeHWpZ-ywEvoga3Eutq4G1FWxoJB2eDwqJIzwI7QyJmegdY2tcUm_F02okCV1egbRyTFV9DaPR3zRafKPsM";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:nelson17veloz@gmail.com";
const APP_URL = "https://nelson17veloz.github.io/expense-tracker-app/";
const DEFAULT_TIMEZONE = "America/New_York";
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name} (set it in GitHub Secrets)`);
  return value;
}

// "YYYY-MM-DD" calendar day of a timestamp in a timezone, as a UTC day
// serial number so two of them can be subtracted to get whole days.
function daySerial(timestampMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestampMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
}

function formatDueDate(timestampMs, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(timestampMs));
}

function buildMessage(kind, bill, daysUntil, timeZone, currency) {
  const name = String(bill.name || "Bill");
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(bill.amount || 0));
  const dueStr = formatDueDate(Number(bill.dueDate), timeZone);
  if (kind === "reminder") {
    const when = daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
    return { title: `Bill reminder: ${name}`, body: `${name} — ${amount} — due ${dueStr} (${when})` };
  }
  if (kind === "due") {
    return { title: `Bill due today: ${name}`, body: `${name} — ${amount} — due today, ${dueStr}` };
  }
  const ago = daysUntil === -1 ? "1 day ago" : `${-daysUntil} days ago`;
  return { title: `Bill past due: ${name}`, body: `${name} — ${amount} — was due ${dueStr} (${ago})` };
}

// The VAPID private key is a single 43-character URL-safe Base64 token
// that decodes to 32 bytes. Be forgiving about how the secret was
// pasted (extra words/whitespace around it, e.g. the whole key file):
// if the raw value isn't exactly that token, scan it for a run of
// Base64-URL characters that is.
function cleanVapidPrivateKey(raw) {
  const trimmed = String(raw || "").trim();
  const isKey = (s) => /^[A-Za-z0-9_-]+$/.test(s) && Buffer.from(s, "base64url").length === 32;
  if (isKey(trimmed)) return trimmed;
  const runs = trimmed.match(/[A-Za-z0-9_-]{20,}/g) || [];
  for (const run of runs) {
    if (isKey(run)) return run;
  }
  return trimmed; // let web-push throw its precise validation error
}

async function main() {
  const serviceAccount = JSON.parse(requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON"));
  const vapidPrivateKey = cleanVapidPrivateKey(requireEnv("VAPID_PRIVATE_KEY"));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey);

  // Group devices and bills by owning user (collectionGroup reaches
  // every users/{uid}/... subtree without needing parent docs).
  const devicesByUser = new Map();
  const devicesSnap = await db.collectionGroup("devices").get();
  devicesSnap.forEach((doc) => {
    const uid = doc.ref.parent.parent && doc.ref.parent.parent.id;
    if (!uid) return;
    if (!devicesByUser.has(uid)) devicesByUser.set(uid, []);
    devicesByUser.get(uid).push({ ref: doc.ref, data: doc.data() });
  });

  const billsByUser = new Map();
  const billsSnap = await db.collectionGroup("bills").get();
  billsSnap.forEach((doc) => {
    const uid = doc.ref.parent.parent && doc.ref.parent.parent.id;
    if (!uid) return;
    if (!billsByUser.has(uid)) billsByUser.set(uid, []);
    billsByUser.get(uid).push({ ref: doc.ref, data: doc.data() });
  });

  let sent = 0;
  let pruned = 0;
  let skippedUsers = 0;

  for (const [uid, bills] of billsByUser) {
    const devices = devicesByUser.get(uid) || [];
    if (!devices.length) {
      skippedUsers++;
      continue;
    }

    const timeZone = devices.map((d) => d.data.timezone).find(Boolean) || DEFAULT_TIMEZONE;

    let currency = "USD";
    try {
      const settingsDoc = await db.doc(`users/${uid}/appmeta/settings`).get();
      const c = settingsDoc.exists && settingsDoc.data().currency;
      if (c && /^[A-Z]{3}$/.test(c)) currency = c;
    } catch (_) {}

    const todaySerial = daySerial(Date.now(), timeZone);

    for (const { ref, data: bill } of bills) {
      const due = Number(bill.dueDate || 0);
      if (!due) continue;
      const reminderDays = Number(bill.reminderDays ?? 3);
      const daysUntil = daySerial(due, timeZone) - todaySerial;

      let kind = null;
      let markerField = null;
      if (daysUntil > 0 && reminderDays > 0 && daysUntil <= reminderDays && Number(bill.reminderSentForDue || 0) !== due) {
        kind = "reminder";
        markerField = "reminderSentForDue";
      } else if (daysUntil === 0 && Number(bill.dueSentForDue || 0) !== due) {
        kind = "due";
        markerField = "dueSentForDue";
      } else if (daysUntil < 0 && Number(bill.pastDueSentForDue || 0) !== due) {
        kind = "pastdue";
        markerField = "pastDueSentForDue";
      }
      if (!kind) continue;

      const { title, body } = buildMessage(kind, bill, daysUntil, timeZone, currency);
      const payload = JSON.stringify({ title, body, url: APP_URL, tag: `bill-${ref.id}-${kind}-${due}` });

      if (DRY_RUN) {
        console.log(`[dry-run] would send ${kind} to ${uid}: ${title} | ${body}`);
        sent++;
        continue;
      }

      let delivered = 0;
      for (const device of devices) {
        const sub = device.data;
        if (!sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) continue;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload,
            { TTL: 86400 }
          );
          delivered++;
        } catch (error) {
          const code = error && error.statusCode;
          if (code === 404 || code === 410) {
            // Subscription is gone (app uninstalled, permission revoked,
            // browser data cleared) — prune it so we stop trying.
            await device.ref.delete().catch(() => {});
            pruned++;
            console.log(`Pruned dead subscription for user ${uid} (HTTP ${code})`);
          } else {
            console.error(`Send failed for user ${uid}:`, code || "", error && error.message);
          }
        }
      }

      if (delivered > 0) {
        await ref.update({ [markerField]: due });
        sent++;
        console.log(`Sent ${kind} for "${bill.name}" to ${delivered} device(s) of user ${uid}`);
      }
    }
  }

  console.log(`Done. Notifications sent: ${sent}. Dead subscriptions pruned: ${pruned}. Users with bills but no devices: ${skippedUsers}.${DRY_RUN ? " (dry run — no markers written)" : ""}`);
}

main().catch((error) => {
  console.error("Bill-reminder run failed:", error);
  process.exit(1);
});
