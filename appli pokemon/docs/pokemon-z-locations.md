# Inventaire des lieux Pokémon Z v2.12 FR

Cet inventaire recense les noms de lieux effectivement rencontrés dans les données d'obtention de l'application. Les données sources restent intactes : la traduction est appliquée uniquement à l'affichage par `src/pokemon-z-location-data.js`.

Une correspondance marquée **confirmée** provient du rapprochement entre les pages de localisation de pokemonzfangame.com et les noms contenus dans `MapInfos.rxdata` de l'archive française officielle **Pokémon Z v2.12 + Patch 1**. Les variantes anglaises ou espagnoles désignant le même lieu sont regroupées.

## Correspondances confirmées

| Nom(s) dans la source | Nom affiché dans le jeu FR |
|---|---|
| Abandoned Lighthouse | Phare Délabré |
| Acrylic Town, Acrílico Town | Nouvelle Réunion |
| Acrylic Town Ocean Floor/Seafloor, Sea/seabed of Acrylic Town | Fonds marins de Nouvelle Réunion |
| Ancient/Old Library | Bibliothèque Ancestrale |
| Ancient/Old Flooded Forge, Flooded Forge | Forge Millénaire |
| Atlas Cave, Atlas Cavern | Grotte Atlas |
| Batik City | Ôte-Âme |
| Bodegón Town | Bridouville |
| Burned Workshop | Ancien Atelier |
| Canvas Town, Pueblo Lienzo | Bourg Canvas |
| Certijo Island, Certijo Isle | Jardin Boyard |
| Chateau Lanto | Château Drazat |
| Chateau Rosillon | Manoir Rosillon |
| Circus Nightmare, Sanguine Circus | Cirnique |
| Collage Town | Bois-en-Tronc |
| Earthbound/Tierraunida Grotto, Unity Cave | Cave Connecterre |
| Eastern/Northern/Southern/Western Catacombs | Catacombes Orientales/Septentrionales/Méridionales/Occidentales |
| Flare Laboratory | Laboratoire Flare |
| Fluxus City | Flusselles |
| Fractal City | Auffrac-les-Congères |
| Fresh Town | La Frescale |
| Frozen Grotto, Frozen/Frost Cave | Caverne Gelée |
| Glittering/Shimmering/Refulgent/Luminous Cave | Grotte Luminescente |
| Grisalla Cave | Grotte Navarre |
| Grisalla City | Navarroc |
| Hillside Forest | Clairière Collinaire |
| Isle/Montesanto Island | Île de la Torterra |
| Kalos Pyrenees | Pires-Aînées |
| Kings Sanctuary, Sanctuary of Kings | Sanctuaire Royal |
| Luminalia City et ses secteurs | Illumis - Sud/Est/Ouest/Nord |
| Luminalia Crypts | Catacombes d'Illumis |
| Luminalia City | Illumis |
| Mosaic Town/City | Mozheim |
| Mysterious Place | Lieu étrange |
| Novarte City | Essience |
| Olea/Oleo/Óleo/Oleum City | Savinion |
| Petro Cave | Le Glifforoc |
| Petroglifo/Petroglyph Town | Roche-sur-Gliffe |
| Petroglifo/Petroglyph Seafloor | Fonds marins de Roche-sur-Gliffe |
| Poke/Poké Ball Factory | Usine de Poké Balls |
| Pokémon Villa | Village Pokémon |
| Prism Tower | Tour Prismatique |
| Prison Island, Prison of Oblivion | Saint-Héchaînes |
| Profane Swamp | Marais Impie |
| Profane Town | Diabourgade |
| Prosperity Sanctuary | Autel de Prospérité |
| Reflection Cave | Grotte Miroitante |
| Relief/Relieve City | Relifac-le-Haut |
| Resolution/Terminus Cave | Grotte Coda |
| Romantis City | Romant-sous-Bois |
| Sanguine/Sanguino Town | Des-Rires |
| Service Station | Station |
| Storm Hill | Colline Tumultueuse |
| South Watchtower | Tour de guet |
| Vanitas Orchard | Jardin Vanitas |
| Vanitas Town | Fort-Vanitas |
| Vinyl Town | Bordevin |
| Wandering Forest | Bois du Dédale |
| Yantra City | Yantreizh |
| Yantra Ranch | Ferme de Yantreizh |
| Café Bohemie | Café Bohémien |
| Lechonk Restaurant | Chez Gourmelet |
| Fluxus Cafe | Café Pédrin |
| Routes 1 à 25 | Routes 1 à 25 (nom identique) |

## Noms présents mais encore à confirmer

Ces noms sont conservés tels quels dans l'interface et reçoivent la vignette **Nom FR à confirmer** :

- Bloodshore Coast
- Abandoned Forge
- Burning Abyss
- Dark Cave
- Dark Tower
- Deep Spring
- Druidic Chamber
- Fiery Chasm
- Fluxus Lake
- Fort Leviatan / Fort Leviathan
- Galanes Café
- Gloomy Cave
- Manorial Cathedral
- Lake Depths
- Murky Cave
- Psyche Cave
- Sanguina Coast
- Sanguine Coast
- Scorched Chasm
- Talasia Cave
- Seafloor (lorsqu'aucune ville n'est précisée)

## Principe de maintenance

- ne jamais modifier `pokemon-z-guide-data.js` pour franciser un lieu ;
- ajouter une variante dans `pokemon-z-location-data.js` ;
- utiliser `status: "confirmed"` seulement avec un nom vérifié dans la version française ciblée ;
- sinon conserver `fr: null` et `status: "unconfirmed"`.
