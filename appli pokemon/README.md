# KantoTeam

KantoTeam est une petite application web locale pour creer jusqu'a 3 equipes Pokemon et analyser leurs faiblesses, resistances, immunites et couvertures offensives.

Le selecteur propose la liste Kanto originale, une liste `Kanto Reforged` locale et la liste de `Pokemon Z v2.12 Patch 1` en francais. Les types alternatifs de chaque fan game sont conserves independamment.

La source Pokemon Z contient les 1 018 entrees definies par le jeu : Pokemon officiels disponibles, formes Z et Fakemon. Elle est utilisable dans la composition, la recherche, l'assistant de types, le Versus, la bibliotheque et les liens de partage.

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

La bibliotheque peut contenir des Pokemon de Kanto ou personnalises avec leurs types d'attaque, afin de reutiliser rapidement une configuration dans plusieurs equipes.

Les equipes se suppriment individuellement depuis leurs slots. Les Pokemon sauvegardes se gerent depuis la bibliotheque.

## Regenerer les donnees Pokemon Z

Le fichier `src/pokemon-z-data.js` est genere depuis le fichier `PBS/pokemon.txt` de la version francaise v2.12 Patch 1. Pour le reconstruire depuis une installation locale du jeu :

```powershell
node scripts/build-pokemon-z-data.js "C:\chemin\vers\Pokemon Z\PBS\pokemon.txt"
```
