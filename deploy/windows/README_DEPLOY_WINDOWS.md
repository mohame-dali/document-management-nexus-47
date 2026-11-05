# Guide de Déploiement Production — Windows Server 2019 / 2022

Ce guide décrit la procédure officielle pour déployer l'application **DMS (Courrier Hybride, Ressources Humaines & IA Locale GGUF)** sur Windows Server avec **IIS (Internet Information Services)** et **PM2**.

---

## 1. Prérequis Logiciels sur Windows Server

Téléchargez et installez les composants suivants (avec droits Administrateur) :

1. **Node.js 20 LTS** (version Windows x64 `.msi`) : [https://nodejs.org](https://nodejs.org)
2. **MongoDB 7.0 Community Edition** (avec MongoDB Compass ou en tant que Service Windows) : [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
3. **Tesseract OCR pour Windows** (avec données linguistiques arabe, français, anglais) :
   - Téléchargeable depuis UB-Mannheim : `https://github.com/UB-Mannheim/tesseract/wiki`
   - Ajoutez `C:\Program Files\Tesseract-OCR` dans la variable d'environnement `PATH` système.
4. **Git pour Windows** : [https://git-scm.com/download/win](https://git-scm.com/download/win)

---

## 2. Configuration d'IIS (Internet Information Services)

### A. Activer les rôles IIS
Dans le **Gestionnaire de serveur (Server Manager)** :
- Ajouter des rôles et fonctionnalités > **Serveur Web (IIS)**.
- Dans **Fonctionnalités de développement d'applications**, cocher :
  - **Protocole WebSocket** *(Indispensable pour Socket.IO)*.
  - Initialisation de l'application.

### B. Installer les extensions IIS obligatoires
1. **URL Rewrite Module 2.1** : Télécharger et installer via Web Platform Installer ou Microsoft Download Center.
2. **Application Request Routing (ARR) 3.0** : Télécharger et installer.
3. **Activer le Proxy ARR** :
   - Ouvrir **Gestionnaire des services Internet (IIS Manager)**.
   - Cliquer sur le nom du serveur (racine à gauche).
   - Double-cliquer sur **Application Request Routing Cache**.
   - Dans le volet de droite, cliquer sur **Server Proxy Settings...**.
   - Cocher **Enable proxy**.
   - Cliquer sur **Apply**.

---

## 3. Installation et Préparation du Projet

Ouvrez une invite **PowerShell en tant qu'Administrateur** :

```powershell
# Cloner ou copier le projet dans C:\inetpub\wwwroot\dms
cd C:\inetpub\wwwroot
git clone <URL_DU_DEPOT> dms
cd C:\inetpub\wwwroot\dms

# Créer les dossiers de stockage et de logs
New-Item -ItemType Directory -Path ".\logs", ".\backend\uploads\temp", ".\backups" -Force

# Installer les dépendances NPM
npm install

# Télécharger les modèles d'IA souverains GGUF (ALLaM 7B et BGE-M3)
npm run download-models

# Compiler le frontend de production
npm run build
```

---

## 4. Configuration des Variables d'Environnement (.env)

Créez le fichier `C:\inetpub\wwwroot\dms\.env` :

```ini
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/dms_db
JWT_SECRET=votre_cle_secrete_ultra_securisee_minimum_64_caracteres_aleatoires
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
VITE_API_URL=/api
VITE_SOCKET_URL=/
```

---

## 5. Démarrage de l'Application via PM2 Service Windows

Exécutez le script PowerShell d'automatisation fourni :

```powershell
cd C:\inetpub\wwwroot\dms\deploy\windows
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install-service.ps1
```

Ce script configure PM2 pour s'exécuter en arrière-plan comme un service Windows persistant au reboot.

Vérifiez que le serveur Node écoute bien :
```powershell
pm2 status
Test-NetConnection -ComputerName 127.0.0.1 -Port 5000
```

---

## 6. Configuration du Site dans IIS

1. Dans **IIS Manager**, faire un clic droit sur **Sites** > **Ajouter un site web...**.
2. **Nom du site :** `DMS`
3. **Chemin d'accès physique :** `C:\inetpub\wwwroot\dms\dist`
4. **Port :** 80 (ou 443 avec certificat SSL).
5. Copiez le fichier `web.config` :
```powershell
Copy-Item "C:\inetpub\wwwroot\dms\deploy\windows\web.config" "C:\inetpub\wwwroot\dms\dist\web.config" -Force
```
6. Accordez les permissions de lecture au compte IIS (`IIS_IUSRS`) sur le dossier `dist` et `backend\uploads`.
7. Redémarrez le site dans IIS Manager.

Accédez à `http://localhost` (ou au nom de domaine du serveur).

---

## 7. Sauvegarde Automatisée sur Windows (Planificateur de Tâches)

Le script PowerShell `deploy\backup\backup-mongo.ps1` gère la sauvegarde complète de MongoDB avec rétention de 30 jours.

Pour planifier la sauvegarde quotidienne :
```powershell
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -WindowStyle Hidden -File C:\inetpub\wwwroot\dms\deploy\backup\backup-mongo.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
Register-ScheduledTask -TaskName "DMS_Daily_Backup" -Action $Action -Trigger $Trigger -User "SYSTEM" -RunLevel Highest
```
