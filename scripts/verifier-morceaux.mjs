// Vérifie metadata/morceaux.json par rapport à catalogue.json.
// Lancer : node scripts/verifier-morceaux.mjs  (code de sortie 1 si erreur)
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const catalogue = JSON.parse(await readFile(new URL('catalogue.json', root), 'utf8'));
const { defauts = {}, morceaux } = JSON.parse(await readFile(new URL('metadata/morceaux.json', root), 'utf8'));

const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’'`]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
const CHAMPS = ['isrc', 'paroliers', 'compositeurs', 'langue', 'explicite', 'instrumental', 'audio'];

const erreurs = [];
const parTitre = new Set(morceaux.map(m => norm(m.titre)));
const parVideo = new Set(morceaux.flatMap(m => (m.apparitions || []).map(a => a.youtube)));

for (const sortie of catalogue) for (const t of sortie.tracks) {
  if (!parVideo.has(t.id) && !parTitre.has(norm(t.title)))
    erreurs.push(`Absent de morceaux.json : « ${t.title} » (${sortie.title})`);
}

const vus = new Map();
for (const m of morceaux) {
  if (m.isrc == null) continue;
  if (!ISRC.test(m.isrc)) erreurs.push(`ISRC mal formé pour « ${m.titre} » : ${m.isrc}`);
  if (vus.has(m.isrc)) erreurs.push(`ISRC ${m.isrc} en double : « ${vus.get(m.isrc)} » et « ${m.titre} »`);
  vus.set(m.isrc, m.titre);
}

const vides = Object.fromEntries(CHAMPS.map(c => [c, 0]));
for (const m of morceaux) for (const c of CHAMPS) if ((m[c] ?? defauts[c] ?? null) === null) vides[c]++;
const aVerifier = morceaux.filter(m => m.a_verifier).length;

console.log(`${morceaux.length} morceaux, ${aVerifier} à vérifier.`);
console.log('Champs encore vides : ' + CHAMPS.map(c => `${c} ${vides[c]}`).join(', '));
if (erreurs.length) { console.error('\n' + erreurs.join('\n')); process.exit(1); }
console.log('Cohérent avec catalogue.json.');
