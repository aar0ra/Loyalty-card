// One-click scenarios for demoing warnings and errors on the pass.
const PRESETS = {
  ok: {
    status: "ok",
    statusText: "Account in good standing",
    message: 'Your account is up to date. Open Pass Details and tap "View your account".',
  },
  overdue: {
    status: "warning",
    statusText: "Account overdue",
    message: 'Your account is overdue. Open Pass Details and tap "Update payment method".',
  },
  failed: {
    status: "error",
    statusText: "Installment payment failed",
    message: 'Your installment payment failed. Open Pass Details and tap "Review payment options".',
  },
};

document.querySelectorAll("[data-preset]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const form = btn.closest("form");
    for (const [name, value] of Object.entries(PRESETS[btn.dataset.preset])) {
      form.elements[name].value = value;
    }
  });
});
