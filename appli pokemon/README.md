# KantoTeam

KantoTeam est une petite application web locale pour creer jusqu'a 3 equipes Pokemon de generation 1 et analyser leurs faiblesses, resistances, immunites et couvertures offensives.

Le selecteur propose la liste Kanto originale ainsi qu'une liste `Kanto Reforged` locale, dont les types alternatifs sont conserves independamment.

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
