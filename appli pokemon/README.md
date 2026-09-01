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
- `partage.png` devient `partage_z.png` ;
- `add-pokeball.svg` devient `add-pokeball_z.svg` ;
- `share-pokeball.png` devient `share-pokeball_z.png` pour le fichier joint lors d'un partage.

Si une variante n'existe pas encore, l'application conserve automatiquement l'image Reforged. Cette convention fonctionne pour les PNG et les SVG. Un SVG charge avec une balise `img` ne permet pas de recolorer uniquement ses zones noires en CSS : la variante `_z.svg` est donc la methode prevue pour ces changements.

## Test navigateur

```powershell
node tests/serve.js
```

Puis ouvrir `http://127.0.0.1:8765/tests/browser-smoke.html`. Le test valide les deux banques, les six slots repartis en 3 + 3 et le catalogue Pokemon Z complet.
