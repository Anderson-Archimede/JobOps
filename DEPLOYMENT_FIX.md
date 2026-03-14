# Correctifs Déploiement Vercel & Render

## Problèmes identifiés et résolus

### 1. Erreur Vercel : `npm ERR! Must provide a string or array of strings`

**Cause** : Dans `vercel.json`, l'`installCommand` utilisait `--workspace orchestrator --workspace shared` (syntaxe invalide pour npm 10+).

**Correctif** : Remplacé par `--workspaces` (pluriel) qui installe tous les workspaces définis dans le `package.json` racine.

```json
// Avant (ERREUR)
"installCommand": "npm ci --workspace orchestrator --workspace shared --include-workspace-root"

// Après (CORRECT)
"installCommand": "npm ci --workspaces --include-workspace-root"
```

### 2. Erreur Render : `COPY failed: file not found in build context`

**Cause** : Le `Dockerfile` essayait de copier `extractors/jobspy/package.json` et `extractors/jobspy/` alors que ce dossier n'existe pas dans le repository.

**Correctif** : Supprimé toutes les références à `jobspy` du Dockerfile (lignes 41, 61, 123).

```dockerfile
# Avant (ERREUR)
COPY extractors/jobspy/package.json ./extractors/jobspy/
COPY extractors/jobspy ./extractors/jobspy

# Après (CORRECT)
# Lignes supprimées
```

### 3. Protection Vercel

**Problème** : Vercel Deployment Protection bloquait TOUTES les requêtes (y compris les rewrites API) avec une page d'authentification HTML, d'où l'erreur `unexpected response shape`.

**Action requise** : 
1. Aller sur [vercel.com](https://vercel.com) → Projet → **Settings** → **Deployment Protection**
2. Désactiver "Vercel Authentication" pour **Production** (ou limiter à "Preview Deployments")
3. Sauvegarder et redéployer

## État actuel

✅ **Commit** : `c9e99a6` poussé sur GitHub  
✅ **Render** : Deploy hook déclenché (build en cours ~5-10 min)  
⏳ **Vercel** : Redéploiement automatique via GitHub (dès que le commit est détecté)

## Étapes de vérification

### 1. Vérifier le build Render (dans ~5-10 minutes)
```bash
curl https://jobops.onrender.com/api/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "authEnabled": false,
  ...
}
```

### 2. Vérifier Vercel (après redéploiement automatique)
```bash
curl https://votre-url.vercel.app/api/health
```

Si toujours **HTTP 401** : désactiver la Deployment Protection (voir section 3 ci-dessus).

### 3. Tester le frontend Vercel

Ouvrir `https://votre-url.vercel.app/dashboard` dans un navigateur :
- **Sans protection** : la page devrait charger le dashboard
- **Avec protection active** : vous verrez "Authentication Required"

## Configuration finale Vercel

`vercel.json` (racine du projet) :
```json
{
  "version": 2,
  "buildCommand": "cd orchestrator && npm run vercel-build",
  "outputDirectory": "orchestrator/dist/client",
  "installCommand": "npm ci --workspaces --include-workspace-root",
  "framework": null,
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://jobops.onrender.com/api/:path*" },
    { "source": "/pdfs/:path*", "destination": "https://jobops.onrender.com/pdfs/:path*" },
    { "source": "/((?!api)(?!pdfs)(?!assets)(?!favicon)(?!_next).*)", "destination": "/index.html" }
  ]
}
```

## Environnement Vercel

Variables à configurer dans **Settings → Environment Variables** :

- `VITE_AUTH_ENABLED=false` (désactive le login frontend)
- Appliquer à : **Production**, **Preview**, **Development**

## Notes importantes

1. **Cold start Render (free tier)** : Le service se met en sommeil après 15 min d'inactivité. La première requête prend ~30-60s.

2. **Rewrites vs Routes** : `rewrites` fait un proxy côté serveur (pas de CORS), alors que `routes` avec `dest` externe ferait une redirection (problèmes CORS).

3. **Deployment Protection** : Bloque TOUT, y compris les rewrites API. À désactiver pour la production ou utiliser un bypass token.

## Déploiements futurs

Pour redéployer manuellement :

```powershell
# Render uniquement
.\scripts\deploy.ps1 render

# Vercel uniquement  
.\scripts\deploy.ps1 vercel

# Les deux
.\scripts\deploy.ps1 all
```

Ou via deploy hooks :
```bash
# Render
curl "https://api.render.com/deploy/srv-d6p9gmpaae7s73bq4vg0?key=_SURjNydIH0"

# Vercel (automatique via GitHub push)
git push origin main
```

---

**Date** : 2026-03-14  
**Commit** : c9e99a6  
**Statut** : ✅ Correctifs appliqués, déploiements en cours
