# Modèles IA GGUF (node-llama-cpp)

Ce document détaille la procédure de téléchargement, d'installation et de configuration des modèles GGUF utilisés par le système de gestion documentaire pour le traitement de texte (extraction, résumé, traduction, chat) et la recherche sémantique vectorielle (RAG).

---

## 1. Vue d'ensemble des modèles

| Rôle | Modèle par défaut (`scripts/download-models.js`) | Fichier GGUF | Taille disque | RAM estimée |
|---|---|---|---|---|
| **Chat / Extraction / Résumé / Traduction** | ALLaM 7B Instruct (`Q4_K_M`) | `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` | ~4.26 Go | ~4.5 - 5.5 Go |
| **Embeddings & Recherche RAG** | BGE-M3 Multilingual (`Q4_K_M`) | `bge-m3-q4_k_m.gguf` | ~417 Mo | ~500 Mo |

*Alternative compatible également détectée au démarrage (`server.ts:329-330`) :*
- Chat : `qwen2.5-7b-instruct-q4_k_m.gguf` (~4.68 Go)
- Embeddings : `nomic-embed-text-v1.5.Q8_0.gguf` (~274 Mo)

> **Configuration minimale recommandée :** Ubuntu 22.04 / 24.04 LTS avec **16 Go de RAM** (18–24 Go si bureau GNOME Desktop actif) et **4 cœurs CPU** minimum.

---

## 2. Emplacement cible des modèles

- **Production Linux (Nginx/PM2) :** `/var/www/dms/models/` (ou `/opt/dms-models/`)
- **Développement local portable :** `<projet>/models/` (ex: `./models/`)
- **Développement Windows :** `C:\dms\models\`

---

## 3. Téléchargement automatique ou manuel

### Méthode recommandée (script du dépôt)

```bash
# Télécharge ALLaM 7B Instruct et BGE-M3 dans ./models/ (gère HTTP_PROXY / HTTPS_PROXY et reprise -C -)
npm run download-models

# Vérifier que les chemins définis dans .env pointent vers des fichiers valides
npm run check-models
```

### Téléchargement manuel (Ubuntu / hors-ligne)

```bash
sudo mkdir -p /var/www/dms/models
cd /var/www/dms/models

# 1. ALLaM 7B Instruct (Q4_K_M)
curl -L -C - -o ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf \
  "https://huggingface.co/bartowski/ALLaM-AI_ALLaM-7B-Instruct-preview-GGUF/resolve/main/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf"

# 2. BGE-M3 Multilingual (Q4_K_M)
curl -L -C - -o bge-m3-q4_k_m.gguf \
  "https://huggingface.co/gpustack/bge-m3-GGUF/resolve/main/bge-m3-Q4_K_M.gguf"

# Vérifier les fichiers téléchargés
ls -lh /var/www/dms/models/
```

*Dépôts alternatifs Qwen / Nomic sur Hugging Face :*
- `Qwen/Qwen2.5-7B-Instruct-GGUF` (`qwen2.5-7b-instruct-q4_k_m.gguf`)
- `nomic-ai/nomic-embed-text-v1.5-GGUF` (`nomic-embed-text-v1.5.Q8_0.gguf`)

---

## 4. Configuration d'environnement (`.env` racine unique)

Dans votre fichier `.env` **à la racine du projet** (évitez de créer un `backend/.env` concurrent) :

```env
# Chemins absolus vers les modèles GGUF
LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf

# Threads CPU alloués à l'inférence (par défaut : moitié des cœurs logiques dans server.ts)
LLAMA_THREADS=4

# 0 = Exécution 100% CPU. Si un GPU NVIDIA CUDA ou Vulkan est disponible, indiquez le nombre de couches (ex: 28 ou 33).
LLAMA_GPU_LAYERS=0
```

---

## 5. Réindexation de la base vectorielle RAG (Post-installation)

Une fois les modèles téléchargés ou en cas de changement de modèle d'embedding, la collection vectorielle doit être réindexée pour garantir l'homogénéité des vecteurs :

```bash
# 1. Optionnel : Vider les anciens index vectoriels dans MongoDB
mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" -p --eval 'db.semanticindexes.deleteMany({})'

# 2. Lancer la réindexation globale par lot depuis la racine
node backend/scripts/indexDocuments.js --force

# 3. Vérifier le nombre de documents indexés
mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" -p --eval 'db.semanticindexes.countDocuments()'

# 4. Tester la recherche sémantique
node backend/scripts/testChatSearch.js
```

---

## 6. Dépannage & Diagnostics

- **Erreur `MODELS_NOT_DOWNLOADED` / `AI_SERVICE_DOWN` :**  
  Vérifiez que les fichiers `.gguf` existent aux chemins indiqués dans `LLAMA_CHAT_MODEL_PATH` et `LLAMA_EMBEDDING_MODEL_PATH` via `npm run check-models`.
- **Mémoire insuffisante (`Cannot allocate memory`) :**  
  Vérifiez la mémoire disponible avec `free -h`. Les deux modèles par défaut consomment ~5 Go en RAM (`ecosystem.config.cjs` fixe `max_memory_restart: '6G'`). Si le serveur dispose de 8 Go de RAM ou moins, envisagez un modèle 3B plus léger (ex. `qwen2.5-3b-instruct-q4_k_m.gguf`, ~2.1 Go).
- **Test de santé direct via l'API :**  
  Appelez `GET /api/ai/health` avec un token JWT pour inspecter le diagnostic renvoyé par `node-llama-cpp`.

