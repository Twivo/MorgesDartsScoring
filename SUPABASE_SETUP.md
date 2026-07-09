# Configuration Supabase

Ce guide active le mode cloud de MorgesDartsConnect. Sans cette configuration,
l'application reste utilisable en mode local via le stockage du navigateur.

## 1. Creer le projet

1. Se connecter a https://supabase.com.
2. Creer un nouveau projet.
3. Choisir une region proche des utilisateurs.
4. Conserver le mot de passe base de donnees dans un gestionnaire de secrets.

## 2. Executer les migrations

Ouvrir **SQL Editor** dans Supabase, puis executer les fichiers de
`supabase/migrations/` dans l'ordre:

1. `0001_init.sql`
2. `0002_public_scoring.sql`
3. `0003_championship.sql`
4. `0004_live_and_lock.sql`
5. `0005_training_flag.sql`

Ces migrations creent notamment:

- les saisons;
- les joueurs;
- les matchs event-sourced;
- les liens match/joueurs;
- les equipes;
- les rencontres de championnat;
- les colonnes de verrouillage de scoring;
- le flag genere `is_training`;
- les policies RLS.

Optionnel: executer `supabase/seed_gdl_2025-2026.sql` si vous voulez charger
des donnees de depart.

## 3. Creer le compte admin

Dans Supabase:

1. Aller dans **Authentication > Users**.
2. Ajouter un utilisateur avec email et mot de passe.
3. Option recommande: desactiver les inscriptions publiques dans
   **Authentication > Providers > Email**.

L'application suppose un usage simple avec un compte organisateur/admin.

## 4. Configurer l'application

Copier `.env.example` vers `.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

La cle anon est publique par design. Ne jamais utiliser de cle `service_role`
dans le frontend.

## 5. Verifier les permissions

Apres configuration:

- un visiteur non connecte peut lire les donnees publiques;
- un visiteur non connecte peut creer/scorer un match d'entrainement;
- un visiteur non connecte ne peut pas gerer joueurs, equipes ou saisons;
- un visiteur non connecte ne peut pas creer/scorer une rencontre championnat;
- un admin connecte peut gerer les donnees de championnat;
- seul un admin connecte peut supprimer des matchs.

Ces regles sont enforcees cote base par RLS, pas seulement par l'interface.

## 6. Variables pour GitHub Pages

Pour le deploiement, ajouter les memes valeurs dans les secrets ou variables
GitHub Actions:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Puis pousser sur `main`. Le workflow GitHub Pages construira l'application.

## 7. Ajouter une saison

Exemple:

```sql
update public.seasons set is_current = false where is_current = true;

insert into public.seasons (name, starts_on, ends_on, is_current)
values ('2027/2028', '2027-09-01', '2028-08-31', true);
```

Une seule saison doit avoir `is_current = true`.

## 8. Realtime live

La migration `0004_live_and_lock.sql` ajoute `public.matches` a la publication
Realtime Supabase. Si le live ne se met pas a jour:

1. verifier que la migration a bien ete executee;
2. verifier que Realtime est active sur la table `matches`;
3. verifier que les variables `VITE_SUPABASE_*` pointent vers le bon projet.

## 9. Sauvegardes

Supabase est la source de verite en mode cloud. Avant toute modification SQL
manuelle importante:

- exporter les tables principales;
- tester la migration sur un projet de staging si possible;
- verifier les policies RLS apres modification.
