# Modèles IA GGUF (node-llama-cpp)

Ce document détaille la procédure de téléchargement, d'installation et de configuration des modèles GGUF utilisés par le système de gestion documentaire pour le traitement de texte (extraction, résumé, traduction, chat) et la recherche sémantique vectorielle (RAG).

---

## 1. Vue d'ensemble des modèles

| Rôle | Modèle cible | Fichier GGUF | Taille disque | RAM estimée |
|---|---|---|---|---|
| **Chat / Extraction / Résumé / Traduction** | Qwen 2.5 7B Instruct (Q4_K_M) | `qwen2.5-7b-instruct-q4_k_m.gguf` | ~4.68 Go | ~4.5 - 5.5 Go |
| **Embeddings & Recherche RAG** | Nomic Embed Text v1.5 (Q8_0) | `nomic-embed-text-v1.5.Q8_0.gguf` | ~274 Mo | ~400 Mo |

> **Configuration minimale recommandée :** Ubuntu Server 22.04 / 24.04 avec **16 Go de RAM** et **4 cœurs CPU**.

---

## 2. Emplacement cible des modèles

- **Production Ubuntu Server (Recommandé) :** `/opt/dms-models/`
- **Développement local portable :** `<projet>/models/` (ex: `./models/`)
- **Développement Windows :** `D:\DMS\models\`

---

## 3. Commandes d'installation sur Ubuntu Server

Exécutez les commandes suivantes dans votre terminal Ubuntu :

```bash
# 1. Créer le répertoire et attribuer les droits
sudo mkdir -p /opt/dms-models
sudo chown -R $USER:$USER /opt/dms-models
cd /opt/dms-models

# 2. Télécharger Qwen 2.5 7B Instruct (Q4_K_M)
wget -c "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf"

# 3. Télécharger Nomic Embed Text v1.5 (Q8_0)
wget -c "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf"

# 4. Vérifier les fichiers téléchargés
ls -lh /opt/dms-models/
```

### URLs et dépôts Hugging Face de référence
- **Qwen 2.5 7B Instruct GGUF :**  
  [https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF)  
  *Alternative si lien direct indisponible :* Rechercher `Qwen/Qwen2.5-7B-Instruct-GGUF` ou `bartowski/Qwen2.5-7B-Instruct-GGUF` sur Hugging Face et sélectionner la variante `qwen2.5-7b-instruct-q4_k_m.gguf`.
- **Nomic Embed Text v1.5 GGUF :**  
  [https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF)  
  Fichier : `nomic-embed-text-v1.5.Q8_0.gguf`.

---

## 4. Configuration d'environnement (`.env`)

Dans votre fichier `backend/.env` (ou `.env` racine) :

```env
# Chemins absolus vers les modèles GGUF
LLAMA_CHAT_MODEL_PATH=/opt/dms-models/qwen2.5-7b-instruct-q4_k_m.gguf
LLAMA_EMBEDDING_MODEL_PATH=/opt/dms-models/nomic-embed-text-v1.5.Q8_0.gguf

# Threads CPU alloués à l'inférence
LLAMA_THREADS=4

# 0 = Exécution 100% CPU. Si un GPU NVIDIA CUDA est disponible, indiquez le nombre de couches (ex: 28 ou 33).
LLAMA_GPU_LAYERS=0
```

---

## 5. Réindexation de la base vectorielle RAG (Post-installation)

Une fois les modèles téléchargés, la collection vectorielle doit être réindexée pour garantir la cohérence des distances cosinus :

```bash
# 1. Optionnel : Vider les anciens index vectoriels dans MongoDB
mongosh document-management --eval 'db.semanticindexes.deleteMany({})'

# 2. Lancer la réindexation globale par lot
cd backend
node scripts/indexDocuments.js --force

# 3. Vérifier le nombre de documents indexés
mongosh document-management --eval 'db.semanticindexes.countDocuments()'

# 4. Tester la recherche sémantique
node scripts/testChatSearch.js
```

---

## 6. Dépannage & Diagnostics

- **Erreur `MODELS_NOT_DOWNLOADED` :**  
  Vérifiez que les fichiers `.gguf` existent aux chemins indiqués dans `LLAMA_CHAT_MODEL_PATH` et `LLAMA_EMBEDDING_MODEL_PATH`.
- **Mémoire insuffisante (`Cannot allocate memory`) :**  
  Vérifiez la mémoire disponible avec `free -h`. Si le serveur dispose de 8 Go de RAM ou moins, envisagez le modèle plus léger `qwen2.5-3b-instruct-q4_k_m.gguf` (~2.1 Go).
- **Test de santé direct via l'API :**  
  Appelez `GET /api/ai/health` avec un token JWT pour inspecter le diagnostic renvoyé par `node-llama-cpp`.
