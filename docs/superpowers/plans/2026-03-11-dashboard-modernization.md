# Dashboard Modernization Plan d'Implémentation

**Objectif :** Transformer le dashboard actuel en une interface premium, colorée et data-driven avec une intégration complète des datasets.

**Architecture :** 
- **Frontend :** Refonte de `DashboardPage.tsx` avec Lucide-React stylisé (couleurs HSL, gradients), amélioration des cartes KPI et ajout d'un widget "Datasets".
- **Backend :** Mise à jour de `analytics.ts` pour inclure des statistiques sur les datasets et assurer des retours de données riches.
- **Design :** Utilisation de palettes de couleurs vibrantes et d'effets de survol dynamiques.

**Stack Technique :** React, Lucide-React, Recharts, TailwindCSS (Vanilla CSS tokens), Express (Analytics API).

---

## Proposed Changes

### [Component] Dashboard Modernization

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/ander/Downloads/Job_ops/job-ops/orchestrator/src/client/pages/DashboardPage.tsx)
- Moderniser les icônes Lucide avec des couleurs spécifiques par catégorie (Blue pour Applications, Green pour Score, etc.).
- Ajouter un widget "Datasets Overview" sous les graphiques.
- Améliorer le style des cartes KPI (glassmorphism, ombres douces).
- Remplacer les couleurs de graphiques par défaut par une palette unifiée.

#### [MODIFY] [analytics.ts](file:///c:/Users/ander/Downloads/Job_ops/job-ops/orchestrator/src/server/api/routes/analytics.ts)
- Ajouter un endpoint `/api/analytics/datasets-summary` pour le nouveau widget dashboard.
- Améliorer l'endpoint `/api/analytics/activity` pour inclure plus de détails.

---

## Tasks

### Tâche 1 : Backend - API Datasets Summary

**Fichiers :**
- Modifier : `orchestrator/src/server/api/routes/analytics.ts`

- [ ] **Étape 1 : Ajouter l'endpoint de résumé des datasets**
- [ ] **Étape 2 : Vérifier le fonctionnement via `curl`**

### Tâche 2 : Frontend - Icônes et Styles Modernes

**Fichiers :**
- Modifier : `orchestrator/src/client/pages/DashboardPage.tsx`

- [ ] **Étape 1 : Refonte du Header et des Cartes KPI (Styles colorés)**
- [ ] **Étape 2 : Modernisation des icônes d'activité**

### Tâche 3 : Frontend - Intégration Datasets Widget

**Fichiers :**
- Modifier : `orchestrator/src/client/pages/DashboardPage.tsx`

- [ ] **Étape 1 : Créer le composant `DatasetsWidget`**
- [ ] **Étape 2 : Lier au backend via `useEffect`**

### Tâche 4 : Polissage UI/UX

- [ ] **Étape 1 : Ajouter des animations de chargement (Skeletons améliorés)**
- [ ] **Étape 2 : Harmoniser les couleurs Recharts**

---

## Verification Plan

### Automated Tests
- `npm --workspace orchestrator run test:run`

### Manual Verification
- Vérifier visuellement le dashboard sur `http://localhost:3000/dashboard`
- Confirmer que le widget Datasets affiche les données réelles.
- Tester la réactivité sur mobile.
