// One-click scenarios for demoing warnings and errors on the pass.
const PRESETS = {
  ok: {
    status: "ok",
    statusText: "Account in good standing",
    message: "Thanks! Your account is up to date.",
  },
  overdue: {
    status: "warning",
    statusText: "Account overdue",
    message: "Your account is past due. Please make a payment to avoid late fees.",
  },
  failed: {
    status: "error",
    statusText: "Installment payment failed",
    message: "We couldn't process your installment payment. Please update your payment method.",
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
