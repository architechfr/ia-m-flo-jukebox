// Jukebox IA-M.Flo — version TV (Samsung Tizen).
// Écrit en JavaScript « ancien » (ES5 : var, function, XMLHttpRequest) parce
// que le moteur web des TV Samsung 2017 ne comprend pas le JavaScript récent
// du site (modules import, ?. , =>). Ne pas « moderniser » ce fichier.
// Le catalogue est le même que celui du site : les nouvelles chansons
// ajoutées par le robot apparaissent ici sans réinstaller l'appli.
(function () {
  'use strict';

  var COLONNES = 5;            // cartes par ligne
  var HAUTEUR_LIGNE = 256;     // carte 232 px + marges 24 px
  var TOUCHES = {
    GAUCHE: 37, HAUT: 38, DROITE: 39, BAS: 40, OK: 13,
    RETOUR: 10009, LECTURE: 415, PAUSE: 19, LECTURE_PAUSE: 10252,
    SUIVANT: 417, PRECEDENT: 412
  };

  var titres = [];   // [{id, title, release}]
  var cartes = [];
  var focus = 0;
  var enCours = -1;
  var player = null;
  var playerPret = false;
  var enLecture = false;
  var aLancer = -1;  // titre choisi avant que le lecteur soit prêt

  function $(id) { return document.getElementById(id); }
  function etat(texte) { $('etat').textContent = texte || ''; }

  // ---- Catalogue ----
  function chargerCatalogue() {
    var x = new XMLHttpRequest();
    x.open('GET', '/catalogue.json?t=' + new Date().getTime(), true);
    x.onload = function () {
      if (x.status !== 200) { etat('Catalogue indisponible (' + x.status + ').'); return; }
      var data;
      try { data = JSON.parse(x.responseText); } catch (e) { etat('Catalogue illisible.'); return; }
      construire(data);
    };
    x.onerror = function () { etat('Pas de connexion Internet.'); };
    x.send();
  }

  function construire(sorties) {
    var vus = {};
    for (var i = 0; i < sorties.length; i++) {
      var pistes = sorties[i].tracks || [];
      for (var j = 0; j < pistes.length; j++) {
        var p = pistes[j];
        if (!p.id || vus[p.id]) continue;
        vus[p.id] = true;
        titres.push({ id: p.id, title: p.title, release: sorties[i].title });
      }
    }
    var conteneur = $('cartes');
    for (var k = 0; k < titres.length; k++) {
      var carte = document.createElement('div');
      carte.className = 'carte';
      var img = document.createElement('img');
      img.src = 'https://i.ytimg.com/vi/' + titres[k].id + '/mqdefault.jpg';
      img.alt = '';
      var nom = document.createElement('p');
      nom.textContent = titres[k].title;
      carte.appendChild(img);
      carte.appendChild(nom);
      conteneur.appendChild(carte);
      cartes.push(carte);
    }
    etat(titres.length + ' chansons');
    placerFocus(0);
  }

  // ---- Navigation à la télécommande ----
  function placerFocus(n) {
    if (!cartes.length) return;
    if (n < 0) n = 0;
    if (n > cartes.length - 1) n = cartes.length - 1;
    if (cartes[focus]) cartes[focus].classList.remove('focus');
    focus = n;
    cartes[focus].classList.add('focus');
    var ligne = Math.floor(focus / COLONNES);
    var t = 'translateY(' + (-ligne * HAUTEUR_LIGNE) + 'px)';
    $('cartes').style.webkitTransform = t;
    $('cartes').style.transform = t;
  }

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (k === TOUCHES.GAUCHE) placerFocus(focus - 1);
    else if (k === TOUCHES.DROITE) placerFocus(focus + 1);
    else if (k === TOUCHES.HAUT) { if (focus >= COLONNES) placerFocus(focus - COLONNES); }
    else if (k === TOUCHES.BAS) { if (focus + COLONNES < cartes.length) placerFocus(focus + COLONNES); else placerFocus(cartes.length - 1); }
    else if (k === TOUCHES.OK) { if (focus === enCours) basculer(); else jouer(focus); }
    else if (k === TOUCHES.LECTURE_PAUSE) basculer();
    else if (k === TOUCHES.LECTURE) { if (!enLecture) basculer(); }
    else if (k === TOUCHES.PAUSE) { if (enLecture) basculer(); }
    else if (k === TOUCHES.SUIVANT) jouer(enCours + 1);
    else if (k === TOUCHES.PRECEDENT) jouer(enCours - 1);
    else if (k === TOUCHES.RETOUR) quitter();
    else return;
    e.preventDefault();
  });

  // Les touches lecture/pause de la télécommande ne sont envoyées à l'appli
  // que si on les réclame (API Tizen, absente dans un navigateur normal).
  function reclamerTouches() {
    try {
      var noms = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaFastForward', 'MediaRewind'];
      for (var i = 0; i < noms.length; i++) window.tizen.tvinputdevice.registerKey(noms[i]);
    } catch (e) { /* hors TV ou API indisponible */ }
  }

  function quitter() {
    try { window.tizen.application.getCurrentApplication().exit(); } catch (e) { /* hors TV */ }
  }

  // ---- Lecteur YouTube ----
  function jouer(n) {
    if (!titres.length) return;
    if (n < 0) n = titres.length - 1;
    if (n > titres.length - 1) n = 0;
    if (cartes[enCours]) cartes[enCours].classList.remove('joue');
    enCours = n;
    cartes[n].classList.add('joue');
    $('titre').textContent = titres[n].title;
    $('sortie').textContent = titres[n].release === titres[n].title ? 'IA-M.Flo · Single' : titres[n].release;
    $('attente').style.display = 'none';
    if (!playerPret) { aLancer = n; etat('Chargement du lecteur…'); return; }
    etat('');
    player.loadVideoById(titres[n].id);
  }

  function basculer() {
    if (!playerPret || enCours < 0) return;
    if (enLecture) player.pauseVideo(); else player.playVideo();
  }

  window.onYouTubeIframeAPIReady = function () {
    player = new window.YT.Player('player', {
      width: 800, height: 450,
      playerVars: { controls: 0, rel: 0, playsinline: 1, modestbranding: 1, origin: location.protocol + '//' + location.host },
      events: {
        onReady: function () {
          playerPret = true;
          if (aLancer >= 0) { var n = aLancer; aLancer = -1; jouer(n); }
        },
        onStateChange: function (ev) {
          enLecture = ev.data === 1;
          if (ev.data === 1) etat('');
          else if (ev.data === 2) etat('En pause');
          else if (ev.data === 0) jouer(enCours + 1); // titre fini : le suivant
        },
        onError: function (ev) {
          etat('YouTube refuse ce titre (code ' + ev.data + '). Titre suivant…');
          setTimeout(function () { jouer(enCours + 1); }, 4000);
        }
      }
    });
  };

  // Moteur web, affiché en petit : utile pour les tests sur la TV.
  var m = navigator.userAgent.match(/Chrome\/(\d+)/);
  $('moteur').textContent = (m ? 'Chrome ' + m[1] : '') + (/Tizen/.test(navigator.userAgent) ? ' · Tizen' : '');

  reclamerTouches();
  chargerCatalogue();
  var s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  s.onerror = function () { etat('Le lecteur YouTube ne se charge pas.'); };
  document.body.appendChild(s);
})();
