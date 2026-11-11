#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/scripts/gen-selfsigned-cert.sh
# Génération d'un certificat SSL auto-signé fort avec Subject Alternative Name (SAN)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   Génère un certificat X.509 RSA 4096 bits valide 3 ans incluant l'adresse IP
#   locale du serveur et le nom d'hôte dans l'extension SAN (obligatoire pour
#   éviter les rejets stricts de Chrome / Edge récents).
#
# Utilisation :
#   sudo bash deploy/ubuntu/scripts/gen-selfsigned-cert.sh [IP_OU_DOMAINE]
# ==============================================================================

set -euo pipefail

TARGET_HOST="${1:-127.0.0.1}"
CERT_DIR="/etc/ssl/certs"
KEY_DIR="/etc/ssl/private"
CERT_FILE="${CERT_DIR}/dms-selfsigned.crt"
KEY_FILE="${KEY_DIR}/dms-selfsigned.key"

echo "🔐 Génération d'un certificat SSL d'administration pour : ${TARGET_HOST}..."

mkdir -p "${CERT_DIR}" "${KEY_DIR}"

OPENSSL_CONF=$(mktemp)
cat <<EOF > "${OPENSSL_CONF}"
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = TN
ST = Tunis
L = Tunis
O = Administration Locale
OU = Gestion Electronique de Courrier et RH
CN = ${TARGET_HOST}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${TARGET_HOST}
DNS.2 = dms.local
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# Si l'argument est une IP valide, on l'ajoute comme IP.2
if [[ "${TARGET_HOST}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "IP.2 = ${TARGET_HOST}" >> "${OPENSSL_CONF}"
fi

openssl req -x509 -nodes -days 1095 -newkey rsa:4096 \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -config "${OPENSSL_CONF}"

rm -f "${OPENSSL_CONF}"

chmod 600 "${KEY_FILE}"
chmod 644 "${CERT_FILE}"

echo "✅ Certificat généré avec succès :"
echo "   Certificat : ${CERT_FILE}"
echo "   Clé privée : ${KEY_FILE}"
