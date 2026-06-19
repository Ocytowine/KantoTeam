# KantoTeam

KantoTeam est une petite application web locale pour creer jusqu'a 3 equipes Pokemon de generation 1 et analyser leurs faiblesses, resistances, immunites et couvertures offensives.

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

Les equipes et Pokemon personnalises sont sauvegardes dans `localStorage`.

La reinitialisation depuis l'interface supprime :

- les 3 equipes ;
- les Pokemon personnalises sauvegardes.
