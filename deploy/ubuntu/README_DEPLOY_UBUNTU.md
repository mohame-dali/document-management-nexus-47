# Déploiement Production Ubuntu — Redirection vers les guides unifiés

Ce document historique a été remplacé par les guides unifiés et vérifiés par rapport au code source actuel (`server.ts`, `ecosystem.config.cjs`, `deploy/scripts/check-env.mjs`, `deploy/ubuntu/`) :

- **Guide Ubuntu 24.04 Server VM (QEMU/KVM `192.168.100.131`) — Procédure complète en 7 étapes** :  
  [`deploy/DEPLOY_KVM_UBUNTU.md`](../DEPLOY_KVM_UBUNTU.md)
- **Guide unifié complet (Ubuntu 24.04 VM QEMU/KVM Desktop & Server + Windows Server + Recette S1/S2/RBAC)** :  
  [`docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md`](../../docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md)
- **Référence des modèles IA GGUF (`node-llama-cpp`)** :  
  [`MODELS.md`](../../MODELS.md)

## Scripts d'infrastructure actifs dans `deploy/ubuntu/`

1. `deploy/ubuntu/setup-system.sh` — Initialisation Ubuntu 22.04/24.04 (Node.js 22 LTS, PM2, C++ build tools, Nginx, Tesseract OCR `ara`/`fra`, Poppler, ImageMagick, SANE, `dms:dms`, UFW).
2. `deploy/ubuntu/install-mongodb.sh` — Installation et durcissement MongoDB (`jammy` -> 7.0, `noble` -> 8.0, `bindIp: 127.0.0.1`, `authorization: enabled`, base `document-management`).
3. `deploy/ubuntu/scripts/gen-selfsigned-cert.sh` — Génération du certificat auto-signé RSA 4096 bits avec SAN dans `/etc/ssl/dms/`.
4. `deploy/ubuntu/dms.nginx.conf` — Reverse proxy HTTPS (`client_max_body_size 100M`, WebSocket `/socket.io/`, protection `^~ /courrier/` & `^~ /uploads/`).
5. `deploy/ubuntu/deploy.sh` & `deploy/ubuntu/rollback.sh` — Mise à jour applicative et retour arrière.
6. `deploy/ubuntu/systemd/dms-backup.{service,timer}` & `deploy/ubuntu/logrotate/dms` — Sauvegarde quotidienne automatisée et rotation des journaux.
