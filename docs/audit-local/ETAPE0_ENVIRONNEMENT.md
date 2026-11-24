# ÉTAPE 0 : ENVIRONNEMENT
Date: 2026-11-11

## Résultats mesurés

| Commande | Sortie | Heure |
|----------|--------|-------|
| pwd | /home/med/TEST/DMS | 2026-11-11 |
| whoami | med | 2026-11-11 |
| hostname | med-ThinkCentre-M75t-Gen-2 | 2026-11-11 |
| lsb_release -a | Ubuntu 24.04.4 LTS (noble) | 2026-11-11 |
| uname -r | 6.8.0-147-generic | 2026-11-11 |
| node -v | v22.12.0 | 2026-11-11 |
| npm -v | 11.2.0 | 2026-11-11 |
| free -h | Mem: 7.1Gi total, 1.8Gi available; Swap: 8.0Gi | 2026-11-11 |
| nproc | 8 | 2026-11-11 |
| df -h . | /dev/nvme0n1p2: 468G total, 235G available (48%) | 2026-11-11 |
| lspci \| grep -i vga | AMD Radeon RX Vega 6 (Renoir) | 2026-11-11 |
| systemctl is-active mongod | active | 2026-11-11 |
| ss -tlnp \| grep 27017 | LISTEN 127.0.0.1:27017 | 2026-11-11 |
| mongod --version | v6.0.24 | 2026-11-11 |
| grep -o -m1 avx2 /proc/cpuinfo | avx2 | 2026-11-11 |
| nvidia-smi | Échec (pas de driver NVIDIA) | 2026-11-11 |

## Constat
- Environnement : Ubuntu 24.04 local (pas conteneur cloud)
- MongoDB : actif sur 127.0.0.1:27017, version 6.0.24
- RAM : 7.1 GiB (disponible: 1.8 GiB)
- CPU : 8 cœurs, support AVX2
- GPU : AMD intégré (pas NVIDIA/CUDA)
- Stockage : 468 Go, 235 Go libre
