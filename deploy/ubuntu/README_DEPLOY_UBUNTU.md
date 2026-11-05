# Guide de Déploiement Production — Ubuntu Server 22.04 / 24.04 LTS

Ce guide détaille la mise en production complète de l'application **DMS (Courrier Hybride, Ressources Humaines & IA Locale GGUF)** sur serveur Linux Ubuntu.

---

## 1. Prérequis Système

- **Système :** Ubuntu Server 22.04 LTS ou 24.04 LTS
- **Ressources recommandées :** 
  - CPU : 4 cœurs minimum (8 cœurs recommandés pour l'inférence IA)
  - RAM : 16 Go minimum (6 Go réservés pour le modèle GGUF ALLaM 7B)
  - Disque : 50 Go SSD minimum (modèles IA ~5 Go + pièces jointes)

---

## 2. Installation des Paquets Système et Dépendances

Exécutez en tant que `root` ou avec `sudo` :

```bash
sudo apt update && sudo apt upgrade -y

# Outils système, compilation et outils OCR / Poppler
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx \
  tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng poppler-utils imagemagick
```

### Installation de Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification
node -v # doit afficher v20.x.x
npm -v
```

### Installation de MongoDB 7.0 Community
```bash
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl start mongod
sudo systemctl enable mongod
```

### Installation globale de PM2
```bash
sudo npm install -g pm2
```

---

## 3. Déploiement du Code Source

```bash
# Cloner le dépôt dans /var/www/dms
sudo mkdir -p /var/www/dms
sudo chown -R $USER:$USER /var/www/dms
git clone <URL_DU_DEPOT> /var/www/dms
cd /var/www/dms

# Créer les répertoires nécessaires
mkdir -p logs backend/uploads/temp backups

# Installation des dépendances NPM
npm install

# Téléchargement des modèles IA souverains GGUF (ALLaM 7B Q4_K_M + BGE-M3)
npm run download-models

# Compilation du frontend React (Vite)
npm run build
```

---

## 4. Configuration des Variables d'Environnement

Créez le fichier `.env` de production :

```bash
cat << 'EOF' > /var/www/dms/.env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dms_db
JWT_SECRET=generer_une_cle_secrete_tres_longue_et_aleatoire_64_caracteres_min
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
VITE_API_URL=/api
VITE_SOCKET_URL=/
EOF

chmod 600 /var/www/dms/.env
```

---

## 5. Démarrage et Automatisation avec PM2

```bash
cd /var/www/dms

# Démarrer l'application avec ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Sauvegarder la liste des processus pour redémarrage auto au boot
pm2 save

# Configurer le service de démarrage automatique système
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

Pour surveiller les logs :
```bash
pm2 logs dms-backend
pm2 status
```

---

## 6. Configuration du Reverse Proxy Nginx & SSL

1. Copier la configuration Nginx fournie :
```bash
sudo cp /var/www/dms/deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.conf
sudo ln -s /etc/nginx/sites-available/dms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

2. Adapter le nom de domaine :
Éditez `/etc/nginx/sites-available/dms.conf` et remplacez `dms.local` par votre vrai nom de domaine ou IP.

3. Générer le certificat SSL avec Certbot :
```bash
sudo certbot --nginx -d votre-domaine.com
```

4. Tester et recharger Nginx :
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Automatisation de la Sauvegarde Quotidienne (Crontab)

Rendez le script de sauvegarde exécutable :
```bash
chmod +x /var/www/dms/deploy/backup/backup-mongo.sh
```

Ajoutez la tâche cron pour s'exécuter tous les soirs à 02:00 :
```bash
crontab -e
```
Ajoutez la ligne suivante :
```cron
0 2 * * * /var/www/dms/deploy/backup/backup-mongo.sh >> /var/www/dms/logs/backup.log 2>&1
```

---

## 8. Commandes Utiles d'Exploitation

| Action | Commande |
|---|---|
| Redémarrer le backend | `pm2 restart dms-backend` |
| Consulter les logs backend | `pm2 logs dms-backend --lines 100` |
| Recharger Nginx | `sudo systemctl reload nginx` |
| État de MongoDB | `sudo systemctl status mongod` |
| Lancer une sauvegarde manuelle | `/var/www/dms/deploy/backup/backup-mongo.sh` |
