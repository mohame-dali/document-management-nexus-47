# 🚀 Guide de Déploiement en Production — Ubuntu Server 22.04 / 24.04 LTS
**Application :** DMS (Gestion Électronique des Courriers, Ressources Humaines & IA Souveraine)  
**Architecture :** React SPA (Vite) + Backend Node.js/Express (Port 5000) + Inférence Locale GGUF (node-llama-cpp) + MongoDB + Nginx Reverse Proxy + PM2

---

## 📋 Prérequis Matériels Recommandés
- **OS :** Ubuntu Server 22.04 LTS ou 24.04 LTS (x86_64 ou ARM64)
- **CPU :** 4 vCPUs ou plus (recommandé 8 vCPUs pour l'inférence IA sans GPU)
- **RAM :** 16 Go minimum (les modèles ALLaM 7B et BGE-M3 occupent ~5 Go en mémoire)
- **Disque :** 50 Go SSD minimum (modèles IA = ~4.5 Go, stockage documents/scans = variable)
- **Nom de domaine :** Un nom de domaine pointant vers l'adresse IP publique de votre serveur (ex: `dms.mondomaine.tn`)

---

## ÉTAPE 1 — Préparation du Système & Installation des Dépendances

Connectez-vous en SSH à votre serveur Ubuntu :

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git build-essential ufw certbot python3-certbot-nginx
```

### 1.1 Installer Node.js (v20 ou v22 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier les versions
node -v   # Attendu: v20.x ou v22.x
npm -v    # Attendu: 10.x+
```

### 1.2 Installer PM2 globalement
```bash
sudo npm install -g pm2
```

### 1.3 Installer MongoDB 6.0 ou 7.0 & les Database Tools
```bash
# Importer la clé GPG officielle MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le dépôt officiel (adapter 'jammy' pour 22.04 ou 'noble' pour 24.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org mongodb-database-tools

# Démarrer et activer MongoDB au boot
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```

### 1.4 Installer Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## ÉTAPE 2 — Déploiement de l'Application

### 2.1 Cloner le projet dans `/var/www/dms`
```bash
sudo mkdir -p /var/www/dms
sudo chown -R $USER:$USER /var/www/dms

# Cloner votre dépôt (ou copier les sources)
git clone <URL_VOTRE_DEPOT> /var/www/dms
cd /var/www/dms

# Créer les répertoires nécessaires
mkdir -p uploads/temp uploads/usersphoto uploads/personnelphoto uploads/attachments
mkdir -p courrier models backups
sudo mkdir -p /var/log/dms
sudo chown -R $USER:$USER /var/log/dms /var/www/dms
```

### 2.2 Installer les dépendances du projet
```bash
cd /var/www/dms
npm install
```

---

## ÉTAPE 3 — Configuration de l'Environnement de Production (`.env`)

Générez une clé secrète JWT cryptographique de 64 octets :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Créez le fichier `/var/www/dms/.env` :
```bash
cat << 'EOF' > /var/www/dms/.env
NODE_ENV=production
PORT=5000

# Base de données MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/document-management

# Sécurité JWT (Collez la clé hexadécimale générée ci-dessus)
JWT_SECRET=METTEZ_ICI_LA_CLE_HEX_64_OCTETS_GENEREE
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Chemins des documents et sauvegardes
DOCUMENT_PATH=/var/www/dms/courrier
BACKUP_PATH=/var/backups/dms

# Modèles IA Souverains GGUF (Inférence locale node-llama-cpp)
LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf
LLAMA_THREADS=4
LLAMA_GPU_LAYERS=0
EOF

# Protéger le fichier d'environnement contre la lecture non autorisée
chmod 600 /var/www/dms/.env
```

---

## ÉTAPE 4 — Téléchargement des Modèles d'IA Souveraine (GGUF)

Exécutez le script automatique qui télécharge et valide les modèles ALLaM 7B (~3.97 Go) et BGE-M3 (~417 Mo) :

```bash
cd /var/www/dms
npm run download-models
```
*Attendu :*
- `[SUCCÈS] Modèle de Chat & Raisonnement (ALLaM 7B Instruct Q4_K_M) prêt`
- `[SUCCÈS] Modèle Vectoriel RAG (BGE-M3 Multilingual Q4_K_M) prêt`

---

## ÉTAPE 5 — Compilation du Frontend React

Compilez l'application cliente Vite / React en mode production :
```bash
cd /var/www/dms
npm run build
```
Les fichiers statiques minifiés et hashés seront générés dans `/var/www/dms/dist/`.

---

## ÉTAPE 6 — Démarrage et Persistance avec PM2

Le fichier `ecosystem.config.cjs` configure l'exécution en mode fork (1 instance dédiée pour mutualiser la mémoire RAM allouée aux modèles GGUF) :

```bash
cd /var/www/dms
pm2 start ecosystem.config.cjs

# Vérifier l'état du processus
pm2 status
pm2 logs dms-backend --lines 30

# Sauvegarder la configuration PM2 pour redémarrage automatique au boot
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

---

## ÉTAPE 7 — Configuration du Serveur Web Nginx & Reverse Proxy

### 7.1 Copier et adapter la configuration Nginx
```bash
sudo cp /var/www/dms/dms.nginx.conf /etc/nginx/sites-available/dms

# Remplacer 'your-domain.com' par votre vrai nom de domaine
sudo sed -i 's/your-domain.com/dms.mondomaine.tn/g' /etc/nginx/sites-available/dms

# Activer le site dans Nginx
sudo ln -sf /etc/nginx/sites-available/dms /etc/nginx/sites-enabled/dms

# Désactiver le site par défaut si présent
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la syntaxe Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## ÉTAPE 8 — Installation du Certificat SSL Let's Encrypt (HTTPS)

Générez le certificat SSL gratuit et configurez le renouvellement automatique :

```bash
# Assurez-vous que les ports 80 et 443 sont ouverts dans le pare-feu
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# Obtenir et installer le certificat SSL
sudo certbot --nginx -d dms.mondomaine.tn -d www.dms.mondomaine.tn

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

Rechargez Nginx :
```bash
sudo systemctl reload nginx
```

---

## ÉTAPE 9 — Automatisation des Sauvegardes Quotidiennes (Cron)

Le script `/var/www/dms/scripts/backup-mongo.sh` effectue un dump MongoDB, compresse l'archive `.tar.gz` dans `/var/backups/dms/` et supprime automatiquement les sauvegardes de plus de 30 jours.

### 9.1 Vérification des permissions
```bash
chmod +x /var/www/dms/scripts/backup-mongo.sh
sudo mkdir -p /var/backups/dms
sudo chown -R $USER:$USER /var/backups/dms
```

### 9.2 Test manuel du script de sauvegarde
```bash
/var/www/dms/scripts/backup-mongo.sh
ls -lh /var/backups/dms/
```

### 9.3 Configuration de la tâche Cron quotidienne (à 03h00)
Ouvrez le crontab de l'utilisateur :
```bash
crontab -e
```

Ajoutez la ligne suivante à la fin du fichier :
```cron
0 3 * * * /var/www/dms/scripts/backup-mongo.sh >> /var/log/dms/backup.log 2>&1
```

---

## 🛠️ Commandes Utiles d'Exploitation & Maintenance

### Vérifier l'état des services
```bash
pm2 status                    # Statut de l'application Node.js
sudo systemctl status nginx   # Statut du serveur Web Nginx
sudo systemctl status mongod  # Statut de la base MongoDB
```

### Consulter les logs en temps réel
```bash
pm2 logs dms-backend          # Logs applicatifs
tail -f /var/log/dms/err.log  # Logs d'erreurs
tail -f /var/log/nginx/error.log # Logs Nginx
tail -f /var/log/dms/backup.log  # Logs des sauvegardes
```

### Mettre à jour l'application en production
```bash
cd /var/www/dms
git pull
npm install
npm run build
pm2 restart dms-backend --update-env
```

### Redémarrage propre sans interruption
```bash
pm2 reload dms-backend
sudo systemctl reload nginx
```
EOF
