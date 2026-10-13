// SFT 17/09 : le juke-box du Club, maquette 3D de Florian (« Jukebox SFT
// 2026 »), portee telle quelle : meme geometrie, memes matieres, memes
// textures peintes. Un seul modele pour deux usages -- le meuble dans la
// salle (room.js, fondu dans les lots statiques) et le gros plan
// interactif (jukebox/index.html, ou l'ecran est le vrai lecteur YouTube).
import * as THREE from 'three';

const PI=Math.PI,GOLD='#e2b45a';
export const W=1.0,D=0.56,R=W/2,SHOULDER=1.02,TOP=SHOULDER+R;
export const FZ=D/2,FLOOR=FZ-0.05,FRAME_F=FZ-0.01;
const IR=R-0.10,IB=0.12;
// Florian, 17/09 : « reduire la taille de l'ecran, respecter les dimensions du
// juke ». Vitrine 16/9 de 46 x 26 cm (la maquette : 56 x 32), lunette et
// baguettes resserrees d'autant ; le reste du meuble ne bouge pas.
export const SCREEN={center:new THREE.Vector3(0,1.07,FLOOR+0.031),width:0.46,height:0.259};
// Florian, 17/09 : « l'arche doit respecter parfaitement l'ecran ». La vitrine
// est cintree comme l'arche : fond laque noir de la hauteur du marquee au
// sommet du cintre interieur, lisere chrome, la video centree dedans.
const VIT_R=0.31,VIT_B=0.92;

function tex(w,h,draw,repeat){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);}
  return t;
}
function star(g,cx,cy,r,n=5){
  g.beginPath();
  for(let i=0;i<n*2;i++){const a=(i/(n*2))*PI*2-PI/2,rr=i%2?r*0.45:r;g.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}
  g.closePath();g.fill();
}
// Grain de noyer peint, comme la maquette : le bois de la salle (photo) est plus terne.
function woodTexture(){
  return tex(1024,1024,(g,w,h)=>{
    g.fillStyle='#3b1b0d';g.fillRect(0,0,w,h);
    for(let i=0;i<1400;i++){
      const x=Math.random()*w,l=14+Math.random()*30,a=0.05+Math.random()*0.14;
      g.strokeStyle=`hsla(${16+Math.random()*12},${50+Math.random()*20}%,${l}%,${a})`;
      g.lineWidth=0.6+Math.random()*2.6;
      g.beginPath();g.moveTo(x,0);
      for(let y=0;y<=h;y+=48)g.lineTo(x+Math.sin(y/160+i)*5+Math.sin(y/37+i*3)*1.5,y);
      g.stroke();
    }
    const sheen=g.createLinearGradient(0,0,w,0);
    sheen.addColorStop(0,'rgba(255,200,140,0)');sheen.addColorStop(0.5,'rgba(255,200,140,0.10)');sheen.addColorStop(1,'rgba(0,0,0,0.15)');
    g.fillStyle=sheen;g.fillRect(0,0,w,h);
  },[1,1]);
}
// L'ecran peint de la maquette : il reste derriere le vrai lecteur, et se voit
// dans la salle, de loin, ou le lecteur n'est pas.
function screenTexture(){
  return tex(1024,600,(g,w,h)=>{
    g.fillStyle='#0d0d0f';g.fillRect(0,0,w,h);
    g.fillStyle='#ff0000';g.beginPath();g.roundRect(40,26,58,40,10);g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(60,36);g.lineTo(60,56);g.lineTo(84,46);g.fill();
    g.font='bold 34px Arial, sans-serif';g.fillText('YouTube',108,58);
    const vx=40,vy=88,vw=560,vh=330;
    const sky=g.createLinearGradient(0,vy,0,vy+vh);
    sky.addColorStop(0,'#ffcf6b');sky.addColorStop(0.45,'#ff7a35');sky.addColorStop(0.7,'#8a2f3a');sky.addColorStop(1,'#1d0f1c');
    g.fillStyle=sky;g.fillRect(vx,vy,vw,vh);
    const sun=g.createRadialGradient(vx+330,vy+140,10,vx+330,vy+140,120);
    sun.addColorStop(0,'rgba(255,245,200,1)');sun.addColorStop(0.3,'rgba(255,200,110,0.8)');sun.addColorStop(1,'rgba(255,150,80,0)');
    g.fillStyle=sun;g.fillRect(vx,vy,vw,vh);
    g.fillStyle='rgba(30,10,20,0.85)';g.fillRect(vx,vy+230,vw,100);
    for(let i=0;i<14;i++){g.beginPath();g.arc(vx+20+i*41,vy+245+(i%3)*8,14,0,7);g.fill();}
    g.fillStyle='#1a0c10';
    g.beginPath();g.arc(vx+210,vy+105,22,0,7);g.fill();
    g.fillRect(vx+178,vy+95,64,8);
    g.beginPath();g.roundRect(vx+180,vy+128,60,110,18);g.fill();
    g.save();g.translate(vx+230,vy+190);g.rotate(-0.5);g.fillRect(-90,-12,180,24);g.restore();
    g.fillStyle='rgba(255,230,160,0.9)';for(let i=0;i<9;i++){g.beginPath();g.arc(vx+300+i*30,vy+60+Math.sin(i)*14,3,0,7);g.fill();}
    g.fillStyle='#ddd';g.fillRect(vx+330,vy+80,3,120);
    g.fillStyle='#3a3a3a';g.fillRect(vx,vy+vh+14,vw,5);
    g.fillStyle='#ff0000';g.fillRect(vx,vy+vh+14,vw*0.34,5);
    g.beginPath();g.arc(vx+vw*0.34,vy+vh+16,8,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(vx+4,vy+vh+40);g.lineTo(vx+4,vy+vh+68);g.lineTo(vx+28,vy+vh+54);g.fill();
    g.fillRect(vx+44,vy+vh+40,4,28);g.beginPath();g.moveTo(vx+50,vy+vh+40);g.lineTo(vx+50,vy+vh+68);g.lineTo(vx+70,vy+vh+54);g.fill();
    g.font='20px Arial, sans-serif';g.fillText('1:27 / 4:03',vx+92,vy+vh+61);
    g.fillRect(vx+vw-30,vy+vh+42,24,24);g.fillStyle='#0d0d0f';g.fillRect(vx+vw-25,vy+vh+47,14,14);
    g.fillStyle='#fff';g.font='bold 24px Arial, sans-serif';g.fillText('IA-M.Flo',640,112);
    const rows=[['Sales Fils Tour 2024','Album','#c9932b','#3b2a1a'],['Tout ce qu’on ne dit pas','Album','#3b6ea8','#1b2a3d'],['Summer 2026','Album','#d8b38a','#6b4a2c'],['Là où le cœur revient','Album','#f2a340','#7a3a10'],['Si j’avais tous les pouvoirs','Album','#7f5fbf','#2a1f4a']];
    rows.forEach(([t,s,c1,c2],i)=>{
      const y=135+i*84;
      const gr=g.createLinearGradient(640,y,720,y+70);gr.addColorStop(0,c1);gr.addColorStop(1,c2);
      g.fillStyle=gr;g.beginPath();g.roundRect(640,y,80,70,8);g.fill();
      g.fillStyle='#fff';g.font='bold 22px Arial, sans-serif';g.fillText(t,736,y+30);
      g.fillStyle='#b3b3b3';g.font='18px Arial, sans-serif';g.fillText(s,736,y+56);
    });
  });
}
// Florian, 17/09 : « pas bien lisible ». Texture deux fois plus fine, texte
// noir et gras ; un titre trop long pour une ligne passe sur deux, plutot que
// de retrecir jusqu'a l'illisible (les telephones n'ont pas d'Arial Narrow).
function keyTexture(label){
  return tex(1024,192,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#fff5d8');gr.addColorStop(1,'#eed6a0');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#0b0805';g.textAlign='center';g.textBaseline='middle';
    const font=size=>`900 ${size}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
    let size=110;g.font=font(size);
    while(size>78&&g.measureText(label).width>w-60){size-=4;g.font=font(size);}
    if(g.measureText(label).width<=w-60){g.fillText(label,w/2,h/2+4);return;}
    const words=label.split(' ');let best=1,bestGap=Infinity;
    for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');const gap=Math.abs(g.measureText(a).width-g.measureText(b).width);if(gap<bestGap){bestGap=gap;best=i;}}
    const lines=[words.slice(0,best).join(' '),words.slice(best).join(' ')];
    size=78;g.font=font(size);
    while(size>44&&Math.max(...lines.map(l=>g.measureText(l).width))>w-60){size-=4;g.font=font(size);}
    g.fillText(lines[0],w/2,h/2-size*0.55);g.fillText(lines[1],w/2,h/2+size*0.55);
  });
}

export const DEFAULT_LABELS=['ROCK','POP','SOUL','FUNK','DISCO','JAZZ','HIP HOP','COUNTRY','LATINO','GOOD VIBES'];

// logo : texture du medaillon SFT (jukebox/logo-sft-gold.webp), deja chargee.
// labels : les dix touches, colonne gauche puis colonne droite.
// prepare : appelee sur chaque maille (la salle y pose ses ombres).
// lights : les quatre lampes de la maquette (halo des neons). La salle les
// coupe : avec son propre eclairage et son bloom, elles brûlaient le meuble.
export function buildJukebox({logo,labels=DEFAULT_LABELS,prepare=()=>{},lights=true}={}){
  const std=(name,p)=>Object.assign(new THREE.MeshStandardMaterial(p),{name:'juke_'+name});
  const woodTex=woodTexture();
  const clothTex=tex(128,128,(g,w,h)=>{
    g.fillStyle='#5a452a';g.fillRect(0,0,w,h);
    for(let i=0;i<w;i+=8){
      g.fillStyle=i%16?'#6e5634':'#4b3821';g.fillRect(i,0,4,h);
      g.fillStyle=i%16?'rgba(120,95,60,0.6)':'rgba(60,44,26,0.6)';g.fillRect(0,i,w,4);
    }
  },[7,4]);
  const screenTex=screenTexture();
  const marqueeTex=tex(1024,180,(g,w,h)=>{
    g.fillStyle='#0a0806';g.fillRect(0,0,w,h);
    g.fillStyle=GOLD;g.textAlign='center';
    // Florian, 18/09 : « les deux etoiles sont a cheval avec SALES FILS TOUR,
    // descends-les ». Elles encadrent desormais la ligne du bas. Le titre se
    // serre aussi pour tenir la largeur : sans Impact -- que les telephones
    // n'ont pas --, la police de secours s'etalait jusque sur elles.
    const title='S A L E S   F I L S   T O U R',face='Impact, "Arial Narrow", sans-serif';
    let size=74;g.font=`bold ${size}px ${face}`;
    while(size>44&&g.measureText(title).width>w-72){size-=2;g.font=`bold ${size}px ${face}`;}
    g.fillText(title,w/2,80);
    g.font='bold 40px "Arial Narrow", Arial, sans-serif';g.fillText('C A M P A G N A N   •   2 0 2 6',w/2,142);
    star(g,84,128,24);star(g,w-84,128,24);
  });
  const plaqueTex=tex(1024,130,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#b8892f');gr.addColorStop(0.5,'#f0d287');gr.addColorStop(1,'#b8892f');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#1a1208';g.textAlign='center';g.font='bold 58px "Arial Narrow", Arial, sans-serif';
    g.fillText('P L A Y   A   B E T T E R   D A Y',w/2,86);star(g,60,66,26);star(g,w-60,66,26);
  });
  const bandTex=tex(1024,160,(g,w,h)=>{
    g.fillStyle=GOLD;g.textAlign='center';g.font='italic 92px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
    g.fillText('Music Connects People',w/2,112);
  });
  const sideTextTex=tex(512,640,(g,w,h)=>{
    g.fillStyle=GOLD;g.textAlign='center';g.font='bold 70px "Arial Narrow", Arial, sans-serif';
    ['GOOD','MUSIC','GOOD','FRIENDS','BETTER','DAYS'].forEach((t,i)=>g.fillText(t,256,90+i*100));
  });
  if(logo){logo.colorSpace=THREE.SRGBColorSpace;logo.anisotropy=8;}

  const M={
    wood:    std('walnut',      {map:woodTex,roughness:0.32,metalness:0.05}),
    woodDk:  std('walnutDark',  {color:0x1e0d06,roughness:0.5,metalness:0.05}),
    chrome:  std('chrome',      {color:0xffffff,roughness:0.14,metalness:1.0}),
    brass:   std('brass',       {color:0xd8a848,roughness:0.28,metalness:1.0}),
    black:   std('blackGloss',  {color:0x0b0908,roughness:0.22,metalness:0.2}),
    // Florian, 17/09 : « neons trop blancs ». Un tube plus dore, moins pousse :
    // la couleur reste lisible apres le tone mapping, au lieu de brûler en blanc.
    neon:    std('neonWarm',    {color:0xffd48a,emissive:0xff9a2a,emissiveIntensity:0.95,roughness:0.35}),
    neonRed: std('neonRed',     {color:0x7a0803,emissive:0xff1200,emissiveIntensity:1.1,roughness:0.35}),
    screen:  std('screen',      {map:screenTex,emissive:0xffffff,emissiveMap:screenTex,emissiveIntensity:0.9,roughness:0.15,metalness:0.0}),
    marquee: std('marquee',     {map:marqueeTex,emissive:0xffffff,emissiveMap:marqueeTex,emissiveIntensity:0.55,roughness:0.3}),
    plaque:  std('plaque',      {map:plaqueTex,roughness:0.3,metalness:0.75}),
    band:    std('bandText',    {map:bandTex,transparent:true,emissive:0xffd27a,emissiveMap:bandTex,emissiveIntensity:0.7,roughness:0.4}),
    // Florian, 17/09 : « le logo est illisible a cause de la luminosite » --
    // un medaillon imprime, mat, qui ne s'eclaire plus lui-meme.
    emblem:  logo?std('emblem', {map:logo,emissive:0xffffff,emissiveMap:logo,emissiveIntensity:0.05,roughness:0.55,metalness:0.1})
                 :std('emblem', {color:0xd8a848,roughness:0.3,metalness:0.8}),
    sideTxt: std('sideText',    {map:sideTextTex,transparent:true,emissive:0xe2b45a,emissiveMap:sideTextTex,emissiveIntensity:0.35,roughness:0.4,metalness:0.5}),
    cloth:   std('grilleCloth', {map:clothTex,roughness:0.95,metalness:0.0}),
    redBtn:  std('redButton',   {color:0xc8231a,roughness:0.25,metalness:0.1,emissive:0x5a0a05,emissiveIntensity:0.6}),
  };

  const model=new THREE.Group();model.name='jukebox';
  const add=(geo,mat,name,[x,y,z]=[0,0,0],rot)=>{
    const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(x,y,z);
    if(rot)m.rotation.set(rot[0]||0,rot[1]||0,rot[2]||0);
    prepare(m);model.add(m);return m;
  };
  const cyl=(r,h,seg=32)=>new THREE.CylinderGeometry(r,r,h,seg);
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const LR=s=>(s<0?'L':'R');

  function archShape(r,bottom){
    const s=new THREE.Shape();
    s.moveTo(r,bottom);s.lineTo(r,SHOULDER);s.absarc(0,SHOULDER,r,0,PI,false);s.lineTo(-r,bottom);s.closePath();
    return s;
  }
  /* body: full arch, back to recess floor */
  add(new THREE.ExtrudeGeometry(archShape(R,0.10),{depth:D-0.05-0.02-0.012,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:4,curveSegments:72}),
      M.wood,'cabinetBody',[0,0,-FZ+0.01+0.012]);
  /* front frame: arch with inner arch hole, 4 cm thick */
  const frame=archShape(R,0.10);frame.holes.push(archShape(IR,IB));
  add(new THREE.ExtrudeGeometry(frame,{depth:0.04-0.012,bevelEnabled:true,bevelThickness:0.006,bevelSize:0.012,bevelSegments:3,curveSegments:72}),
      M.wood,'cabinetFrame',[0,0,FLOOR+0.006]);
  add(new THREE.ExtrudeGeometry(archShape(IR,IB),{depth:0.003,bevelEnabled:false,curveSegments:72}),M.woodDk,'recessFloor',[0,0,FLOOR]);

  /* plinth + feet */
  add(box(W+0.02,0.10,D+0.02),M.black,'plinth',[0,0.05,0]);
  add(box(W+0.04,0.014,D+0.04),M.chrome,'plinthTrim',[0,0.107,0]);
  for(const s of [-1,1]){
    add(cyl(0.085,0.10,40),M.black,`foot${LR(s)}`,[s*(R-0.05),0.05,FZ-0.02]);
    add(new THREE.TorusGeometry(0.085,0.008,12,48),M.chrome,`footRing${LR(s)}`,[s*(R-0.05),0.025,FZ-0.02],[PI/2,0,0]);
    add(cyl(0.086,0.02,40),M.neon,`footGlow${LR(s)}`,[s*(R-0.05),0.095,FZ-0.02]);
  }

  /* ---- neon arches (outer warm, red, inner warm) ---- */
  function archTube(pr,tr,mat,name,z,legBottom,legR=tr){
    const arc=add(new THREE.TorusGeometry(pr,tr,24,120,PI),mat,name+'Arc',[0,SHOULDER,z]);
    for(const s of [-1,1]){
      const h=SHOULDER-legBottom;
      add(cyl(legR,h,32),mat,name+'Leg'+LR(s),[s*pr,legBottom+h/2,z]);
    }
    return arc;
  }
  const OUT_R=R-0.05,OUT_Z=FRAME_F+0.012;
  archTube(OUT_R,0.04,M.neon,'neonOuter',OUT_Z,0.11,0.048);
  archTube(R-0.115,0.018,M.neonRed,'neonRed',FRAME_F+0.02,0.30);
  archTube(R-0.15,0.02,M.neon,'neonInner',FLOOR+0.02,0.30);

  /* ribbed chrome collars on the pilasters */
  function collar(x,y,z,h,r,name,withRed=true){
    add(cyl(r,h,48),M.chrome,name,[x,y,z]);
    const n=3;
    for(let i=0;i<n;i++)add(new THREE.TorusGeometry(r,0.007,12,56),M.chrome,`${name}Rib${i}`,[x,y-h/2+0.02+i*((h-0.04)/(n-1)),z],[PI/2,0,0]);
    if(withRed)add(cyl(r+0.002,0.022,48),M.neonRed,`${name}Red`,[x,y,z]);
  }
  for(const s of [-1,1]){
    collar(s*OUT_R,0.96,OUT_Z,0.20,0.064,`collarTop${LR(s)}`);
    collar(s*OUT_R,0.33,OUT_Z,0.18,0.064,`collarBottom${LR(s)}`);
    add(cyl(0.062,0.05,48),M.chrome,`collarFoot${LR(s)}`,[s*OUT_R,0.13,OUT_Z]);
    add(cyl(0.012,0.36,16),M.neonRed,`pilasterStripe${LR(s)}`,[s*OUT_R,0.645,OUT_Z+0.046]);
  }

  /* ---- crown emblem ---- */
  add(cyl(0.125,0.05,56),M.black,'crownEmblemBack',[0,TOP-0.05,FZ+0.04],[PI/2,0,0]);
  add(new THREE.CircleGeometry(0.120,64),M.emblem,'crownEmblem',[0,TOP-0.05,FZ+0.0665]);
  add(new THREE.TorusGeometry(0.127,0.014,16,72),M.brass,'crownRing',[0,TOP-0.05,FZ+0.062]);
  for(const s of [-1,1]){
    add(cyl(0.05,0.10,32),M.chrome,`crownBracket${LR(s)}`,[s*0.15,TOP-0.115,OUT_Z],[0,0,s*0.55]);
    add(new THREE.TorusGeometry(0.05,0.007,12,40),M.chrome,`crownBracketRib${LR(s)}`,[s*0.15,TOP-0.115,OUT_Z],[PI/2,0,s*0.55]);
  }

  /* ---- arched vitrine: matte black following the inner arch, chrome rim, band, screen ---- */
  // Florian, 18/09 : « le reflet gene, on voit que YouTube est une piece
  // rapportee ». Pas de vitre devant la video, et un fond mat qui ne renvoie
  // pas les softbox.
  const vitrine=std('vitrine',{color:0x0a0806,roughness:0.75,metalness:0.0});
  add(new THREE.ExtrudeGeometry(archShape(VIT_R,VIT_B),{depth:0.02,bevelEnabled:false,curveSegments:48}),vitrine,'screenBezel',[0,0,FLOOR+0.006]);
  const rim=archShape(VIT_R+0.014,VIT_B-0.014);rim.holes.push(archShape(VIT_R-0.002,VIT_B+0.002));
  add(new THREE.ExtrudeGeometry(rim,{depth:0.03,bevelEnabled:false,curveSegments:48}),M.chrome,'screenRim',[0,0,FLOOR+0.006]);
  add(new THREE.PlaneGeometry(0.30,0.048),M.band,'bandMusicConnects',[0,SHOULDER+VIT_R-0.065,FLOOR+0.03]);
  const screen=add(new THREE.PlaneGeometry(SCREEN.width,SCREEN.height),M.screen,'screen',[0,SCREEN.center.y,SCREEN.center.z]);

  /* ---- marquee ---- */
  add(box(0.58,0.11,0.02),M.brass,'marqueeFrame',[0,0.852,FLOOR+0.01]);
  add(box(0.545,0.088,0.03),M.marquee,'marqueePlate',[0,0.852,FLOOR+0.02]);

  /* ---- selector keys ---- */
  add(box(0.60,0.215,0.02),M.woodDk,'selectorBack',[0,0.69,FLOOR+0.01]);
  add(box(0.61,0.225,0.008),M.chrome,'selectorFrame',[0,0.69,FLOOR+0.002]);
  add(box(0.014,0.215,0.028),M.chrome,'selectorDivider',[0,0.69,FLOOR+0.014]);
  const keys=[],keySide=std('keySide',{color:0xe6cf98,roughness:0.5});
  labels.forEach((label,i)=>{
    const c=Math.floor(i/5),r=i%5,s=c===0?-1:1,cx=s*0.126;
    const y=0.772-r*0.041;
    const keyTex=keyTexture(label);
    const keyMat=std(`key_${i}`,{map:keyTex,emissive:0xffffff,emissiveMap:keyTex,emissiveIntensity:0.08,roughness:0.4});
    // Le titre sur la face avant seulement : sur les tranches, il laissait un liseré de lettres.
    const key=add(box(0.212,0.036,0.016),[keySide,keySide,keySide,keySide,keyMat,keySide],`key${LR(s)}${r}`,[cx,y,FLOOR+0.028]);
    add(cyl(0.0165,0.006,24),M.chrome,`btnBase${LR(s)}${r}`,[s*0.262,y,FLOOR+0.024],[PI/2,0,0]);
    const btnMat=std(`redButton_${i}`,{color:0xc8231a,roughness:0.25,metalness:0.1,emissive:0x5a0a05,emissiveIntensity:0.6});
    const button=add(new THREE.SphereGeometry(0.0135,24,16),btnMat,`btn${LR(s)}${r}`,[s*0.262,y,FLOOR+0.028]);
    keys.push({index:i,label,key,button,material:keyMat,buttonMaterial:btnMat,restZ:FLOOR+0.028});
  });

  /* ---- speaker grille ---- */
  add(box(0.50,0.28,0.01),M.cloth,'grilleCloth',[0,0.41,FLOOR+0.005]);
  { // diagonal lattice clipped to the cloth rectangle (0.50 x 0.29)
    const GW=0.25,GH=0.14,GY=0.41,step=0.05;
    for(const d of [1,-1])for(let k=-12;k<=12;k++){
      const c=k*step,pts=[];
      for(const x of [-GW,GW]){const y=d*(x-c);if(Math.abs(y)<=GH+1e-6)pts.push([x,y]);}
      for(const y of [-GH,GH]){const x=y/d+c;if(Math.abs(x)<GW-1e-6)pts.push([x,y]);}
      if(pts.length<2)continue;
      const [a,b]=pts,len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(len<0.02)continue;
      add(box(0.008,len,0.008),M.chrome,`lattice${d>0?'A':'B'}${k+12}`,[(a[0]+b[0])/2,GY+(a[1]+b[1])/2,FLOOR+0.014],[0,0,-d*PI/4]);
    }
  }
  for(const y of [0.562,0.252]){
    add(cyl(0.016,0.58,32),M.chrome,`grilleBar${Math.round(y*1000)}`,[0,y,FLOOR+0.022],[0,0,PI/2]);
    for(const x of [-0.2,-0.1,0.1,0.2])add(new THREE.TorusGeometry(0.017,0.006,10,32),M.chrome,`grilleBarRib${Math.round(y*1000)}_${Math.round(x*100)}`,[x,y,FLOOR+0.022],[0,PI/2,0]);
  }
  const starShape=new THREE.Shape();
  for(let i=0;i<16;i++){
    const a=(i/16)*PI*2-PI/2,r=i%4===0?0.115:i%4===2?0.062:0.024;
    i?starShape.lineTo(Math.cos(a)*r,Math.sin(a)*r):starShape.moveTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  starShape.closePath();
  add(new THREE.ExtrudeGeometry(starShape,{depth:0.016,bevelEnabled:true,bevelThickness:0.01,bevelSize:0.006,bevelSegments:3}),M.chrome,'compassStar',[0,0.415,FLOOR+0.02]);
  add(new THREE.TorusGeometry(0.075,0.009,14,64),M.chrome,'compassRing',[0,0.415,FLOOR+0.03]);
  add(new THREE.SphereGeometry(0.016,24,16),M.brass,'compassHub',[0,0.415,FLOOR+0.04]);

  /* ---- lower U neon loop ---- */
  const LOOP_Z=FLOOR+0.045;
  const uArc=(pr,tr,mat,name,z)=>{const m=add(new THREE.TorusGeometry(pr,tr,24,100,PI),mat,name,[0,0.44,z]);m.rotation.z=PI;return m;};
  uArc(0.20,0.036,M.neon,'loopWarmArc',LOOP_Z);
  uArc(0.158,0.013,M.neonRed,'loopRedArc',LOOP_Z-0.005);
  for(const s of [-1,1]){
    add(cyl(0.036,0.08,32),M.neon,`loopWarmLeg${LR(s)}`,[s*0.20,0.48,LOOP_Z]);
    add(cyl(0.013,0.08,24),M.neonRed,`loopRedLeg${LR(s)}`,[s*0.158,0.48,LOOP_Z-0.005]);
    collar(s*0.20,0.542,LOOP_Z,0.064,0.05,`loopCollar${LR(s)}`,false);
  }
  { // horizontal ribbed foot clamp at the loop bottom
    add(cyl(0.042,0.10,48),M.chrome,'loopFoot',[0,0.24,LOOP_Z],[0,0,PI/2]);
    for(let i=0;i<3;i++)add(new THREE.TorusGeometry(0.042,0.006,12,56),M.chrome,`loopFootRib${i}`,[-0.032+i*0.032,0.24,LOOP_Z],[0,PI/2,0]);
  }

  /* ---- bottom plaque ---- */
  add(box(0.50,0.062,0.018),M.plaque,'plaque',[0,0.155,FLOOR+0.03]);
  add(box(0.52,0.078,0.01),M.woodDk,'plaqueBack',[0,0.155,FLOOR+0.02]);

  /* ---- side emblem + text + rails ---- */
  for(const s of [-1,1]){
    const x=s*(R+0.014);
    add(cyl(0.125,0.012,56),M.black,`sideEmblemBack${LR(s)}`,[x,0.98,0.0],[0,0,PI/2]);
    add(new THREE.CircleGeometry(0.12,56),M.emblem,`sideEmblem${LR(s)}`,[x+s*0.007,0.98,0.0],[0,s*PI/2,0]);
    add(new THREE.TorusGeometry(0.124,0.009,12,64),M.brass,`sideEmblemRing${LR(s)}`,[x+s*0.004,0.98,0.0],[0,PI/2,0]);
    add(new THREE.PlaneGeometry(0.26,0.325),M.sideTxt,`sideText${LR(s)}`,[s*(R+0.016),0.62,0.0],[0,s*PI/2,0]);
    add(box(0.014,0.014,D-0.02),M.chrome,`sideRail${LR(s)}`,[s*(R+0.016),0.32,0]);
    add(box(0.014,0.014,D-0.02),M.chrome,`sideRailTop${LR(s)}`,[s*(R+0.016),SHOULDER-0.02,0]);
  }

  /* ---- glow lights from the neon ---- */
  const pl=(color,i,pos,name)=>{if(!lights)return;const l=new THREE.PointLight(color,i,2.5,2);l.name=name;l.position.set(...pos);model.add(l);};
  pl(0xffb45a,2.2,[-0.45,0.7,FZ+0.15],'glowL');
  pl(0xffb45a,2.2,[0.45,0.7,FZ+0.15],'glowR');
  pl(0xffc070,1.2,[0,1.20,FZ+0.25],'glowTop');
  pl(0xff7a40,1.2,[0,0.4,FZ+0.15],'glowLoop');

  // Florian, 18/09 : « s'il pouvait reagir a la musique avec sa lumiere
  // interne ». Le son sort d'un lecteur YouTube, sur un autre domaine : la
  // page n'a pas le signal, aucun rythme n'est lisible. Le meuble respire donc
  // -- une houle lente sur les tubes chauds, un contretemps sur le rouge --
  // tant que la musique joue, et se fige quand elle s'arrete. L'amplitude
  // monte et descend en fondu : pas de saut au depart ni a la pause.
  const neonBase=M.neon.emissiveIntensity,redBase=M.neonRed.emissiveIntensity;
  let lampes=null,lampesBase=null,amp=0;
  function pulse(seconds,playing=true){
    // Les lampes sont relevees au premier appel : la salle ajoute la sienne
    // apres la construction (room.js), et retire les siennes.
    if(!lampes){lampes=model.children.filter(o=>o.isLight);lampesBase=lampes.map(l=>l.intensity);}
    amp+=((playing?1:0)-amp)*0.05;
    const houle=Math.sin(seconds*1.9),ride=Math.sin(seconds*3.7+1.1);
    M.neon.emissiveIntensity=neonBase*(1+amp*(0.17*houle+0.06*ride));
    M.neonRed.emissiveIntensity=redBase*(1+amp*0.24*Math.sin(seconds*1.9+1.9));
    for(let i=0;i<lampes.length;i++)lampes[i].intensity=lampesBase[i]*(1+amp*0.18*houle);
  }

  let active=-1;
  function setActiveKey(index){
    active=index;
    for(const k of keys){
      const on=k.index===index;
      k.material.emissiveIntensity=on?0.45:0.08;
      k.buttonMaterial.emissive.set(on?0xff2a1a:0x5a0a05);k.buttonMaterial.emissiveIntensity=on?1.4:0.6;
    }
  }
  return {group:model,materials:M,keys,screen,setActiveKey,pulse,get activeKey(){return active;}};
}

