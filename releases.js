// SFT 17/09 : la musique du Club, IA-M.Flo, en pistes completes (YouTube,
// comptes officiels DistroKid -- Spotify sans compte ne jouait que des
// extraits de 30 s). Partage entre la salle (main.js) et le juke-box
// (jukebox/index.html) : les six albums sont les touches du meuble.
// Les SIX PREMIERES sont les touches du meuble (model.js n'en a pas d'autres).
// Ce qui suit s'atteint par la file : hasard, suivant / precedent, et la
// pastille de l'app. Florian, 18/09 : « on ne doit pas se limiter aux albums,
// il y a plus ».
export const TOUCHES=6;
export const JUKEBOX_RELEASES=[{"kind":"video","id":"GFqhlA3mDck","label":"Si j'avais tous les pouvoirs (Radio Edit)"},{"kind":"video","id":"15Piz_Avcls","label":"Le roi qui portait mon nom"},{"kind":"video","id":"puGX0PvELDM","label":"Si j'avais tous les pouvoirs (Special Version)"},{"kind":"playlist","id":"OLAK5uy_lcmxeH3nBaSej0o3qbnULU7sfI97uqi14","label":"Tout ce qu'on ne dit pas"},{"kind":"video","id":"kDalpLnaDxU","label":"Bad boys Poolside"},{"kind":"video","id":"MD6Klz3VgiU","label":"Je deviens ton abri"},{"kind":"video","id":"7PBsqb7m-XA","label":"Le roi qui portait mon nom"},{"kind":"video","id":"9mmls6xB95Y","label":"J’ai lu Baudelaire"},{"kind":"video","id":"bcEJRWTBupE","label":"Emmène-moi"},{"kind":"video","id":"uT8prBneYbo","label":"Jusqu'à nos Noms"},{"kind":"video","id":"emEC-87rYR4","label":"Dernière Mémoire (chanson sur la maladie d'Alzheimer)"},{"kind":"video","id":"QWrfK6BtO6s","label":"Storm Of Change"},{"kind":"video","id":"sFJiQ7f58Eg","label":"We the People"},{"kind":"video","id":"jxXgvyLLm0k","label":"Le Monde se rêve"},{"kind":"video","id":"c1htdWkvK6c","label":"Le chemin de la maison"}];
export function randomRelease(except){
  const pool=JUKEBOX_RELEASES.filter(r=>r.id!==except);
  return pool[Math.floor(Math.random()*pool.length)];
}
// La file (SUIVANT, AU HASARD) ne court plus sur cette liste-ci : depuis le
// 19/09 le CIO ajoute des titres depuis le juke-box (table sono_sorties), et
// seule l'app connait la file complete -- les six TOUCHES restent ici, ce sont
// des etiquettes peintes sur la facade du meuble.
// Le CIO colle un lien : on en tire ce que YouTube sait jouer, une video ou
// une liste. youtu.be, watch?v, shorts, embed, playlist?list, identifiant nu.
export function parseYouTube(texte){
  const brut=String(texte||'').trim();
  if(!brut)return null;
  const VIDEO=/^[A-Za-z0-9_-]{11}$/,LISTE=/^(OLAK5uy_|PL|RD|UU|LL|FL)[A-Za-z0-9_-]{10,}$/;
  if(VIDEO.test(brut))return{kind:'video',id:brut};
  if(LISTE.test(brut))return{kind:'playlist',id:brut};
  let url;try{url=new URL(/^https?:\/\//i.test(brut)?brut:'https://'+brut);}catch{return null;}
  if(!/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(url.hostname))return null;
  // Un lien de titre PRIS DANS un album porte les deux : c'est le titre qu'on
  // a voulu coller, pas l'album entier.
  const v=url.searchParams.get('v');
  if(v&&VIDEO.test(v))return{kind:'video',id:v};
  const l=url.searchParams.get('list');
  if(l&&LISTE.test(l))return{kind:'playlist',id:l};
  const morceaux=url.pathname.split('/').filter(Boolean),dernier=morceaux[morceaux.length-1]||'';
  if(VIDEO.test(dernier))return{kind:'video',id:dernier};
  return null;
}
export const findRelease=id=>JUKEBOX_RELEASES.find(r=>r.id===id)||null;
// enablejsapi : les touches PAUSE / LECTURE / SUIVANT parlent au lecteur par
// postMessage. from : {index,time} pour reprendre un album la ou l'app l'a laisse.
// mute : l'ecran du meuble ne fait que l'image (le son vient de l'app, seul
// lecteur audible depuis le 18/09) -- sans quoi deux YouTube jouaient ensemble.
// L'IMAGE du meuble, calee sur une SEULE video. Florian, 19/09 : « sur l'ecran
// du juke-box on etait au debut de la chanson alors que dans l'audio on etait a
// la fin ». Dans un album, l'ecran chargeait la liste entiere (videoseries) :
// YouTube y ignore le point de depart, et surtout la liste avancait toute
// seule, chacune de son cote. L'app dit desormais QUELLE video tourne et a
// quelle seconde ; l'ecran ne montre plus que celle-la, muette, sans
// commandes -- ce ne sont pas elles qui mènent la musique, ce sont les touches.
export function pictureSrc(videoId,origin=window.location.origin,time=0){
  const start=time>1?'&start='+Math.floor(time):'';
  return 'https://www.youtube-nocookie.com/embed/'+videoId+
    '?autoplay=1&mute=1&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1'+start+
    '&enablejsapi=1&origin='+encodeURIComponent(origin);
}
// Le lien a emporter : Florian, 19/09, est alle chercher l'adresse du titre sur
// l'ecran du meuble et n'a pas pu l'attraper (une video dans une iframe, dans
// une iframe). On la donne donc en clair, a copier.
export function watchUrl(release,videoId){
  if(videoId)return 'https://youtu.be/'+videoId;
  if(!release)return '';
  return release.kind==='playlist'
    ?'https://www.youtube.com/playlist?list='+release.id
    :'https://youtu.be/'+release.id;
}
export function jukeboxSrc(release,origin=window.location.origin,from=null,mute=false){
  const base='https://www.youtube-nocookie.com/embed/',api='&enablejsapi=1&origin='+encodeURIComponent(origin);
  const start=from&&from.time>1?'&start='+Math.floor(from.time):'';
  const silence=mute?'&mute=1':'';
  return release.kind==='playlist'
    ?base+'videoseries?list='+release.id+(from&&from.index?'&index='+from.index:'')+start+'&autoplay=1&rel=0'+silence+api
    :base+release.id+'?autoplay=1&rel=0'+start+silence+api;
}

