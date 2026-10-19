import { money } from "./pass.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const STATUS_LABEL = { ok: "Active", warning: "Warning", error: "Action needed" };

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <link rel="icon" href="/assets/icon@3x.png" />
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
  <header class="topbar">
    <a href="/" class="brand"><img src="/assets/logo@2x.png" alt="Flywire" /></a>
    <nav><a href="/">Card</a><a href="/admin">Admin</a></nav>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

function certBanner(missing) {
  if (!missing.length) return "";
  return `<div class="banner error">Missing certificate(s): <b>${esc(missing.join(", "))}</b>. Passes can't be signed until you add them — see the README.</div>`;
}

function cardPreview(m) {
  const plan = m.installment || {};
  return `
  <div class="pass status-${esc(m.status)}">
    <div class="pass-top">
      <img src="/assets/logo@2x.png" alt="Flywire" class="pass-logo" />
      <div class="field right"><span class="label">STATUS</span><span class="value">${esc(STATUS_LABEL[m.status] || "Active")}</span></div>
    </div>
    <div class="pass-strip">
      <span class="label">BALANCE DUE</span>
      <span class="big">${esc(money(m.balance, m.currency))}</span>
    </div>
    <div class="pass-row">
      <div class="field"><span class="label">MEMBER</span><span class="value">${esc(m.name)}</span></div>
      <div class="field right"><span class="label">INSTALLMENT PLAN</span><span class="value">${
        plan.enabled ? `${esc(money(plan.amount, m.currency))} ${esc(plan.frequency)}` : "Not set up"
      }</span></div>
    </div>
    <div class="pass-row">
      <div class="field"><span class="label">ACCOUNT</span><span class="value status-text">${esc(m.statusText)}</span></div>
      ${plan.enabled ? `<div class="field right"><span class="label">NEXT PAYMENT</span><span class="value">${esc(plan.nextDate)}</span></div>` : ""}
    </div>
    <div class="pass-qr"><img src="/member-qr.png?v=${encodeURIComponent(m.memberId)}" alt="Member QR code" /><span>${esc(m.memberId)}</span></div>
  </div>`;
}

export function homePage({ db, passUrl, qr, certsMissing }) {
  return layout(
    "Flywire Loyalty Card",
    `
  ${certBanner(certsMissing)}
  <section class="hero">
    <div>
      <h1>Your Flywire loyalty card</h1>
      <p class="muted">Keep your balance, installment plan and account alerts in Apple Wallet. Updates appear on your card automatically.</p>
      <a class="wallet-btn" href="${esc(passUrl)}">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="2" y="5" width="20" height="15" rx="3" fill="#fff"/><rect x="2" y="5" width="20" height="4" fill="#1D6BFF"/><rect x="2" y="9" width="20" height="3" fill="#FFB020"/><rect x="2" y="12" width="20" height="3" fill="#FF4D4F"/></svg>
        <span><small>Add to</small>Apple Wallet</span>
      </a>
      <div class="phone-hint">
        <img src="${qr}" alt="QR code to open this page on your iPhone" />
        <p class="muted">On a computer? Scan this with your iPhone camera to open this page, then tap <b>Add to Apple Wallet</b>.</p>
      </div>
    </div>
    ${cardPreview(db.member)}
  </section>`,
  );
}

export function adminPage({ db, certsMissing, publicUrl, result }) {
  const m = db.member;
  const plan = m.installment || {};
  const sel = (v, cur) => (v === cur ? "selected" : "");
  return layout(
    "Flywire Admin",
    `
  ${certBanner(certsMissing)}
  ${result ? `<div class="banner ${result.ok ? "success" : "error"}">${esc(result.text)}${
      result.details?.length ? `<pre>${esc(JSON.stringify(result.details, null, 2))}</pre>` : ""
    }</div>` : ""}
  <section class="admin">
    <form method="post" action="/admin" class="panel">
      <h1>Push update to wallet</h1>
      <p class="muted">Saving updates the pass and sends a push to <b>${db.registrations.length}</b> registered device(s). Changes to status, balance, plan or message show as a lock-screen notification.</p>

      <h2>Quick scenarios</h2>
      <div class="presets">
        <button type="button" data-preset="ok">✅ Good standing</button>
        <button type="button" data-preset="overdue">⚠️ Account overdue</button>
        <button type="button" data-preset="failed">⛔️ Installment failed</button>
      </div>

      <h2>Member</h2>
      <div class="grid">
        <label>Name<input name="name" value="${esc(m.name)}" required /></label>
        <label>Member ID (QR code)<input name="memberId" value="${esc(m.memberId)}" required /></label>
        <label>Balance (${esc(m.currency)})<input name="balance" type="number" step="0.01" value="${esc(m.balance)}" /></label>
      </div>

      <h2>Installment plan <span class="muted">(optional)</span></h2>
      <label class="check"><input type="checkbox" name="installmentEnabled" ${plan.enabled ? "checked" : ""} /> Installment plan set up</label>
      <div class="grid">
        <label>Amount<input name="installmentAmount" type="number" step="0.01" value="${esc(plan.amount)}" /></label>
        <label>Frequency<select name="installmentFrequency">
          ${["Weekly", "Biweekly", "Monthly"].map((f) => `<option ${sel(f, plan.frequency)}>${f}</option>`).join("")}
        </select></label>
        <label>Next payment<input name="installmentNextDate" type="date" value="${esc(plan.nextDate)}" /></label>
        <label>Payments remaining<input name="installmentRemaining" type="number" value="${esc(plan.remaining)}" /></label>
      </div>

      <h2>Account status &amp; message</h2>
      <div class="grid">
        <label>Status level<select name="status">
          <option value="ok" ${sel("ok", m.status)}>OK</option>
          <option value="warning" ${sel("warning", m.status)}>Warning</option>
          <option value="error" ${sel("error", m.status)}>Error</option>
        </select></label>
        <label class="wide">Status text (front of card)<input name="statusText" value="${esc(m.statusText)}" maxlength="40" /></label>
        <label class="wide">Push message (notification + back of card)<textarea name="message" rows="2">${esc(m.message)}</textarea></label>
      </div>

      <button class="primary" type="submit">Save &amp; push to wallets</button>
    </form>

    <aside>
      <h2>Current card</h2>
      ${cardPreview(m)}
      <div class="panel small">
        <h2>Debug</h2>
        <p>Pass type: <code>${esc(process.env.PASS_TYPE_ID || "(not set)")}</code></p>
        <p>Web service: <code>${esc(publicUrl)}/v1</code></p>
        <p>Registered devices: <b>${db.registrations.length}</b></p>
        <p>Last updated: ${esc(new Date(db.updatedAt).toLocaleString())}</p>
      </div>
    </aside>
  </section>
  <script src="/static/admin.js"></script>`,
  );
}
