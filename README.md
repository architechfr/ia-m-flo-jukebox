# IA-M.Flo · Le jukebox

Jukebox 3D original avec 11 titres, lecteur YouTube, recherche, partage et lien Spotify.

Déploiement Vercel : preset Other, dossier racine, aucun build. Configuration fournie dans vercel.json.

La lecture et le rendu 3D doivent être vérifiés sur téléphone après publication.

## Nouvelles chansons automatiques

Toutes les 3 heures, GitHub Actions lit la chaîne YouTube et ajoute les nouveaux titres en tête du catalogue (`catalogue.json` et `releases.js`), puis Vercel redéploie.
Pour forcer tout de suite : onglet **Actions** → « Nouvelles chansons YouTube » → **Run workflow**.
Script : `scripts/sync-youtube.mjs` (chaînes surveillées et mots ignorés en haut du fichier).
