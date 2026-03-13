## Dashboard Seeker Intelligent – JobOps 2.0

### Endpoints backend

- **GET `/api/seeker/dashboard`**
  - Protégé par `authenticateJWT` via `apiRouter.use("/seeker", authenticateJWT, seekerDashboardRouter)`.
  - Réponse:
    ```ts
    {
      ok: boolean;
      data: {
        kpis: {
          activeApplications: number;
          avgPSOScore: number;
          responseRate: number;
          scheduledInterviews: number;
        };
        marketPulse: {
          skills: Array<{
            name: string;
            tensionScore: number; // 0-1
            trendDelta: number;   // >0 up, <0 down, 0 stable
            salaryP50: number;    // median salary (EUR)
          }>;
        };
        momentumScore: number; // 0-100
        recentActivity: Array<{
          type: string;
          description: string;
          timestamp: string; // ISO
          icon: string;
        }>;
        insightOfDay: string;
      };
      meta: { requestId?: string | number | string[] };
    }
    ```

- **GET `/api/seeker/market-pulse/live`** (SSE)
  - Envoie des événements `market-pulse` périodiques:
    ```ts
    event: market-pulse
    data: {
      marketPulse: { skills: MarketPulseSkill[] };
      momentumScore: number;
      sentAt: string; // ISO
    }
    ```

### Règles de calcul – Momentum Score

Score sur 100, construit par blocs de 20 points:

- **+20** si au moins 3 candidatures cette semaine (`jobs.status = 'applied'` et `appliedAt` >= début de semaine).
- **+20** si profil complété à 80%+ (actuellement mocké à `0.8`, prêt à être branché sur `users.profileData`).
- **+20** si au moins 1 agent actif (mock `true`, à remplacer par une requête sur la table `agents` ou équivalent).
- **+20** si `avgPSOScore > 65` (score moyen calculé sur `jobs.suitabilityScore`).
- **+20** si l’inbox tracker est connecté (au moins une intégration `post_application_integrations` avec `provider = 'gmail'` et `status = 'connected'`).

Le score final est borné entre 0 et 100.

### Market Pulse (mock)

- Source actuelle: mock interne dans `seeker-dashboard.ts` (remplaçable par une agrégation de vraies offres scrappées).
- Structure:
  - 3 à 5 compétences clés du seeker (ex.: `TypeScript`, `React`, `Node.js`, `PostgreSQL`, `JobOps AI`).
  - `tensionScore`: intensité de la demande marché (0 à 1).
  - `trendDelta`: tendance par rapport à la période précédente.
  - `salaryP50`: salaire médian estimé.

### Intégration frontend – `DashboardPage.tsx`

- Ajout d’un fetch agrégé:
  - Appel additionnel à `GET /api/seeker/dashboard` dans l’effet de chargement du dashboard.
  - Mise à jour des états:
    - `seekerKpis`, `marketPulse`, `momentumScore`, `seekerActivity`, `insightOfDay`.

- Nouveaux widgets:
  - **Quick Actions bar** sous le header:
    - `Lancer un scraping` → `/jobs/ready`
    - `Voir nouvelles offres` → `/jobs/all`
    - `Préparer entretien` → `/applications/in-progress`
  - **KPIs intelligents seeker**:
    - Active Applications, Avg PSO Score, Response Rate, Scheduled Interviews.
    - Animations `useCountUp`, icons Lucide, style glassmorphism.
  - **Market Pulse widget**:
    - Liste de 3–5 skills avec barre de tension colorée, salaire médian et badge de tendance.
  - **Momentum Score gauge**:
    - Gauge circulaire SVG animée, couleur dépendant de la tranche de score (rouge / orange / vert).
    - Texte dynamique sous le gauge (`Excellent rythme !`, `Bon rythme, continuez !`, `Augmentez votre cadence`).
  - **Insight du jour**:
    - Carte colorée avec icône `Sparkles` et texte d’insight basé sur le marché et le momentum.
  - **Activity Timeline enrichie**:
    - Timeline intelligente combinant `seekerActivity` (agrégée) et `activities` existantes, limitée à 10 éléments, avec lien `Voir tout` vers `/overview`.

