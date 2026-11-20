// Synchronise le jukebox avec les dernières vidéos YouTube d'IA-M.Flo.
// Lancé par GitHub Actions (.github/workflows/sync-youtube.yml) : lit le flux
// RSS et la page « Sorties » (albums/singles DistroKid) de la chaîne, sans clé
// API, et ajoute les nouveautés en tête
// de catalogue.json et dans releases.js (après les 6 touches du meuble, qui ne
// bougent pas). Si rien de nouveau, aucun fichier n'est modifié.
//
// Lancer à la main : node scripts/sync-youtube.mjs
// Tester sans réseau : RSS_FILE=chemin/flux.xml node scripts/sync-youtube.mjs

import { readFile, writeFile } from 'node:fs/promises';

// Chaînes à surveiller. La première est celle du site (lien YouTube du menu).
// Ajouter ici l'identifiant UC… d'une autre chaîne (ex. « IA-M.Flo - Topic »).
const CHANNELS = ['UCGI05gYi2FkYG5v6sZo7klw'];

// Titres à ne jamais ajouter (teasers, extraits…) : mots-clés en minuscules.
const IGNORER = ['#shorts', 'teaser', 'trailer', 'extrait', 'snippet'];

const root = new URL('..', import.meta.url);
const CATALOGUE = new URL('catalogue.json', root);
const RELEASES = new URL('releases.js', root);

const decode = s => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

// Comparaison de titres insensible aux accents, apostrophes et majuscules.
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();

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
    const res = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch);
    if (!res.ok) throw new Error(`Flux ${ch} : HTTP ${res.status}`);
    all.push(...parseFeed(await res.text()));
  }
  return all;
}

// ---- Albums et singles (onglet « Sorties » de la chaîne) ----
// DistroKid publie les chansons en playlists OLAK5uy_… : elles n'apparaissent
// pas dans le flux RSS des vidéos, il faut lire la page des sorties.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Cookie': 'SOCS=CAI', // évite la page de consentement cookies
};

async function getHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
  return res.text();
}

function initialData(html) {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  return m ? JSON.parse(m[1]) : null;
}

// Titres d'une playlist, dans l'ordre de l'album.
async function loadPlaylist(id) {
  const data = initialData(await getHtml('https://www.youtube.com/playlist?list=' + id));
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
  const title = data.metadata?.playlistMetadataRenderer?.title || tracks[0]?.[1];
  return { id, title, tracks };
}

// Sorties de la chaîne, de la plus récente à la plus ancienne.
async function loadReleases(known) {
  if (process.env.RELEASES_FILE) return JSON.parse(await readFile(process.env.RELEASES_FILE, 'utf8'));
  const out = [];
  for (const ch of CHANNELS) {
    const html = await getHtml(`https://www.youtube.com/channel/${ch}/releases`);
    const ids = [...new Set([...html.matchAll(/OLAK5uy_[\w-]{20,}/g)].map(m => m[0]))];
    console.log(`${ch} : ${ids.length} sortie(s) sur la chaîne`);
    for (const id of ids) {
      if (known.has(id)) continue;
      try { out.push(await loadPlaylist(id)); }
      catch (e) { console.warn(String(e)); }
    }
  }
  return out;
}

const catalogue = JSON.parse(await readFile(CATALOGUE, 'utf8'));
const releasesSrc = await readFile(RELEASES, 'utf8');
const releasesMatch = releasesSrc.match(/export const JUKEBOX_RELEASES=(\[.*\]);/);
if (!releasesMatch) throw new Error('JUKEBOX_RELEASES introuvable dans releases.js');
const jukebox = JSON.parse(releasesMatch[1]);
const TOUCHES = +(releasesSrc.match(/export const TOUCHES=(\d+)/)?.[1] ?? 6);

const knownIds = new Set(catalogue.flatMap(a => [a.id, ...a.tracks.map(t => t.id)]));
const knownTitles = new Set(catalogue.flatMap(a => [a.title, ...a.tracks.map(t => t.title)]).map(norm));

const added = [];

// 1) Albums et singles officiels. Ajoutés du plus ancien au plus récent pour
// que le plus récent finisse tout en haut du catalogue.
const releases = (await loadReleases(knownIds)).filter(r => !knownIds.has(r.id) && r.tracks.length);
for (const r of releases.reverse()) {
  const single = r.tracks.length === 1;
  catalogue.unshift({
    id: r.id, title: r.title, kind: single ? 'Single' : 'Album',
    cover: `https://i.ytimg.com/vi/${r.tracks[0][0]}/hqdefault.jpg`,
    tracks: r.tracks.map(([id, title]) => ({ id, title })),
  });
  jukebox.splice(TOUCHES, 0, single
    ? { kind: 'video', id: r.tracks[0][0], label: r.tracks[0][1] }
    : { kind: 'playlist', id: r.id, label: r.title });
  for (const [id, title] of r.tracks) { knownIds.add(id); knownTitles.add(norm(title)); }
  knownIds.add(r.id);
  added.push(`${single ? 'Single' : 'Album'} « ${r.title} » (${r.tracks.length} titre${single ? '' : 's'})`);
}

// 2) Vidéos isolées publiées sur la chaîne (flux RSS).
const videos = (await loadFeeds().catch(e => { console.warn(String(e)); return []; }))
  .filter(v => !v.short)
  .filter(v => !IGNORER.some(k => v.title.toLowerCase().includes(k)))
  .filter(v => !knownIds.has(v.id) && !knownTitles.has(norm(v.title)))
  .sort((a, b) => a.published.localeCompare(b.published)); // plus ancien d'abord

const seen = new Set();
for (const v of videos) {
  if (seen.has(norm(v.title))) continue;
  seen.add(norm(v.title));
  // unshift dans l'ordre chronologique : le plus récent finit tout en haut.
  catalogue.unshift({
    id: v.id, title: v.title, kind: 'Single',
    cover: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
    tracks: [{ id: v.id, title: v.title }],
  });
  jukebox.splice(TOUCHES, 0, { kind: 'video', id: v.id, label: v.title });
  added.push(`Vidéo « ${v.title} »`);
}

if (!added.length) {
  console.log('Rien de nouveau.');
} else {
  await writeFile(CATALOGUE, JSON.stringify(catalogue, null, 2) + '\n');
  await writeFile(RELEASES, releasesSrc.replace(releasesMatch[0],
    `export const JUKEBOX_RELEASES=${JSON.stringify(jukebox)};`));
  console.log('Ajouté :\n- ' + added.reverse().join('\n- '));
}
