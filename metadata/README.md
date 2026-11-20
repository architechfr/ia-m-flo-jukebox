# Métadonnées des morceaux (DistroKid)

`morceaux.json` est la fiche de chaque **enregistrement** publié, pour pouvoir
le republier (compilation, album) sans tout ressaisir dans DistroKid.

- `catalogue.json` décrit les **sorties** telles que YouTube les montre (ce que
  le jukebox joue). Il est mis à jour automatiquement, ne pas le modifier ici.
- `morceaux.json` décrit les **enregistrements** : un objet = un ISRC. Un même
  morceau présent dans plusieurs sorties n'a qu'une fiche, avec plusieurs
  `apparitions`.

## Champs

| Champ | Contenu |
|---|---|
| `titre` | Titre exact tel que saisi dans DistroKid |
| `isrc` | Code ISRC attribué par DistroKid (ex. `QZ…`), à réutiliser pour toute nouvelle sortie |
| `paroliers` / `compositeurs` | Listes de noms complets, comme dans le formulaire DistroKid |
| `langue` | Langue des paroles (ex. `fr`, `en`) |
| `explicite` | `true` / `false` |
| `instrumental` | `true` / `false` |
| `audio` | Emplacement du fichier audio maître (chemin local ou lien Drive) |
| `apparitions` | Sorties où il figure : titre, ID de la sortie, ID de la vidéo YouTube |
| `a_verifier` | Présent quand un doute reste à lever (supprimer une fois vérifié) |

`null` = pas encore renseigné. Les valeurs de `defauts` s'appliquent à tout
morceau dont le champ vaut `null` (pratique si les paroliers/compositeurs sont
toujours les mêmes).

## Vérifier

    node scripts/verifier-morceaux.mjs

Signale les titres du catalogue absents de `morceaux.json` (nouvelles
chansons arrivées par la synchro YouTube), les ISRC mal formés ou en double,
et les champs encore vides.
