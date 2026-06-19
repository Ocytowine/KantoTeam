# Plan de travail - Application d'analyse d'equipes Pokemon

## Objectif

Creer un petit site web simple, responsive et utilisable hors ligne pour composer jusqu'a 3 equipes Pokemon, analyser leurs faiblesses defensives, leurs resistances, leur couverture offensive et donner des conseils lisibles pour ameliorer l'equilibre global.

L'application doit rester locale au navigateur de l'utilisateur, sans compte et sans serveur obligatoire.

## Decisions validees

- L'application commence avec les Pokemon de la premiere generation.
- Chaque equipe contient entre 1 et 6 Pokemon, au choix de l'utilisateur.
- L'utilisateur peut sauvegarder 3 equipes dans 3 slots.
- Une equipe contient un nom et une liste de Pokemon.
- Chaque Pokemon a 1 ou 2 types defensifs.
- Chaque Pokemon peut avoir jusqu'a 4 types d'attaque.
- Les attaques sont representees uniquement par leur type, pas par leur nom.
- Les images des Pokemon ne sont pas necessaires.
- Les logos de types pourront etre ajoutes plus tard si disponibles.
- Les icones peuvent rester simples, avec des symboles textuels ou proches du style Markdown.
- Le theme visuel cible est sombre, compact et clair.
- Les Pokemon personnalises doivent etre sauvegardes par defaut et reutilisables dans d'autres equipes.

## Donnees a gerer

### Donnees prechargees

L'application embarquera localement :

- la table des types Pokemon ;
- les multiplicateurs defensifs entre types ;
- la liste des Pokemon de generation 1 ;
- les types officiels de ces Pokemon.

Ces donnees doivent fonctionner hors ligne une fois le site charge.

### Donnees utilisateur

Les donnees utilisateur seront stockees dans `localStorage` :

- les 3 slots d'equipes ;
- le nom de chaque equipe ;
- les Pokemon choisis dans chaque equipe ;
- les types d'attaque choisis pour chaque Pokemon ;
- les Pokemon personnalises sauvegardes ;
- les preferences simples si besoin plus tard.

Oui, `localStorage` convient pour :

- modifier une equipe ;
- supprimer une equipe ;
- remplacer un slot ;
- reinitialiser toutes les donnees ;
- charger des Pokemon personnalises reutilisables.

Limites a connaitre :

- les donnees restent sur le navigateur et l'appareil de l'utilisateur ;
- elles ne sont pas synchronisees entre plusieurs appareils ;
- elles peuvent etre effacees si l'utilisateur vide les donnees du navigateur ;
- ce n'est pas adapte a des donnees sensibles, mais c'est suffisant ici.

## Structure fonctionnelle

### 1. Ecran principal

L'ecran principal affiche :

- 3 slots d'equipe ;
- l'etat de chaque slot : vide ou equipe existante ;
- un bouton ou une action pour creer une equipe dans un slot vide ;
- une action pour ouvrir l'analyse d'une equipe existante ;
- une action pour modifier, supprimer ou remplacer une equipe.

Sur mobile, les slots seront affiches verticalement. Sur desktop, ils pourront etre affiches en ligne ou dans une grille compacte.

### 2. Creation et edition d'equipe

L'utilisateur doit pouvoir :

- entrer un nom d'equipe ;
- ajouter entre 1 et 6 Pokemon ;
- choisir un Pokemon original avec recherche ;
- choisir un Pokemon personnalise deja sauvegarde ;
- creer un nouveau Pokemon personnalise ;
- definir jusqu'a 4 types d'attaque par Pokemon ;
- voir les faiblesses et resistances du Pokemon en cours ;
- confirmer l'equipe ;
- revenir ensuite automatiquement vers la page d'analyse de l'equipe.

Pour ajouter un Pokemon, l'interface proposera 3 choix :

- `Originaux` : recherche dans les Pokemon de generation 1 ;
- `Personnalises` : selection d'un Pokemon personnalise sauvegarde ;
- `Nouveau personnalise` : creation d'un Pokemon avec nom, type principal, type secondaire optionnel et types d'attaque.

Un nouveau Pokemon personnalise sera sauvegarde par defaut pour etre reutilisable.

### 3. Analyse individuelle d'un Pokemon

Pour chaque Pokemon, l'application doit afficher :

- ses types defensifs ;
- ses faiblesses : `x2`, `x4` ;
- ses resistances : `x0.5`, `x0.25` ;
- ses immunites : `x0` ;
- ses types d'attaque ;
- les types adverses que ses attaques peuvent toucher efficacement.

L'analyse defensive est basee sur les types du Pokemon.

L'analyse offensive est basee sur les types d'attaque choisis par l'utilisateur.

### 4. Analyse globale de l'equipe

L'analyse globale doit afficher :

- un tableau des menaces ;
- un tableau des avantages ;
- les faiblesses defensives les plus importantes ;
- les resistances et immunites globales ;
- les types offensifs presents ;
- les types offensifs absents ou insuffisants ;
- les types sur-representes ;
- des conseils textuels simples.

## Regles de calcul proposees

### Multiplicateur defensif individuel

Pour chaque type d'attaque adverse, on calcule le multiplicateur recu par chaque Pokemon :

- `x0` : immunite ;
- `x0.25` : double resistance ;
- `x0.5` : resistance ;
- `x1` : neutre ;
- `x2` : faiblesse ;
- `x4` : double faiblesse.

Pour un Pokemon a deux types, les multiplicateurs des deux types sont multiplies.

Exemple :

- Eau + Vol contre Electrik : `x2 * x2 = x4`.
- Eau + Sol contre Electrik : `x2 * x0 = x0`.

### Score de menace d'un type adverse

Pour chaque type adverse, on calcule un score de menace pour l'equipe :

- `+1` si un Pokemon est touche en `x2` ;
- `+2` si un Pokemon est touche en `x4` ;
- `0` si le Pokemon est touche en `x1` ;
- `-1` si le Pokemon resiste en `x0.5` ou `x0.25` ;
- `-2` si le Pokemon est immunise en `x0`.

Le tableau des menaces doit surtout mettre en avant les types avec un score positif.

Une menace est plus critique si :

- plusieurs Pokemon sont faibles au meme type ;
- au moins un Pokemon prend `x4` ;
- l'equipe a peu de resistances ou d'immunites contre ce type.

### Score d'avantage defensif

Un type adverse est un avantage defensif si l'equipe contient plusieurs Pokemon qui :

- resistent a ce type ;
- ou sont immunises contre ce type.

L'objectif est de montrer contre quels types l'equipe encaisse bien.

### Couverture offensive

Pour les types d'attaque choisis dans l'equipe, l'application calcule :

- quels types adverses peuvent etre touches en super efficace ;
- quels types adverses ne sont pas bien couverts ;
- quels types d'attaque sont trop presents dans l'equipe.

Un type offensif peut etre considere comme sur-represente si plusieurs Pokemon possedent le meme type d'attaque et que cela n'ajoute pas beaucoup de couverture.

### Conseils textuels

Les conseils doivent rester simples au debut :

- `Defense : votre equipe est tres exposee au type Electrik. Ajoutez une resistance ou une immunite Sol.`
- `Defense : plusieurs Pokemon ont une faiblesse x4 au type Glace.`
- `Attaque : votre equipe manque de couverture contre Dragon. Ajoutez une attaque Glace, Dragon ou Fee.`
- `Attaque : le type Eau est tres present dans vos attaques. Verifiez que cela ne limite pas la couverture.`

## Interface prevue

### Style general

- Theme sombre.
- Interface compacte.
- Badges colores pour les types.
- Contrastes lisibles sur mobile.
- Pas de page marketing : l'utilisateur arrive directement sur l'outil.
- Navigation simple entre slots, edition et analyse.

### Composants principaux

- `TeamSlot` : carte compacte pour un slot d'equipe.
- `TeamEditor` : formulaire de creation et edition.
- `PokemonPicker` : choix entre originaux, personnalises et nouveau personnalise.
- `PokemonRow` : ligne compacte d'un Pokemon dans l'equipe.
- `TypeBadge` : badge colore d'un type.
- `MultiplierBadge` : badge `x0`, `x0.5`, `x2`, `x4`.
- `TeamAnalysis` : vue d'analyse globale.
- `AdvicePanel` : conseils textuels.
- `StorageControls` : suppression, remplacement, reinitialisation.

## Roadmap

### Version 0.1 - Base technique

- Creer la structure du site en HTML, CSS et JavaScript pur.
- Ajouter un theme sombre responsive.
- Ajouter la table des types Pokemon.
- Ajouter les fonctions de calcul des multiplicateurs defensifs.
- Ajouter des tests manuels simples dans le code ou une page de debug temporaire.

Objectif : verifier que les calculs de types sont fiables avant de construire toute l'interface.

### Version 0.2 - Donnees Pokemon generation 1

- Ajouter la liste des Pokemon de generation 1 avec leurs types.
- Ajouter une recherche simple par nom.
- Afficher les types d'un Pokemon selectionne.
- Calculer ses faiblesses, resistances et immunites.

Objectif : pouvoir analyser un Pokemon officiel individuellement.

### Version 0.3 - Creation d'equipe

- Ajouter les 3 slots d'equipe.
- Ajouter le formulaire de creation d'equipe.
- Permettre d'ajouter de 1 a 6 Pokemon.
- Permettre de choisir jusqu'a 4 types d'attaque par Pokemon.
- Ajouter la confirmation de l'equipe.
- Basculer vers l'analyse apres confirmation.

Objectif : creer une equipe complete et l'analyser.

### Version 0.4 - Sauvegarde locale

- Sauvegarder les equipes dans `localStorage`.
- Charger les equipes au demarrage.
- Modifier une equipe existante.
- Supprimer une equipe.
- Remplacer un slot.
- Ajouter une action de reinitialisation totale.

Objectif : rendre l'application vraiment utilisable sans compte.

### Version 0.5 - Pokemon personnalises

- Ajouter la creation d'un Pokemon personnalise.
- Sauvegarder les Pokemon personnalises par defaut.
- Permettre de les reutiliser dans d'autres equipes.
- Permettre de les modifier ou supprimer si besoin.

Objectif : couvrir les cas hors liste officielle et les besoins de personnalisation.

### Version 0.6 - Analyse globale avancee

- Ajouter le tableau des menaces.
- Ajouter le tableau des avantages.
- Ajouter l'analyse de couverture offensive.
- Detecter les types manquants en defense.
- Detecter les types manquants en attaque.
- Detecter les types sur-representes.
- Ajouter les conseils textuels.

Objectif : transformer les calculs en recommandations utiles.

### Version 0.7 - Finition UI

- Ameliorer les badges de types.
- Ajouter des icones simples.
- Optimiser l'affichage mobile.
- Verifier les contrastes et les espacements.
- Ajouter les logos de types si les fichiers sont fournis.
- Nettoyer les textes et les libelles.

Objectif : obtenir une app claire, agreable et facile a utiliser.

## Points a decider plus tard

- Faut-il pouvoir exporter/importer ses equipes en fichier JSON ?
- Faut-il pouvoir dupliquer une equipe ?
- Faut-il afficher les types de generation 1 seulement, ou garder tous les types modernes ?
- Faut-il inclure le type Fee, qui n'existait pas en generation 1 mais existe dans les regles modernes ?
- Faut-il integrer les talents, objets, climats ou effets speciaux ? Pour la premiere version, non.
- Faut-il suggerer des Pokemon precis plus tard, ou seulement des types ?

## Recommandation pour la premiere implementation

Commencer en HTML, CSS et JavaScript pur.

Raison :

- le projet est petit ;
- l'application doit pouvoir fonctionner hors ligne ;
- aucun compte utilisateur n'est necessaire ;
- le deploiement sera simple ;
- le code restera facile a lire et modifier.

La priorite doit etre la fiabilite des calculs de types, puis la creation d'equipe, puis seulement ensuite les conseils et la finition visuelle.
