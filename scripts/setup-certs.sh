#!/usr/bin/env bash
# Converts your Pass Type ID certificate (.p12 exported from Keychain) into the
# PEM files the app needs, and downloads Apple's WWDR G4 intermediate cert.
#
# Usage: upload your file as certs/pass.p12, then run:
#   P12_PASSWORD='your-export-password' npm run setup-certs
set -euo pipefail
cd "$(dirname "$0")/../certs"

if [ ! -f pass.p12 ]; then
  echo "❌ certs/pass.p12 not found. Upload your exported Pass Type ID certificate there first."
  exit 1
fi
PASS_ARG="pass:${P12_PASSWORD:-}"

# -legacy is needed on OpenSSL 3 for .p12 files exported from macOS Keychain
LEGACY=""
if openssl version | grep -q "OpenSSL 3"; then LEGACY="-legacy"; fi

openssl pkcs12 $LEGACY -in pass.p12 -clcerts -nokeys -out signerCert.pem -passin "$PASS_ARG"
openssl pkcs12 $LEGACY -in pass.p12 -nocerts -nodes -out signerKey.pem -passin "$PASS_ARG"

curl -sSfL https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer -o wwdr.cer
openssl x509 -inform der -in wwdr.cer -out wwdr.pem
rm -f wwdr.cer

echo "✅ Created certs/signerCert.pem, certs/signerKey.pem, certs/wwdr.pem"
echo
echo "Certificate subject (your Pass Type ID and Team ID are in here):"
openssl x509 -in signerCert.pem -noout -subject
