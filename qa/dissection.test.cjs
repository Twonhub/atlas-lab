const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
class Vec3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 clone(){return new Vec3(this.x,this.y,this.z)}
 copy(p){this.x=p.x;this.y=p.y;this.z=p.z;return this}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 add(p){this.x+=p.x;this.y+=p.y;this.z+=p.z;return this}
 sub(p){this.x-=p.x;this.y-=p.y;this.z-=p.z;return this}
 addScaledVector(p,s){this.x+=p.x*s;this.y+=p.y*s;this.z+=p.z*s;return this}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
 lengthSq(){return this.x**2+this.y**2+this.z**2}
 normalize(){const n=Math.sqrt(this.lengthSq())||1;return this.multiplyScalar(1/n)}
}
class Box3{
 constructor(){this.min=new Vec3(Infinity,Infinity,Infinity);this.max=new Vec3(-Infinity,-Infinity,-Infinity)}
 expandByObject(m){for(const k of ["x","y","z"]){this.min[k]=Math.min(this.min[k],m.position[k]);this.max[k]=Math.max(this.max[k],m.position[k])}return this}
 isEmpty(){return this.min.x>this.max.x}
 getCenter(out){for(const k of ["x","y","z"])out[k]=(this.max[k]+this.min[k])/2;return out}
 getSize(out){for(const k of ["x","y","z"])out[k]=this.max[k]-this.min[k];return out}
 expandByPoint(p){this.expandByObject({position:p});return this}
}
function setup(){
 const canvas={addEventListener(){},style:{},setPointerCapture(){}};
 const elements=new Map;
 global.document={getElementById(id){if(!elements.has(id))elements.set(id,{value:id==="explodeScope"?"whole":0,textContent:"",onclick:null,oninput:null,onchange:null});return elements.get(id)}};
 const THREE={Vector3:Vec3,Box3,
  DirectionalLight:class{constructor(color,power){this.color=color;this.power=power;this.position={set(){}}}},
  ACESFilmicToneMapping:1};
 const source=fs.readFileSync("dissection.js","utf8")
  .replace(/^import .*?;\s*/,"")
  .replace("export function installDissection","function installDissection");
 const installDissection=new Function("THREE","document","requestAnimationFrame","cancelAnimationFrame",source+";return installDissection;")(
  THREE,global.document,cb=>{cb();return 1},()=>{});
 const makeMesh=(x,y,name)=>({position:new Vec3(x,y,0),material:{},userData:{original:{}},visible:true,name});
 const meshes=[makeMesh(-1,1,"BoneLeft"),makeMesh(1,1,"BoneRight")];
 const entries=meshes.map((m,i)=>{const key="Skeleton::Bone"+i;return {key,system:"Skeleton",name:"Bone"+i,hidden:false,ghost:false,meshes:[m]}});
 const viewer={
  registry:new Map(entries.map(e=>[e.key,e])),groups:new Map(),enabled:new Set(["Skeleton"]),
  selected:null,isolated:null,changed(){},
  scene:{background:{set(){}},add(){}},
  camera:{matrixWorld:{}},
  renderer:{domElement:canvas,toneMappingExposure:1},
  controls:{enabled:true},setSystem:async()=>true,fitAll(){}
 };
 installDissection(viewer,()=>{});
 return {viewer,meshes,elements}
}
test("whole-body dissection works with no selected part or active region",()=>{
 const {viewer,meshes}=setup();
 assert.equal(viewer.explodeScope,"whole");
 assert.equal(viewer.selected,null);
 assert.equal(viewer.setExplosion(.65),true);
 assert.equal(viewer.explodeAmount,.65);
 assert.ok(meshes.some(m=>m.position.x!==-1&&m.position.x!==1),"The meshes should spread from their original positions");
 viewer.setExplosion(0);
 assert.equal(meshes[0].position.x,-1);
 assert.equal(meshes[1].position.x,1)
});
test("choosing region explode without an active region falls back to whole body",()=>{
 const {viewer,elements}=setup();
 viewer.setExplodeScope("region");
 viewer.activeRegion="whole";
 assert.equal(viewer.setExplosion(.5),true);
 assert.equal(viewer.explodeScope,"whole");
 assert.equal(elements.get("explodeScope").value,"whole")
});
test("selected-only mode still requires an explicitly chosen part",()=>{
 const {viewer}=setup();
 viewer.setExplodeScope("selected");
 assert.equal(viewer.setExplosion(.5),false);
 assert.equal(viewer.explodeAmount,0)
});
