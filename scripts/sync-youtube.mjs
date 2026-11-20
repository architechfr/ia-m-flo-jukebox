// Synchronise le jukebox avec les sorties YouTube d'IA-M.Flo.
// Lancé par GitHub Actions (.github/workflows/sync-youtube.yml), sans clé API :
//  1. lit TOUTE la page « Sorties » de la chaîne (albums et singles DistroKid,
//     playlists OLAK5uy_…), pages suivantes comprises ;
//  2. garde les sorties absentes du site et publiées depuis AJOUTER_DEPUIS ;
//  3. les ajoute en tête de catalogue.json et dans releases.js (après les 6
//     touches du meuble, qui ne bougent pas).
// Les sorties plus anciennes sont notées dans scripts/sorties-ignorees.json
// pour ne pas être revérifiées à chaque passage. Si rien de nouveau, aucun
// fichier n'est modifié.
//
// Lancer à la main : node scripts/sync-youtube.mjs
// Tester sans réseau : RELEASES_FILE=sorties.json RSS_FILE=flux.xml node scripts/sync-youtube.mjs

import { readFile, writeFile } from 'node:fs/promises';

// Chaînes à surveiller (identifiants UC…).
const CHANNELS = ['UCGI05gYi2FkYG5v6sZo7klw'];

// Les sorties publiées avant cette date ne sont pas ajoutées automatiquement.
// Pour importer tout l'ancien catalogue : mettre '2000-01-01' et vider
// scripts/sorties-ignorees.json.
const AJOUTER_DEPUIS = '2026-10-28';

// Titres à ne jamais ajouter (teasers, extraits…) : mots-clés en minuscules.
const IGNORER = ['#shorts', 'teaser', 'trailer', 'extrait', 'snippet'];

const root = new URL('..', import.meta.url);
const CATALOGUE = new URL('catalogue.json', root);
const RELEASES = new URL('releases.js', root);
const IGNOREES = new URL('scripts/sorties-ignorees.json', root);

const decode = s => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

// Comparaison de titres insensible aux accents, apostrophes et majuscules.
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Cookie': 'SOCS=CAI', // évite la page de consentement cookies
};

async function getText(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  return res.text();
}

function initialData(html) {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  return m ? JSON.parse(m[1]) : null;
}

// ---- Sorties (albums et singles) ----

// Tous les identifiants OLAK5uy_ de la page Sorties, dans l'ordre affiché,
// en suivant les « pages suivantes » (continuations).
async function listReleaseIds(channel) {
  const html = await getText(`https://www.youtube.com/channel/${channel}/releases`);
  const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20261101.00.00';
  const ids = [];
  const collect = s => { for (const m of s.matchAll(/OLAK5uy_[\w-]{20,}/g)) if (!ids.includes(m[0])) ids.push(m[0]); };
  const tokensOf = s => [...s.matchAll(/"continuationCommand":\{"token":"([^"]+)"/g)].map(m => m[1]);
  collect(html);
  const queue = tokensOf(html), done = new Set();
  for (let n = 0; queue.length && n < 60; n++) {
    const token = queue.shift();
    if (done.has(token)) continue;
    done.add(token);
    const body = JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: version, hl: 'fr' } }, continuation: token });
    const json = await getText('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    collect(json);
    queue.push(...tokensOf(json));
  }
  return ids;
}

// Titre, morceaux (dans l'ordre) et date de sortie d'une playlist OLAK5uy_.
async function loadPlaylist(id) {
  const html = await getText('https://www.youtube.com/playlist?list=' + id);
  const data = initialData(html);
  if (!data) throw new Error('Playlist illisible : ' + id);
  const items = new Map();
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    const old = o.playlistVideoRenderer;
    if (old?.videoId && !items.has(old.videoId)) {
      items.set(old.videoId, [items.size, old.title?.runs?.[0]?.text || old.title?.simpleText]);
    }
    const we = o.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint;
    if (we?.playlistId === id && we.videoId && !items.has(we.videoId)) {
      const t = o.metadata?.lockupMetadataViewModel?.title?.content
        || (o.rendererContext.accessibilityContext?.label || '').replace(/\s+\d+\s+(heures?|minutes?|secondes?).*$/, '');
      items.set(we.videoId, [we.index ?? items.size, t]);
    }
    for (const k in o) walk(o[k]);
  })(data);
  const tracks = [...items].filter(([, [, t]]) => t)
    .sort((a, b) => a[1][0] - b[1][0]).map(([v, [, t]]) => [v, decode(t).trim()]);
  const title = decode(data.metadata?.playlistMetadataRenderer?.title
    || html.match(/<title>([^<]*?)(?: - YouTube)?<\/title>/)?.[1] || tracks[0]?.[1] || '');
  // Date : « Released on: AAAA-MM-JJ » dans la description DistroKid du 1er titre.
  let date = '';
  if (tracks[0]) {
    const watch = await getText('https://www.youtube.com/watch?v=' + tracks[0][0]);
    date = watch.match(/Released on: (\d{4}-\d\d-\d\d)/)?.[1]
      || watch.match(/"publishDate":"(\d{4}-\d\d-\d\d)/)?.[1] || '';
  }
  return { id, title, date, tracks };
}

async function loadReleases(known, ignored) {
  if (process.env.RELEASES_FILE) return JSON.parse(await readFile(process.env.RELEASES_FILE, 'utf8'));
  const out = [];
  for (const ch of CHANNELS) {
    const ids = await listReleaseIds(ch);
    const todo = ids.filter(id => !known.has(id) && !ignored.has(id));
    console.log(`${ch} : ${ids.length} sortie(s) sur la chaîne, ${todo.length} à vérifier`);
    for (let i = 0; i < todo.length; i += 5) {
      const batch = await Promise.all(todo.slice(i, i + 5).map(id =>
        loadPlaylist(id).catch(e => { console.warn(String(e)); return null; })));
      out.push(...batch.filter(Boolean));
    }
  }
  return out;
}

// ---- Vidéos isolées (flux RSS de la chaîne) ----

function parseFeed(xml) {
  const out = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    if (!id || !title) continue;
    out.push({ id, title: decode(title).trim(), published, short: link.includes('/shorts/') });
  }
  return out;
}

async function loadFeeds() {
  if (process.env.RSS_FILE) return parseFeed(await readFile(process.env.RSS_FILE, 'utf8'));
  const all = [];
  for (const ch of CHANNELS) {
    all.push(...parseFeed(await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch)));
  }
  return all;
}

// ---- Mise à jour du catalogue ----

const catalogue = JSON.parse(await readFile(CATALOGUE, 'utf8'));
const releasesSrc = await readFile(RELEASES, 'utf8');
const releasesMatch = releasesSrc.match(/export const JUKEBOX_RELEASES=(\[.*\]);/);
if (!releasesMatch) throw new Error('JUKEBOX_RELEASES introuvable dans releases.js');
const jukebox = JSON.parse(releasesMatch[1]);
const TOUCHES = +(releasesSrc.match(/export const TOUCHES=(\d+)/)?.[1] ?? 6);
const ignoredList = JSON.parse(await readFile(IGNOREES, 'utf8').catch(() => '[]'));
const ignored = new Set(ignoredList);

const knownIds = new Set(catalogue.flatMap(a => [a.id, ...a.tracks.map(t => t.id)]));
const knownTitles = new Set(catalogue.flatMap(a => [a.title, ...a.tracks.map(t => t.title)]).map(norm));

const added = [];
let ignoredChanged = false;

// 1) Albums et singles. Du plus ancien au plus récent : le plus récent finit en haut.
const releases = (await loadReleases(knownIds, ignored))
  .filter(r => !knownIds.has(r.id) && r.tracks.length);
for (const r of releases) {
  if (r.date && r.date < AJOUTER_DEPUIS && !ignored.has(r.id)) { ignored.add(r.id); ignoredChanged = true; }
}
const fresh = releases.filter(r => !ignored.has(r.id))
  .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
for (const r of fresh) {
  const single = r.tracks.length === 1;
  catalogue.unshift({
    id: r.id, title: r.title, kind: single ? 'Single' : 'Album',
    ...(r.date ? { date: r.date } : {}),
    cover: `https://i.ytimg.com/vi/${r.tracks[0][0]}/hqdefault.jpg`,
    tracks: r.tracks.map(([id, title]) => ({ id, title })),
  });
  jukebox.splice(TOUCHES, 0, single
    ? { kind: 'video', id: r.tracks[0][0], label: r.tracks[0][1] }
    : { kind: 'playlist', id: r.id, label: r.title });
  for (const [id, title] of r.tracks) { knownIds.add(id); knownTitles.add(norm(title)); }
  knownIds.add(r.id);
  added.push(`${r.date || '?'}  ${single ? 'Single' : 'Album'} « ${r.title} »${single ? '' : ` (${r.tracks.length} titres)`}`);
}

// 2) Vidéos isolées publiées sur la chaîne (flux RSS).
const videos = (await loadFeeds().catch(e => { console.warn(String(e)); return []; }))
  .filter(v => !v.short)
  .filter(v => !IGNORER.some(k => v.title.toLowerCase().includes(k)))
  .filter(v => !knownIds.has(v.id) && !knownTitles.has(norm(v.title)))
  .sort((a, b) => a.published.localeCompare(b.published));
const seen = new Set();
for (const v of videos) {
  if (seen.has(norm(v.title))) continue;
  seen.add(norm(v.title));
  catalogue.unshift({
    id: v.id, title: v.title, kind: 'Single',
    cover: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    tracks: [{ id: v.id, title: v.title }],
  });
  jukebox.splice(TOUCHES, 0, { kind: 'video', id: v.id, label: v.title });
  added.push(`Vidéo « ${v.title} »`);
}

if (ignoredChanged) {
  await writeFile(IGNOREES, JSON.stringify([...ignored].sort(), null, 0).replace(/","/g, '",\n"') + '\n');
  console.log(`${ignored.size} sortie(s) antérieure(s) au ${AJOUTER_DEPUIS} ignorée(s).`);
}
if (!added.length) {
  console.log('Rien de nouveau.');
} else {
  await writeFile(CATALOGUE, JSON.stringify(catalogue, null, 2) + '\n');
  await writeFile(RELEASES, releasesSrc.replace(releasesMatch[0],
    `export const JUKEBOX_RELEASES=${JSON.stringify(jukebox)};`));
  console.log('Ajouté :\n- ' + added.reverse().join('\n- '));
}
