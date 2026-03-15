# SlimToolkit – Images minifiées

Ce projet utilise [SlimToolkit](https://slimtoolkit.org/) pour produire une image Docker minifiée à partir de l’image complète, afin de réduire la taille et la surface d’attaque.

## Fichiers concernés

| Fichier | Rôle |
|--------|------|
| `slim.yaml` | Configuration du service (domain, ports) et options utilisées par les scripts de build. |
| `scripts/build-slim.ps1` | Build Docker + minification Slim (Windows PowerShell). |
| `scripts/build-slim.sh` | Build Docker + minification Slim (Linux / macOS). |

## Prérequis

- **Docker** (obligatoire).
- **SlimToolkit** (optionnel si vous utilisez Docker) :
  - **Windows** : rien à installer — le script utilise l’image Docker `dslim/slim`.
  - **macOS / Linux** : `brew install slim` ou [Installation](https://slimtoolkit.org/docs/install) ; sinon le script peut aussi utiliser l’image Docker.

## Utilisation

À la **racine du dépôt** (pas dans `scripts/`) :

**Windows (PowerShell)**  
```powershell
.\scripts\build-slim.ps1
```

**Linux / macOS**  
```bash
chmod +x scripts/build-slim.sh
./scripts/build-slim.sh
```

Le script :

1. Construit l’image Docker complète `job-ops:full`.
2. Lance SlimToolkit sur cette image et produit `job-ops:slim`.

L’option `--http-probe-cmd` appelle `GET http://localhost:3001/health` pour que Slim conserve les fichiers nécessaires au healthcheck (comme dans le `Dockerfile`).

## Lancer l’image minifiée

```bash
docker run --rm -p 3005:3001 job-ops:slim
```

Avec variables d’environnement et volume (comme en prod) :

```bash
docker run --rm -p 3005:3001 -e NODE_ENV=production -v ./data:/app/data job-ops:slim
```

## Personnalisation

Les paramètres (image cible, tag slim, port, probe) sont documentés dans `slim.yaml`. Les scripts utilisent pour l’instant des valeurs en dur alignées sur ce fichier ; vous pouvez les modifier dans :

- `scripts/build-slim.ps1` (variables `$TargetImage`, `$SlimTag` et arguments de `slim build`).
- `scripts/build-slim.sh` (variables `TARGET_IMAGE`, `SLIM_TAG` et arguments de `slim build`).

## Références

- [SlimToolkit](https://slimtoolkit.org/)
- [GitHub slimtoolkit/slim](https://github.com/slimtoolkit/slim)
