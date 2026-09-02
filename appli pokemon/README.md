# KantoTeam

KantoTeam est une application web locale pour creer et analyser des equipes Pokemon.

Le switch principal bascule toute l'application entre `Kanto Reforged` et `Pokemon Z v2.12 Patch 1`. Chaque version possede ses trois propres slots, sa bibliotheque et ses equipes partagees : aucune donnee de jeu n'est melangee.

La source Pokemon Z contient les 1 018 entrees definies par le jeu : Pokemon officiels disponibles, formes Z et Fakemon. Le guide d'obtention associe une methode documentee aux 1 018 entrees (capture, evolution, echange PNJ, reproduction, fossile, don ou condition speciale).

Les sprites sont optionnels. Lorsqu'une connexion est disponible, le bouton `Afficher les sprites` charge uniquement les images des Pokemon presents dans les equipes via PokéAPI. Hors ligne, le bouton et les images restent masques sans avertissement.

## Lancer le site

Le projet est une app statique en HTML, CSS et JavaScript pur.

Options :

- ouvrir `index.html` directement dans le navigateur ;
- ou lancer un serveur local depuis ce dossier.

```powershell
python -m http.server 5173
```

Puis ouvrir :

```text
http://localhost:5173
```

## Donnees locales

Les equipes et la bibliotheque de Pokemon sont sauvegardees dans `localStorage`.

Chaque bibliotheque contient les Pokemon de la version active ou des Pokemon personnalises avec leurs types d'attaque.

Les equipes se suppriment individuellement depuis leurs slots. Les Pokemon sauvegardes se gerent depuis la bibliotheque.

## Regenerer les donnees Pokemon Z

Le fichier `src/pokemon-z-data.js` est genere depuis le fichier `PBS/pokemon.txt` de la version francaise v2.12 Patch 1. Pour le reconstruire depuis une installation locale du jeu :

```powershell
node scripts/build-pokemon-z-data.js "C:\chemin\vers\Pokemon Z\PBS\pokemon.txt"
```

Le guide d'obtention peut etre regenere depuis les pages publiques du guide Pokemon Z :

```powershell
node scripts/build-pokemon-z-guide.js
```

## Variantes graphiques Pokemon Z

Les logos et icones marques comme assets de theme basculent automatiquement vers un fichier portant le suffixe `_z` lorsque Pokemon Z est actif. Le nom, l'extension et la casse doivent rester identiques :

- `Logo-aide-type.png` devient `Logo-aide-type_z.png` ;
- `add-pokeball.png` devient `add-pokeball_z.png` ;
- `team-pokeball.png` devient `team-pokeball_z.png` ;
- `add-team-pokeball.png` devient `add-team-pokeball_z.png` ;
- `pokeball.png` devient `pokeball_z.png` ;
- `share-pokeball.png` devient `share-pokeball_z.png` dans toute l'interface de partage et pour le fichier joint.

Si une variante n'existe pas encore, l'application conserve automatiquement l'image Reforged. Les roles sont separes : `pokeball` identifie un Pokemon de l'equipe, `add-pokeball` l'ajout d'un Pokemon, `team-pokeball` une equipe existante et `add-team-pokeball` un slot d'equipe libre. Si `team-pokeball` n'est pas fourni, `pokeball` sert temporairement de repli.

Pour ces icones affichees entre 24 et 52 pixels, un export PNG carre de 256 x 256 pixels est recommande. Les sources 1254 x 1254 sont inutilement lourdes pour l'interface web.

## Test navigateur

```powershell
node tests/serve.js
```

Puis ouvrir `http://127.0.0.1:8765/tests/browser-smoke.html`. Le test valide les deux banques, les six slots repartis en 3 + 3 et le catalogue Pokemon Z complet.
