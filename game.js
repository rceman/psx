import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/* HOLLOW STREET — PS1 rendering comparison / single-reference reconstruction
 * Source artwork: procedural. Composition: parked station wagon, porch,
 * paired posts, green wall, door, bushes and dark-clothed pedestrian.
 * The authored camera is calibrated for the reference's 1206:847 composition.
 */
const $ = id => document.getElementById(id);
const setting = {res:240,snap:1,affine:.75,fog:.75,dither:.7,grain:.45};
const dims = new THREE.Vector2(320,240);
const snapPower={value:1}, affinePower={value:.75};
const fogColor = new THREE.Color('#19231f');
const scene = new THREE.Scene(); scene.background=fogColor;
scene.fog = new THREE.FogExp2(fogColor, .054);
// Freeze camera composition to the 1206x847 reference image at any viewport size.
const REFERENCE_ASPECT=1206/847;
const camera=new THREE.PerspectiveCamera(48,REFERENCE_ASPECT,.08,90);
const renderer=new THREE.WebGLRenderer({canvas:$('game'),antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
const clock=new THREE.Clock(), origin=new THREE.Vector3(.7,2.7,8.9), viewPoint=new THREE.Vector3(.0,1.65,-3.15);
camera.position.copy(origin); camera.lookAt(viewPoint);
const world=new THREE.Group();scene.add(world);
const AMBIENT=new THREE.HemisphereLight(0x8ba497,0x232821,1.05);scene.add(AMBIENT);
const porchLight=new THREE.PointLight(0xb7b59a,7,10,2);porchLight.position.set(2.05,3.52,-2.4);scene.add(porchLight);
const alleyLight=new THREE.PointLight(0x617a73,3.0,14,2);alleyLight.position.set(-3,3.7,-2);scene.add(alleyLight);

// One standardized 4x4 PSX texture atlas, tiles 256x256 at 1024x1024.
// Replace with an artist-painted atlas.png in the same layout without UV changes.
const TILE=[
 ['WALL_GREEN','#40564c'],['WALL_LOWER','#625d4f'],['ASPHALT','#555b54'],['SIDEWALK','#8a8d7e'],
 ['DOOR','#777c70'],['DOOR_FRAME','#3c493f'],['CAR_METAL','#4e5555'],['CAR_GLASS','#252f32'],
 ['HEDGE','#293e2a'],['CEILING','#554e48'],['BLACK_GLASS','#151d1b'],['ROOF','#282e2b'],
 ['JEANS','#313940'],['JACKET','#27272a'],['SKIN_HAIR','#847368'],['DETAILS','#727969']
];
const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;
const ac=atlas.getContext('2d',{willReadFrequently:true});ac.imageSmoothingEnabled=false;
const tileMap={};
let seed=0x3521cb79;
function rand(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296}
function fillNoise(ctx,type,base){
  ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
  const counts=type==='HEDGE'?1050:type==='WALL_GREEN'?1450:950;
  for(let k=0;k<counts;k++){
    const x=(rand()*256)|0,y=(rand()*256)|0,w=1+((rand()*12)|0),h=1+((rand()*7)|0);
    const bright=rand()>.47;
    let a=.025+rand()*(type==='HEDGE'?.26:.17);
    ctx.fillStyle=bright?'rgba(196,194,158,'+a+')':'rgba(4,10,8,'+a+')';
    ctx.fillRect(x,y,w,h);
  }
  if(type==='WALL_GREEN'||type==='WALL_LOWER'||type==='CEILING'){
    for(let i=0;i<38;i++){
      let x=rand()*260,y=rand()*256;
      ctx.fillStyle='rgba(15,19,16,'+(.055+rand()*.18)+')';
      ctx.fillRect(x,y,2+rand()*65,1+rand()*9);
    }
    for(let i=0;i<14;i++){
      ctx.strokeStyle='rgba(10,15,11,'+(.05+rand()*.12)+')';
      ctx.lineWidth=1+rand()*3; ctx.beginPath();
      let x=rand()*256,y=rand()*256;ctx.moveTo(x,y);ctx.lineTo(x+rand()*23,y+10+rand()*35);ctx.stroke();
    }
  }
  if(type==='ASPHALT'||type==='SIDEWALK'){
    for(let i=0;i<450;i++){
      ctx.fillStyle=rand()>.5?'#92978a':'#252e2c';ctx.globalAlpha=.08+rand()*.32;
      ctx.fillRect(rand()*256,rand()*256,1+rand()*4,1+rand()*4);
    }ctx.globalAlpha=1;
  }
  if(type==='HEDGE'){
    for(let i=0;i<320;i++){
      ctx.fillStyle=rand()>.6?'rgba(117,137,97,.25)':'rgba(4,18,13,.36)';
      ctx.fillRect(rand()*256,rand()*256,4+rand()*11,2+rand()*10);
    }
  }
  if(type==='CAR_GLASS'||type==='BLACK_GLASS'){
    for(let i=0;i<10;i++){
      ctx.fillStyle='rgba(181,185,176,.07)';
      ctx.fillRect(rand()*256,rand()*256,2+rand()*12,110+rand()*150);
    }
  }
  if(type==='DOOR'){
    ctx.strokeStyle='#343e36';ctx.lineWidth=4;
    ctx.strokeRect(13,12,232,236);ctx.strokeRect(29,22,194,95);ctx.strokeRect(29,128,194,103);
    ctx.fillStyle='rgba(13,19,17,.32)';ctx.fillRect(34,37,183,65);
    for(let i=0;i<130;i++){ctx.fillStyle='rgba(23,28,25,.14)';ctx.fillRect(rand()*220+18,rand()*234+8,1+rand()*5,1+rand()*18);}
    ctx.fillStyle='#b0a47b';ctx.fillRect(222,157,6,11);
  }
  if(type==='CEILING'){
    for(let i=0;i<8;i++){ctx.fillStyle='rgba(15,18,16,.17)';ctx.fillRect(0,i*32,256,3)}
  }
}
for(let i=0;i<TILE.length;i++){
  const [name,base]=TILE[i],x=(i%4)*256,y=(i>>2)*256;
  ac.save();ac.translate(x,y);fillNoise(ac,name,base);ac.restore();
  const c=document.createElement('canvas');c.width=c.height=256;
  const cx=c.getContext('2d');cx.drawImage(atlas,x,y,256,256,0,0,256,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;
  tileMap[name]=t;
}
window.psxAtlas=atlas; // Runtime-generated original 1024px texture fallback.
const artistAtlas=new Image();
artistAtlas.onload=()=>{
  for(let i=0;i<TILE.length;i++){
    const [name]=TILE[i],t=tileMap[name],cx=t.image.getContext('2d');
    cx.clearRect(0,0,256,256);
    cx.imageSmoothingEnabled=false;
    const sw=artistAtlas.naturalWidth/4,sh=artistAtlas.naturalHeight/4;
    cx.drawImage(artistAtlas,(i%4)*sw,Math.floor(i/4)*sh,sw,sh,0,0,256,256);
    t.needsUpdate=true;
  }
  console.info('Custom painted texture atlas loaded: assets/atlas.png');
};
artistAtlas.src='./assets/atlas.png';
artistAtlas.onerror=()=>console.warn('Artist atlas not available; using procedural fallback.');

// Custom shader: snap projected vertices to virtual raster; interpolate UV affinely.
function psx(mat){
 mat.onBeforeCompile=s=>{
  s.uniforms.psxGrid={value:dims};s.uniforms.psxSnap=snapPower;s.uniforms.psxAffine=affinePower;
  s.vertexShader='uniform vec2 psxGrid;uniform float psxSnap;\n#ifdef USE_MAP\nvarying vec2 psxUVW;varying float psxW;\n#endif\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <project_vertex>',
    '#include <project_vertex>\n'+
    'vec2 p=gl_Position.xy/max(gl_Position.w,0.001);'+
    'vec2 q=(floor((p*.5+.5)*psxGrid+.5)/psxGrid)*2.0-1.0;'+
    'gl_Position.xy=mix(gl_Position.xy,q*gl_Position.w,psxSnap);\n'+
    '#ifdef USE_MAP\npsxUVW=uv*gl_Position.w;psxW=gl_Position.w;\n#endif');
  s.fragmentShader='uniform float psxAffine;\n#ifdef USE_MAP\nvarying vec2 psxUVW;varying float psxW;\n#endif\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',
    '#ifdef USE_MAP\n'+
    'vec2 uvPSX=mix(vMapUv,psxUVW/max(psxW,0.001),psxAffine);'+
    'diffuseColor*=texture2D(map,uvPSX);\n#endif');
 };
 mat.customProgramCacheKey=()=> 'psx-snap-affine-v1';
 return mat;
}
function mat(tile,tint=0xffffff,opt={}){
 const m=new THREE.MeshLambertMaterial({map:tileMap[tile],color:tint,flatShading:true,side:THREE.FrontSide,...opt});
 return psx(m);
}
const mats={
 wall:mat('WALL_GREEN'),lower:mat('WALL_LOWER'),road:mat('ASPHALT'),
 concrete:mat('SIDEWALK'),door:mat('DOOR'),frame:mat('DOOR_FRAME'),
 car:mat('CAR_METAL'),glass:mat('CAR_GLASS'),shrub:mat('HEDGE'),
 ceiling:mat('CEILING'),black:mat('BLACK_GLASS'),roof:mat('ROOF'),
 jeans:mat('JEANS'),coat:mat('JACKET'),skin:mat('SKIN_HAIR'),
 metal:mat('DETAILS'),skinWarm:mat('SKIN_HAIR',0xdac8b4),
 warm:mat('DETAILS',0xa89c72),post:mat('WALL_LOWER',0xaaa9a0)
};
function box(parent,w,h,d,x,y,z,m){
 const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 a.position.set(x,y,z);parent.add(a);return a;
}
function plane(parent,w,h,x,y,z,m,ry=0){
 const a=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);
 a.position.set(x,y,z);a.rotation.y=ry;parent.add(a);return a;
}
function surface(w,d,x,y,z,m){
 const a=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);
 a.rotation.x=-Math.PI/2;a.position.set(x,y,z);world.add(a);return a;
}
function taper(parent,bottomW,bottomD,topW,topD,h,m,px,py,pz){
 const v=[],inds=[];
 const coords=[
 [-bottomW/2,0,-bottomD/2],[bottomW/2,0,-bottomD/2],[bottomW/2,0,bottomD/2],[-bottomW/2,0,bottomD/2],
 [-topW/2,h,-topD/2],[topW/2,h,-topD/2],[topW/2,h,topD/2],[-topW/2,h,topD/2]
 ];
 const indices=[0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7,3,2,1,3,1,0];
 for(let i=0;i<indices.length;i+=3){v.push(...coords[indices[i]],...coords[indices[i+2]],...coords[indices[i+1]]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:v.length/3},(_,i)=>[i%3===1?1:0,(i%3===2)?1:0]).flat(),2));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,m);mesh.position.set(px,py,pz);parent.add(mesh);return mesh;
}
// Visible ground and raised worn concrete walkway (wall runs along z=-3.85).
surface(85,85,0,-.09,0,mats.road);
box(world,12.0,.22,5.2,3.25,-.08,-1.05,mats.concrete);
surface(11.95,5.17,3.25,.04,-1.05,mats.concrete);
box(world,.13,.18,11.5,-2.35,.11,0.05,mats.frame);
box(world,.28,.08,5.2,-2.55,.04,-1.05,mats.lower);
for(let i=0;i<70;i++){
 const x=-9+rand()*19,z=-1+rand()*13;
 if(x>-.9&&x<9&&z<1.7)continue;
 box(world,.01+rand()*.18,.012,.03+rand()*.12,x,-.08,z,i%3?mats.concrete:mats.lower);
}
// Exterior wall with near-black passage on the left.
box(world,14.2,5.65,.52,4.65,2.82,-3.85,mats.wall);
box(world,14.3,1.22,.54,4.65,.61,-3.55,mats.lower);
box(world,.35,4.5,5.1,-2.57,2.25,-6.0,mats.black);
box(world,6.8,5.7,.5,-6.6,2.83,-8.3,mats.black);
box(world,.65,5.7,6.0,-2.62,2.83,-5.7,mats.wall);
box(world,6.8,5.7,.42,-6.7,2.83,-3.88,mats.black);
box(world,7.0,1.1,.43,-6.7,.55,-3.65,mats.lower);
// Eaves: ceiling spans passage and entry, with vertical support posts.
box(world,19.0,.19,5.8,-.7,4.73,-1.4,mats.ceiling);
box(world,19.2,.3,.25,-.7,4.68,1.45,mats.roof);
box(world,19.5,.2,6.2,-.7,4.94,-1.35,mats.roof);
for(const [x,z,h] of [[-.52,1.38,4.7],[-6.2,1.39,4.7]]){
 box(world,.145,h,.145,x,h/2,z,mats.post);
 box(world,.29,.21,.27,x,h-.13,z,mats.frame);
}
box(world,3.25,.16,.20,2.0,3.38,-3.47,mats.frame);
// Door and detailed wall: target ~x700 in the 1206-wide reference.
box(world,1.57,3.03,.16,2.0,1.53,-3.48,mats.frame);
box(world,1.34,2.83,.12,2.0,1.49,-3.34,mats.door);
box(world,1.1,.95,.025,2.0,2.35,-3.26,mats.door);
box(world,1.05,1.13,.028,2.0,1.05,-3.26,mats.door);
box(world,.08,.08,.05,2.55,1.25,-3.2,mats.warm);
box(world,1.50,.13,.47,2,.08,-3.25,mats.concrete);
box(world,.66,.43,.07,2.04,3.77,-3.47,mats.frame);
box(world,.53,.27,.08,2.04,3.78,-3.4,mats.door);
for(let i=0;i<9;i++)box(world,.43,.012,.016,2.02,3.88-i*.027,-3.32,mats.black);
// grimy details on walls: faded window and stains.
box(world,.80,1.45,.08,-.9,2.38,-3.45,mats.frame);
box(world,.52,1.20,.03,-.9,2.38,-3.38,mats.black);
for(let i=0;i<48;i++){
 const x=-2.2+rand()*13.4,y=.4+rand()*4.05;
 if(x>1.1&&x<2.9&&y<3.15)continue;
 box(world,.03+rand()*.18,.07+rand()*.8,.012,x,y,-3.309,rand()>.5?mats.lower:mats.wall);
}
// Shrubbery. Low-poly angular hedge volume & leaves with consistent mottled atlas.
function shrub(parent,x,y,z,sx=1,sy=1,sz=1){
 taper(parent,.87*sx,.86*sz,1.05*sx,.96*sz,.68*sy,mats.shrub,x,y,z);
 for(let j=0;j<5;j++){
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry((.25+rand()*.17)*sx,0),mats.shrub);
  m.scale.set(.9,sy/sx,sz/sx);m.position.set(x+(rand()-.5)*sx,y+.35*sy+rand()*.38*sy,z+(rand()-.5)*sz);parent.add(m);
 }
}
for(let i=0;i<17;i++){
 shrub(world,3.7+i*.51,.08,-2.45+.21*Math.sin(i*1.7),.72+rand()*.4,.63+rand()*.32,.65+rand()*.32);
}
for(let i=0;i<7;i++)shrub(world,-1.9+rand()*.85,.1,-3.0+rand()*.65,.45,.5,.5);
// Dark wagon, viewed from its right rear, clipped by left edge.
const car=new THREE.Group();world.add(car);car.position.set(-5.75,.0,2.36);
box(car,4.0,1.03,1.94,0,.81,0,mats.car);
box(car,3.62,.22,1.96,0,.39,.02,mats.car);
taper(car,3.25,1.82,2.98,1.64,.92,mats.car,-.19,1.30,-.02);
box(car,3.10,.11,1.72,-.2,2.26,-.02,mats.car);
const win=mat('CAR_GLASS',0xb7bbb7);
box(car,1.04,.54,.045,-1.08,1.78,.913,win);
box(car,1.00,.55,.047,.18,1.79,.913,win);
box(car,.48,.50,.048,1.13,1.77,.913,win);
box(car,.065,.74,.065,-.43,1.73,.95,mats.car);
box(car,.06,.72,.065,.83,1.73,.95,mats.car);
box(car,3.5,.055,.055,0,1.34,1.016,mats.metal);
box(car,.77,.18,.045,1.6,.84,1.008,mats.car);
box(car,.19,.16,.055,1.95,1.03,1.00,mats.warm);
box(car,.13,.31,.05,2.035,.68,1.005,mats.metal);
for(const wx of [-1.19,1.29]){
 for(const zz of [-1.04,1.044]){
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.13,10),mats.black);
  tire.rotation.x=Math.PI/2;tire.position.set(wx,.42,zz);car.add(tire);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.245,.245,.14,8),mats.metal);
  rim.rotation.x=Math.PI/2;rim.position.set(wx,.42,zz+(zz>0?.02:-.02));car.add(rim);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.149,8),mats.concrete);
  hub.rotation.x=Math.PI/2;hub.position.copy(rim.position);hub.position.z+=zz>0?.015:-.015;car.add(hub);
 }
}
box(car,.51,.18,.16,-1.4,.55,1.04,mats.car);
box(car,.43,.12,.24,-1.4,.55,1.13,mats.roof);
// Character: dark angular silhouette seen from behind. Articulated legs/arms.
const walker=new THREE.Group();world.add(walker);
walker.position.set(2.57,.06,2.02);
const hips=new THREE.Group();walker.add(hips);
taper(hips,.62,.35,.51,.39,.42,mats.jeans,0,.87,0);
taper(hips,.80,.41,.55,.37,.88,mats.coat,0,1.18,0);
taper(hips,.61,.34,.68,.46,.28,mats.coat,0,1.91,0);
box(hips,.37,.19,.29,0,2.21,-.025,mats.skin);
const head=new THREE.Group();head.position.set(0,2.33,-.035);hips.add(head);
taper(head,.26,.28,.22,.24,.33,mats.skin,0,-.06,0);
taper(head,.28,.28,.30,.31,.19,mats.black,0,.18,-.01);
const hair=new THREE.Mesh(new THREE.ConeGeometry(.2,.16,5),mats.black);
hair.position.set(.018,.28,-.01);head.add(hair);
const legs=[],arms=[];
for(const side of [-1,1]){
 const leg=new THREE.Group();leg.position.set(side*.19,.97,0);walker.add(leg);
 taper(leg,.22,.20,.255,.235,.79,mats.jeans,0,-.77,0);
 box(leg,.29,.14,.39,0,-.84,-.1,mats.black);
 legs.push(leg);
 const arm=new THREE.Group();arm.position.set(side*.44,1.96,0);hips.add(arm);
 arm.rotation.z=side*.13;
 taper(arm,.22,.22,.24,.24,.61,mats.coat,0,-.58,0);
 taper(arm,.21,.20,.23,.21,.32,mats.coat,0,-.87,-.06);
 box(arm,.17,.18,.17,0,-1.04,-.08,mats.skin);
 arms.push(arm);
}
const handFlash=box(arms[1],.14,.28,.20,0,-1.07,-.09,mats.black);
const flashlight=new THREE.SpotLight(0xe9e7cd,30,17,Math.PI/5,.9,1.65);
flashlight.position.set(2.82,1.52,1.85);flashlight.target.position.set(2.10,1.00,-4.0);
scene.add(flashlight,flashlight.target);
const glow=new THREE.PointLight(0xd5dec5,3,3,2);scene.add(glow);
let flashlightOn=true;
// Ash/snow drifting in the darkness, muted to avoid obscuring the reference.
const dustCount=110,particles=new Float32Array(dustCount*3);
for(let i=0;i<dustCount;i++){particles[i*3]=-10+rand()*21;particles[i*3+1]=rand()*8;particles[i*3+2]=-10+rand()*25}
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(particles,3));
const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xcaccc1,size:.055,sizeAttenuation:true,transparent:true,opacity:.50,depthWrite:false,fog:true}));scene.add(dust);
// Render the scene into a retro framebuffer, then nearest-neighbor scale it.
const postScene=new THREE.Scene(),postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const post=new THREE.ShaderMaterial({
 uniforms:{
  sceneTex:{value:null},screenSize:{value:dims},time:{value:0},
  dither:{value:.7},grain:{value:.45}
 },
 depthTest:false,depthWrite:false,
 vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
 fragmentShader:[
 'precision highp float;uniform sampler2D sceneTex;uniform vec2 screenSize;',
 'uniform float time,dither,grain;varying vec2 uv0;',
 'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
 'float bayer(vec2 p){p=mod(floor(p),4.0);float x=p.x,y=p.y;',
 'if(y<1.0){if(x<1.0)return 0.;if(x<2.)return 8.;if(x<3.)return 2.;return 10.;}',
 'if(y<2.0){if(x<1.0)return 12.;if(x<2.)return 4.;if(x<3.)return 14.;return 6.;}',
 'if(y<3.0){if(x<1.0)return 3.;if(x<2.)return 11.;if(x<3.)return 1.;return 9.;}',
 'if(x<1.0)return 15.;if(x<2.)return 7.;if(x<3.)return 13.;return 5.;}',
 'void main(){vec3 c=texture2D(sceneTex,uv0).rgb;vec2 pix=floor(uv0*screenSize);',
 'float n=(hash(pix+floor(time*16.)*vec2(19.,23.))-.5)*grain*.16;',
 'float b=(bayer(pix)/16.-.5)*dither;',
 'c=clamp(c+n,0.,1.);c=floor(clamp(c*31.+b+.5,0.,31.))/31.;',
 'float v=1.-.35*pow(length((uv0-.5)*vec2(1.3,1.05)),1.7);',
 'gl_FragColor=vec4(c*v,1.);}'
 ].join('\n')
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
let target;
let presentRect={x:0,y:0,width:0,height:0};
let scenePass={calls:0,triangles:0,points:0,lines:0};
function resize(){
 const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
 const rh=setting.res,rw=Math.max(1,Math.round(rh*REFERENCE_ASPECT));
 dims.set(rw,rh);
 target?.dispose();target=new THREE.WebGLRenderTarget(rw,rh,{
  minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true,stencilBuffer:false
 });
 target.texture.colorSpace=THREE.SRGBColorSpace;
 renderer.setSize(w,h,false);
 camera.aspect=REFERENCE_ASPECT;
 camera.updateProjectionMatrix();
 const scale=Math.min(w/rw,h/rh);
 const viewW=Math.min(w,Math.max(1,Math.round(rw*scale)));
 const viewH=Math.min(h,Math.max(1,Math.round(rh*scale)));
 presentRect={
  x:Math.floor((w-viewW)/2),y:Math.floor((h-viewH)/2),
  width:viewW,height:viewH
 };
 post.uniforms.sceneTex.value=target.texture;
 const overlay=document.getElementById('psx-reference-overlay');
 if(overlay){
  overlay.style.left=presentRect.x+'px';
  overlay.style.top=presentRect.y+'px';
  overlay.style.width=presentRect.width+'px';
  overlay.style.height=presentRect.height+'px';
 }
 console.info('Reference framing', {aspect:REFERENCE_ASPECT.toFixed(3),renderTarget:[rw,rh],viewport:[w,h],presentation:presentRect});
}
window.addEventListener('resize',resize);
resize();
const savedFog=scene.fog, savedBackground=scene.background;
const originalMaterialByMesh=new Map();
let diagnosticMode=false;
function setVisibilityTest(enabled){
 diagnosticMode=!!enabled;
 if(diagnosticMode){
  scene.fog=null;
  scene.background=new THREE.Color(0x455360);
  const uniqueMaterials=new Map();
  const diagnosticPalette=[0xc6b380,0x638fa8,0xb8a8cb,0xc7c9c0,0x829daf,0xe2d5a0];
  scene.traverse(obj=>{
   if(!obj.isMesh)return;
   originalMaterialByMesh.set(obj,obj.material);
   const key=Array.isArray(obj.material)?obj.material[0]:obj.material;
   if(!uniqueMaterials.has(key)){
    const c=diagnosticPalette[uniqueMaterials.size%diagnosticPalette.length];
    uniqueMaterials.set(key,new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));
   }
   obj.material=uniqueMaterials.get(key);
  });
 }else{
  scene.fog=savedFog;
  scene.fog.density=.072*setting.fog;
  scene.background=savedBackground;
  for(const [obj,material] of originalMaterialByMesh)obj.material=material;
  originalMaterialByMesh.clear();
 }
 console.info('Visibility test', diagnosticMode?'ON: fog off, basic high-visibility material':'OFF: original PSX materials restored');
}
window.__psxDebug?.setRuntime({
 renderer, scene, camera, settings:setting, target:()=>target,
 scenePass:()=>scenePass,presentation:()=>presentRect,
 setVisibilityTest
});
let debugFrame=0;
const key=new Set();let follow=false,turn=0,dragging=false,lastX=0;
const keepKey=e=>['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code);
window.addEventListener('keydown',e=>{
 if(keepKey(e))e.preventDefault();
 key.add(e.code);
 if(e.repeat)return;
 if(e.code==='KeyF')toggleLight();
 if(e.code==='KeyR')reset();
 if(e.code==='KeyC')toggleCamera();
});
window.addEventListener('keyup',e=>key.delete(e.code));
window.addEventListener('blur',()=>key.clear());
const panel=$('panel');
$('panel-toggle').addEventListener('click',()=>{
 const collapsed=panel.classList.toggle('collapsed');
 $('panel-toggle').setAttribute('aria-expanded',String(!collapsed));
 $('toggle-icon').textContent=collapsed?'+':'−';
});
for(const [id,field,scale,unit] of [['res','res',1,'p'],['snap','snap',.01,'%'],['affine','affine',.01,'%'],['fog','fog',.01,'%'],['dither','dither',.01,'%'],['grain','grain',.01,'%']]){
 const control=$(id),out=$('out-'+id);
 control.addEventListener('input',()=>{
  const num=Number(control.value);setting[field]=num*scale;
  out.textContent=num+unit;
  if(id==='res')resize();
  if(id==='snap')snapPower.value=setting.snap;
  if(id==='affine')affinePower.value=setting.affine;
  if(id==='fog' && scene.fog)scene.fog.density=.072*setting.fog;
  if(id==='dither')post.uniforms.dither.value=setting.dither;
  if(id==='grain')post.uniforms.grain.value=setting.grain;
 });
}
// Reference overlay tools. The screenshot stays on the user's device.
const compareControls=document.createElement('div');
compareControls.style.cssText='border-top:1px solid #4a574f;padding-top:9px;margin-top:12px;font-size:10px;color:#c7cfc4;';
const compareText=document.createElement('div');compareText.textContent='REFERENCE MATCH // OPTIONAL';
compareText.style.cssText='font-weight:bold;color:#dfcfa0;margin-bottom:8px;';
compareControls.append(compareText);
const choose=document.createElement('input');
choose.type='file';choose.accept='image/*';choose.setAttribute('aria-label','Load reference screenshot');
choose.style.cssText='font:10px monospace;width:100%;max-width:100%;margin:5px 0 9px;';
compareControls.append(choose);
const reference=document.createElement('img');
reference.id='psx-reference-overlay';
reference.alt='Local reference for scene alignment';
reference.style.cssText='pointer-events:none;position:fixed;object-fit:fill;opacity:0;z-index:1;';
document.body.append(reference);
Object.assign(reference.style,{
 left:presentRect.x+'px',top:presentRect.y+'px',
 width:presentRect.width+'px',height:presentRect.height+'px'
});
let lastObjectURL=null;
choose.addEventListener('change',()=>{
 const f=choose.files?.[0];if(!f)return;
 if(lastObjectURL)URL.revokeObjectURL(lastObjectURL);
 lastObjectURL=URL.createObjectURL(f);reference.src=lastObjectURL;reference.style.opacity='.5';
 blend.value='50';blendOutput.textContent='50%';
});
const blendLabel=document.createElement('label');
blendLabel.textContent='Reference opacity';
const blend=document.createElement('input');blend.type='range';blend.min='0';blend.max='100';blend.value='50';
const blendOutput=document.createElement('output');blendOutput.textContent='50%';
blendLabel.append(blendOutput,blend);
blend.addEventListener('input',()=>{reference.style.opacity=String(+blend.value/100);blendOutput.textContent=blend.value+'%'});
compareControls.append(blendLabel);
const fovLabel=document.createElement('label');fovLabel.textContent='Camera FOV';
const fovSlider=document.createElement('input');fovSlider.type='range';fovSlider.min='32';fovSlider.max='68';fovSlider.value='48';
const fovOutput=document.createElement('output');fovOutput.textContent='48°';
fovLabel.append(fovOutput,fovSlider);
fovSlider.addEventListener('input',()=>{camera.fov=+fovSlider.value;camera.updateProjectionMatrix();fovOutput.textContent=fovSlider.value+'°'});
compareControls.append(fovLabel);
for(const [name,vec,axis,min,max] of [
 ['Camera X',origin,'x',-4,4],['Camera height',origin,'y',1.0,5.0],
 ['Camera Z',origin,'z',5,14],['Aim X',viewPoint,'x',-4,4],['Aim Y',viewPoint,'y',0,4]
]){
 const l=document.createElement('label');l.textContent=name;
 const s=document.createElement('input');s.type='range';s.min=String(min);s.max=String(max);s.step='.05';s.value=String(vec[axis]);
 const out=document.createElement('output');out.textContent=Number(vec[axis]).toFixed(2);
 s.addEventListener('input',()=>{vec[axis]=+s.value;out.textContent=Number(s.value).toFixed(2)});
 l.append(out,s);compareControls.append(l);
}
$('panel-body').append(compareControls);
const exportBtn=document.createElement('button');exportBtn.textContent='EXPORT 1024px BASE ATLAS';
exportBtn.style.cssText='width:100%;margin:8px 0;padding:9px;border:1px solid #738478;background:#1a2622;color:#e0e5d8;font:700 10px monospace;cursor:pointer';
exportBtn.addEventListener('click',()=>{const a=document.createElement('a');a.download='psx-atlas-base.png';a.href=atlas.toDataURL('image/png');a.click()});
$('panel-body').append(exportBtn);
const camButton=document.createElement('button');
camButton.textContent='CAMERA: FRAME';camButton.title='Toggle reference frame or follow camera (C)';
camButton.style.width='100%';camButton.style.marginTop='9px';
camButton.className='camera-button';
$('panel-body').append(camButton);
camButton.addEventListener('click',toggleCamera);
function toggleCamera(){follow=!follow;camButton.textContent=follow?'CAMERA: FOLLOW':'CAMERA: FRAME';turn=0;}
function reset(){walker.position.set(2.57,.06,2.02);turn=0;follow=false;camButton.textContent='CAMERA: FRAME';camera.position.copy(origin);camera.lookAt(viewPoint);}
function toggleLight(){
 flashlightOn=!flashlightOn;flashlight.visible=flashlightOn;glow.visible=flashlightOn;
 $('light').textContent=flashlightOn?'FLASHLIGHT: ON':'FLASHLIGHT: OFF';
}
$('light').addEventListener('click',toggleLight);
$('reset').addEventListener('click',reset);
$('mobile-light').addEventListener('click',toggleLight);
const canvas=$('game');
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||(e.pointerType==='touch'&&!e.isPrimary)) {dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)}});
canvas.addEventListener('pointermove',e=>{
 if(dragging){turn+=(e.clientX-lastX)*.004;lastX=e.clientX;if(!follow)toggleCamera();}
});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('pointercancel',()=>dragging=false);
for(const b of document.querySelectorAll('[data-key]')){
 const c=b.dataset.key;
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);key.add(c)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>key.delete(c));
}
const runB=$('mobile-run');
runB.addEventListener('pointerdown',e=>{e.preventDefault();runB.setPointerCapture(e.pointerId);key.add('ShiftLeft')});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])runB.addEventListener(ev,()=>key.delete('ShiftLeft'));
// Only report active after a successful render attempt.
$('status').innerHTML='<span class="status-dot"></span> INITIALIZING GPU SCENE...';
if (window.matchMedia('(pointer: coarse)').matches) {
 panel.classList.add('collapsed');
 $('panel-toggle').setAttribute('aria-expanded','false');
 $('toggle-icon').textContent='+';
}
// Character starts side-on to the door, not facing the player.
let walkT=0,elapsed=0;
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.045);elapsed+=dt;
 const x=(key.has('KeyD')||key.has('ArrowRight')?1:0)-(key.has('KeyA')||key.has('ArrowLeft')?1:0);
 const z=(key.has('KeyS')||key.has('ArrowDown')?1:0)-(key.has('KeyW')||key.has('ArrowUp')?1:0);
 const speed=(key.has('ShiftLeft')||key.has('ShiftRight')?3.35:1.7);
 const size=Math.hypot(x,z);let move=0;
 if(size){
  const nx=walker.position.x+x/size*speed*dt,nz=walker.position.z+z/size*speed*dt;
  walker.position.x=THREE.MathUtils.clamp(nx,-8.4,9.1);
  walker.position.z=THREE.MathUtils.clamp(nz,-2.54,6.9);
  // Solid collision with the parked wagon.
  if(walker.position.x>-8.0&&walker.position.x<-3.15&&walker.position.z>.95&&walker.position.z<3.85)walker.position.z=3.86;
  const bearing=Math.atan2(-x,-z);
  let delta=((bearing-walker.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;
  walker.rotation.y+=delta*Math.min(1,dt*10);
  move=1;walkT+=dt*speed*5;
 }
 legs[0].rotation.x=Math.sin(walkT)*.55*move;
 legs[1].rotation.x=-Math.sin(walkT)*.55*move;
 arms[0].rotation.x=-Math.sin(walkT)*.30*move;
 arms[1].rotation.x=Math.sin(walkT)*.26*move;
 hips.position.y=move?Math.abs(Math.sin(walkT*2))*.03:Math.sin(elapsed*1.4)*.007;
 flashlight.position.set(walker.position.x+.23,1.53,walker.position.z-.18);
 flashlight.target.position.set(walker.position.x-.4,1.05,walker.position.z-6.4);
 glow.position.set(walker.position.x,1.50,walker.position.z-.4);
 for(let i=0;i<dustCount;i++){
  particles[i*3+1]-=dt*(.04+((i%7)*.02));
  particles[i*3]+=dt*.035;
  if(particles[i*3+1]<.02){particles[i*3+1]=6+rand()*2;particles[i*3]=-10+rand()*21;}
 }
 dustGeo.attributes.position.needsUpdate=true;
 if(follow){
  const off=new THREE.Vector3(Math.sin(turn)*6.2,2.65,Math.cos(turn)*6.2);
  const dest=walker.position.clone().add(off);
  camera.position.lerp(dest,Math.min(1,dt*3.2));
  const at=walker.position.clone().add(new THREE.Vector3(0,1.5,-1.0));
  camera.lookAt(at);
 } else {
  camera.position.lerp(origin,Math.min(1,dt*4));camera.lookAt(viewPoint);
 }
 post.uniforms.time.value=elapsed;
 renderer.setRenderTarget(target);
 renderer.render(scene,camera);
 scenePass={
  calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
  points:renderer.info.render.points,lines:renderer.info.render.lines
 };
 renderer.setRenderTarget(null);
 renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
 renderer.setScissorTest(false);
 renderer.clear(true,true,true);
 renderer.setViewport(presentRect.x,presentRect.y,presentRect.width,presentRect.height);
 renderer.render(postScene,postCam);
 renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
 debugFrame++;
 if (debugFrame === 12 || debugFrame % 420 === 0){
   window.__psxDebug?.log('scene-pass',scenePass);
 }
 if (debugFrame === 12 || debugFrame % 420 === 0) {
   window.__psxDebug?.probe(renderer, target);
 }
 window.__psxDebug?.markReady();
 if (!window.__psxReady) {
   window.__psxReady = true;
   $('status').innerHTML='<span class="status-dot"></span> SCENE ACTIVE // REFERENCE CAMERA';
 }
}
try{animate()}catch(e){console.error(e);$('status').textContent='RENDER ERROR';$('error').hidden=false;$('error').textContent='Rendering error: '+e.message;}
window.addEventListener('unhandledrejection',e=>{$('error').hidden=false;$('error').textContent='Error: '+e.reason;});