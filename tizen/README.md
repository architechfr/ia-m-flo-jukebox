# Appli Samsung TV du jukebox IA-M.Flo

Deux dossiers :

- `tv/` : la page TV (navigation à la télécommande, sans le jukebox 3D). Elle est en ligne sur
  https://ia-m-flo-jukebox.vercel.app/tv/ et se teste aussi sur PC avec les flèches et Entrée.
- `tizen/` : la petite appli installée sur la TV. Elle ne fait qu'ouvrir la page `tv/` en ligne :
  les nouvelles chansons arrivent sans réinstaller l'appli.

TV visée : Samsung UE32M5575 (2017, Tizen 3.0). Son moteur web est ancien : `tv/tv.js` est écrit
en JavaScript ES5 et `tv/tv.css` sans grille CSS. Le petit texte en bas à droite affiche la
version du moteur, utile pour les tests.

## Installer sur la TV (mode développeur)

1. **Sur le PC** : installer Tizen Studio, puis dans son *Package Manager* ajouter
   les extensions *TV Extensions* et *Samsung Certificate Extension*.
2. **Adresse de la TV** : Paramètres → Général → Réseau → État du réseau → Paramètres IP.
3. **Mode développeur sur la TV** : ouvrir le panneau *Applications*, taper `1 2 3 4 5`
   sur la télécommande, passer *Developer mode* sur *On*, saisir l'adresse IP du PC,
   puis éteindre et rallumer la TV.
4. **Relier le PC à la TV** : dans Tizen Studio, *Device Manager* → ajouter la TV par son
   adresse IP, puis la connecter.
5. **Certificat** : *Tools → Certificate Manager* → nouveau profil **Samsung**, type **TV**,
   connexion au compte Samsung. La TV connectée y est reconnue automatiquement.
6. **Empaqueter et installer**, depuis le dossier du dépôt (remplacer `MonProfil` et l'adresse) :

   ```
   tizen package -t wgt -s MonProfil -- tizen
   sdb connect 192.168.1.XX
   tizen install -n tizen/IA-M.Flo.wgt
   ```

L'icône **IA-M.Flo** apparaît ensuite dans les applications de la TV.

## Si la TV affiche une page blanche

Certaines TV refusent d'ouvrir directement une adresse en ligne. Dans `tizen/config.xml`,
remplacer `<content src="https://ia-m-flo-jukebox.vercel.app/tv/"/>` par
`<content src="index.html"/>`, puis empaqueter et installer à nouveau.

## Télécommande

◀ ▶ ▲ ▼ : choisir · OK : écouter / pause · touches lecture et avance/retour rapide :
pause, titre suivant ou précédent · Retour : quitter.
