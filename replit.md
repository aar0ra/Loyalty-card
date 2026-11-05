# Running this project

This is the imported Node.js / Express Apple Wallet loyalty-card prototype.
Keep the existing stack and directory structure.

- Use the **Start application** workflow, which runs `npm start`.
- The server listens on `0.0.0.0:5000` by default (or `PORT` if supplied).
- `/` shows the card preview and iPhone QR code.
- `/admin` uses HTTP Basic authentication: any username and the
  `ADMIN_PASSWORD` secret. The imported code falls back to `admin` if unset;
  configure a strong password before sharing the app.
- Member information and device registrations are stored in the git-ignored
  `data.json` file. Do not delete it casually: it also contains the Wallet
  authentication token.

## Apple Wallet prerequisites

The web preview and admin editing work without Apple credentials. Downloading
a signed pass and delivering real device updates require the user's Apple
Developer setup; do not generate placeholder certificates or identifiers.

Configure `PASS_TYPE_ID` and `TEAM_ID` to match the Apple Pass Type ID
certificate. Add `SIGNER_CERT`, `SIGNER_KEY`, and `WWDR_CERT` through Replit
Secrets (raw PEM or base64). For an encrypted key, also set
`SIGNER_KEY_PASSPHRASE`. Alternatively, supply the certificate files described
in `certs/README.md`; never commit certificate material.

The latest upstream code also supports an `AUTH_TOKEN` secret to keep the
Wallet authentication token stable if `data.json` is reset. Configure it before
issuing passes; changing it later invalidates authentication for existing passes.

See `README.md` for Apple's certificate creation instructions. Without these
credentials, the app displays a missing-certificates banner and pass download
fails explicitly; this is expected, not a server startup failure.

The visitor's URL is used automatically for QR codes and pass updates, unless
`PUBLIC_URL` is configured.
Actual pass installation and push notifications must be tested on an iPhone
after valid Apple credentials are configured.
