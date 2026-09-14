# Authentification et synchronisation cloud

## Etat des phases 1 et 2

Le depot est une application statique HTML/CSS/JavaScript sans bundler. Son etat local reste stocke sous `kantoTeamState:v2` dans `localStorage`. Chaque jeu (`reforged` et `pokemon-z`) possede trois slots, une bibliotheque et des equipes partagees. Les liens de partage encodent une copie compacte de l'equipe dans le parametre URL `team` et restent independants du cloud.

La phase 1 ajoute un Worker devant les routes `/api/*`, une migration D1 et les API serveur. La phase 2 ajoute la connexion dans l'interface, la restauration de session, la liste des équipes cloud et la synchronisation manuelle des équipes locales. L'application actuelle et ses sauvegardes locales continuent de fonctionner hors connexion exactement comme avant.

## Architecture

- Les fichiers de `appli pokemon/` sont servis comme assets statiques.
- Seules les routes `/api/*` passent d'abord par `worker/index.js`.
- Le binding D1 se nomme `DB` et cible `kanto-build-team`.
- Les requetes hors `/api/*` sont transmises au binding `ASSETS`.
- Aucune equipe cloud n'est publique. Le partage par URL existant reste un mecanisme separe.

## Base D1

La migration `migrations/0001_auth_and_cloud_teams.sql` cree :

- `users` : pseudo affiche, pseudo normalise unique, hash/sel et parametres du mot de passe ;
- `sessions` : hash du jeton, utilisateur et expiration ;
- `teams` : proprietaire, identifiant local idempotent, version de jeu et JSON de l'equipe.

Les cles etrangeres suppriment sessions/equipes avec leur utilisateur. `UNIQUE(user_id, local_id)` rend un import local repetable sans doublon.

## Authentification et sessions

Le compte utilise uniquement un pseudo et un mot de passe. Le pseudo accepte 3 a 24 lettres ASCII, chiffres, `_` ou `-`; sa version NFKC en minuscules est unique. Le mot de passe contient 8 a 128 caracteres.

Les mots de passe sont derives avec PBKDF2-HMAC-SHA-512, un sel aleatoire individuel de 16 octets et 100 000 iterations. Cette valeur correspond au maximum actuellement accepte par le runtime Web Crypto de Cloudflare Workers ; le nombre d'iterations est stocke avec chaque utilisateur afin de permettre une augmentation future. Les jetons de session sont aleatoires (32 octets) et seul leur SHA-256 est stocke. Le cookie est `HttpOnly`, `SameSite=Lax`, `Path=/`, expire apres 30 jours et recoit `Secure` en HTTPS.

## Interface et synchronisation

Le bouton `Connexion` ouvre une modale avec deux onglets : connexion et création de compte. Une fois connecté, il affiche le pseudo et donne accès aux équipes privées du compte.

`Synchroniser mes équipes locales` effectue la première liaison des équipes des deux jeux avec D1. Après cette liaison, les modifications sont envoyées automatiquement après 1,5 seconde d'inactivité. L'application vérifie uniquement les métadonnées de révision toutes les 60 secondes lorsqu'elle est visible, au retour au premier plan et au retour de la connexion. Le JSON complet n'est téléchargé que lorsqu'une révision a changé.

Chaque équipe possède une révision entière générée par le serveur. Une écriture doit fournir `expectedRevision` et D1 ne l'accepte que si cette valeur correspond encore à la révision courante. Une modification concurrente renvoie `409 Conflict` avec la dernière version ; l'interface permet alors d'utiliser le cloud, l'appareil courant ou de garder les deux copies. La suppression cloud utilise la même protection et ne touche jamais la copie locale.

Une empreinte SHA-256 de la dernière équipe synchronisée permet de distinguer une modification locale d'une mise à jour distante sans dépendre de l'horloge des appareils. Les onglets d'un même navigateur se mettent aussi à jour avec l'événement `storage`.

## Endpoints

- `POST /api/auth/register` — `{ "username", "password" }`
- `POST /api/auth/login` — `{ "username", "password" }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/teams`
- `GET /api/teams/versions` — métadonnées légères sans `team_data`
- `GET /api/teams/:id`
- `POST /api/teams` — `{ "localId", "team" }`, création sans écrasement
- `PUT /api/teams/:id` — `{ "localId", "team", "expectedRevision" }`
- `DELETE /api/teams/:id` — `{ "expectedRevision" }`

Le proprietaire est toujours deduit de la session. Un `user_id` du navigateur n'est jamais accepte. Les mutations refusent les origines differentes et les requetes marquees `cross-site`.

## Configuration locale

Installer les outils :

```powershell
npm install
```

L'UUID de la base D1 `kanto-build-team` est configuré dans `wrangler.jsonc`. Pour vérifier la connexion et retrouver les bases du compte :

```powershell
npx wrangler d1 list
```

Appliquer et tester la migration localement :

```powershell
npm run db:migrate:local
npm run dev
```

Appliquer ensuite la migration distante et deployer :

```powershell
npm run db:migrate:remote
npm run deploy
```

Aucun secret applicatif n'est requis dans cette phase. Ne jamais committer `.dev.vars`, `.env`, mot de passe, jeton de session ou jeton API Cloudflare.

## Suite prevue

- ajouter une limitation des tentatives de connexion avant mise en production ;
- tester les parcours multi-utilisateur et conserver les tests du partage existant ;
- appliquer la migration distante apres configuration de l'UUID reel.

## Checklist

- [x] UUID D1 reel configure et migration distante appliquee
- [x] migration versionnee
- [x] inscription et connexion serveur sans adresse mail
- [x] sessions serveur avec cookie securise
- [x] CRUD cloud avec controle du proprietaire
- [x] import API idempotent par identifiant local
- [x] sauvegarde locale existante preservee
- [x] interface d'authentification
- [x] import local guide et idempotent dans l'interface
- [x] revisions atomiques et detection des conflits multi-appareils
- [x] synchronisation automatique differee et verification legere en arriere-plan
- [x] validation distante et deploiement
