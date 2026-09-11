# KantoTeam

KantoTeam est une application web locale pour creer et analyser des equipes Pokemon.

Le switch principal bascule toute l'application entre `Kanto Reforged` et `Pokemon Z v2.12 Patch 1`. Chaque version possede ses trois propres slots, sa bibliotheque et ses equipes partagees : aucune donnee de jeu n'est melangee.

La source Pokemon Z contient les 1 018 entrees definies par le jeu : Pokemon officiels disponibles, formes Z et Fakemon. Le guide d'obtention associe une methode documentee aux 1 018 entrees (capture, evolution, echange PNJ, reproduction, fossile, don ou condition speciale). Les rencontres sauvages sont completees avec les tables internes et les noms de cartes francais de la v2.12 Patch 1.

Pour les fiches Pokémon Z, les rencontres, les rencontres fixes, les dons, les échanges PNJ et les conditions d'évolution proviennent en priorité des fichiers compilés de la v2.12 FR. Le guide web complète uniquement les cas que les données internes ne décrivent pas directement ; PokéAPI ne sert qu'à relier les membres des lignées officielles et à charger les sprites/statistiques.

Les méthodes d'obtention issues des pages du guide complètent les données internes. Les échanges PNJ sont lus dans les événements du jeu afin de conserver le bon sens de l'échange, le lieu et le niveau du Pokémon reçu.

Les sprites et les talents officiels sont complétés via PokéAPI lorsqu'une connexion est disponible. Dans les cartes, un bouton discret ouvre la liste des talents, leurs explications françaises et l'indication des talents cachés. Pour un Pokémon enregistré ou présent dans une équipe modifiable, le talent réellement possédé peut être verrouillé sur cet exemplaire et reste mémorisé. Les formes ou Fakemon sans identifiant national restent signalés comme non documentés plutôt que de recevoir une information inventée.

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

Les rencontres sauvages sont generees separement afin qu'une mise a jour du guide web ne les efface pas. Le troisieme argument est un objet JSON `{ "idCarte": "Nom francais" }` extrait de `Data/MapInfos.rxdata` de la meme version :

```powershell
node scripts/build-pokemon-z-encounters.js "C:\chemin\vers\PBS\encounters.txt" "C:\chemin\vers\PBS\pokemon.txt" "C:\chemin\vers\map-names.json"
```

Lorsque seuls les fichiers compiles du jeu sont disponibles, la commande suivante reconstruit directement les rencontres et les evolutions depuis `encounters.dat`, `evolutions.dat`, `Constants.rxdata` et `french.dat`. Ces donnees internes sont prioritaires sur les conditions du guide web :

```powershell
node scripts/build-pokemon-z-compiled-guide.js "C:\chemin\vers\Pokemon Z\Data"
```

Le decodeur Ruby Marshal local prend aussi en charge l'extraction des scripts RGSS pour auditer les regles executees par le jeu :

```powershell
node scripts/extract-rgss-scripts.js "C:\chemin\vers\Pokemon Z\Data\Scripts.rxdata" "C:\dossier\de\sortie"
```

Le mini-wiki de Pokemon Z est chargé uniquement lors de son ouverture. Il regroupe les 108 CT, les 6 CS, leurs compatibilités et lieux d'obtention détectés, les 906 objets avec leur description française, les équipes des 12 chefs, les plafonds de niveau, les aides progressives, 45 missions, 50 recettes, 27 succès, 39 astuces uniques, les mini-jeux et les principales mécaniques. L'alchimie et l'index des objets suivent la checklist anti-spoiler : les trois recettes de départ sont visibles, puis chaque page cochée révèle uniquement la recette suivante et les objets qui lui sont associés. Un bouton averti permet de consulter volontairement le catalogue complet, hors CT/CS déjà classées dans leur propre section. Ce catalogue peut filtrer les objets à tenir par effet recherché et par type concerné. Les chefs et leurs équipes sont eux aussi limités au palier anti-spoiler calculé depuis les badges et le niveau enregistrés. Les fiches de combat expliquent aussi clairement le STAB, les multiplicateurs de type, les catégories Physique/Spéciale, l'endurance, la vitesse et les statuts. Depuis la fiche détaillée d'un membre de l'équipe Z, un bouton ouvre aussi ses CT/CS compatibles et ses capacités apprises par niveau. Les 1 018 listes d'apprentissage sont conservées dans un second fichier chargé uniquement à la demande. Pour régénérer ces données depuis les fichiers compilés :

```powershell
node scripts/build-pokemon-z-wiki.js "C:\chemin\vers\Pokemon Z\Data"
```

Verifier ensuite les invariants du guide :

```powershell
node tests/pokemon-z-guide-data.test.js
node tests/pokemon-z-wiki-data.test.js
```

Les 1 018 profils de statistiques et leurs talents propres à Pokémon Z sont extraits de `dexdata.dat` et `french.dat` par la commande précédente. Ils sont prioritaires pour les fiches, les scores d'efficacité et la fenêtre de sélection du talent, y compris pour les Fakemon. Les données officielles restent un repli pour les autres banques. Leur fichier peut être régénéré depuis PokeAPI avec :

```powershell
node scripts/build-official-pokemon-stats.js
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
