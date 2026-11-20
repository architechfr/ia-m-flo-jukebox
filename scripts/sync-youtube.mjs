// Synchronise le jukebox avec les dernières vidéos YouTube d'IA-M.Flo.
// Lancé par GitHub Actions (.github/workflows/sync-youtube.yml) : lit le flux
// RSS public de la chaîne (aucune clé API), ajoute les nouveaux titres en tête
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

const catalogue = JSON.parse(await readFile(CATALOGUE, 'utf8'));
const releasesSrc = await readFile(RELEASES, 'utf8');
const releasesMatch = releasesSrc.match(/export const JUKEBOX_RELEASES=(\[.*\]);/);
if (!releasesMatch) throw new Error('JUKEBOX_RELEASES introuvable dans releases.js');
const jukebox = JSON.parse(releasesMatch[1]);
const TOUCHES = +(releasesSrc.match(/export const TOUCHES=(\d+)/)?.[1] ?? 6);

const knownIds = new Set(catalogue.flatMap(a => [a.id, ...a.tracks.map(t => t.id)]));
const knownTitles = new Set(catalogue.flatMap(a => [a.title, ...a.tracks.map(t => t.title)]).map(norm));

const videos = (await loadFeeds())
  .filter(v => !v.short)
  .filter(v => !IGNORER.some(k => v.title.toLowerCase().includes(k)))
  .filter(v => !knownIds.has(v.id) && !knownTitles.has(norm(v.title)))
  .sort((a, b) => a.published.localeCompare(b.published)); // plus ancien d'abord

const seen = new Set();
const added = [];
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
  added.push(v.title);
}

if (!added.length) {
  console.log('Rien de nouveau.');
} else {
  await writeFile(CATALOGUE, JSON.stringify(catalogue, null, 2) + '\n');
  await writeFile(RELEASES, releasesSrc.replace(releasesMatch[0],
    `export const JUKEBOX_RELEASES=${JSON.stringify(jukebox)};`));
  console.log('Ajouté :\n- ' + added.reverse().join('\n- '));
}
