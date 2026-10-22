const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

class Vec3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 length(){return Math.hypot(this.x,this.y,this.z)}
}
class Box3{
 constructor(){this.min={x:Infinity,y:Infinity,z:Infinity};this.max={x:-Infinity,y:-Infinity,z:-Infinity}}
 isEmpty(){return ["x","y","z"].some(k=>this.min[k]>this.max[k])}
 expandByPoint(p){for(const k of ["x","y","z"]){this.min[k]=Math.min(this.min[k],p[k]);this.max[k]=Math.max(this.max[k],p[k])}return this}
 expandByObject(mesh){return this.expandByPoint(mesh.pos)}
 union(b){if(!b.isEmpty()){this.expandByPoint(b.min);this.expandByPoint(b.max)}return this}
 getSize(){return this.isEmpty()?new Vec3():new Vec3(...["x","y","z"].map(k=>this.max[k]-this.min[k]))}
 getCenter(){return new Vec3(...["x","y","z"].map(k=>(this.max[k]+this.min[k])/2))}
 expandByScalar(n){for(const k of ["x","y","z"]){this.min[k]-=n;this.max[k]+=n}return this}
 containsPoint(p){return ["x","y","z"].every(k=>p[k]>=this.min[k]&&p[k]<=this.max[k])}
 intersectsBox(b){return ["x","y","z"].every(k=>b.max[k]>=this.min[k]&&b.min[k]<=this.max[k])}
}
class Element{
 constructor(){this.children=[];this.options=[];this.value="";this.textContent="";this.style={}}
 set innerHTML(v){this.children=[];this.options=[];this.value="";}
 append(child){this.children.push(child);if(child.isOption){this.options.push(child);if(this.options.length===1)this.value=child.value}}
 replaceChildren(){this.children=[]}
 get selectedOptions(){return this.options.filter(o=>o.value===this.value)}
}
function context(){
 const el=new Map(),document={
  getElementById(id){if(!el.has(id))el.set(id,new Element);return el.get(id)},
  createElement(tag){const x=new Element;x.isOption=tag==="option";return x}
 };
 const script=fs.readFileSync("regions.js","utf8")
  .replace(/^import \* as THREE from "three";/m,"")
  .replace("export const REGIONS=","const REGIONS=")
  .replace("export function installRegions","function installRegions");
 const api=new Function("THREE","document","window","console",script+";return {REGIONS,installRegions};")(
  {Vector3:Vec3,Box3},document,{addEventListener(){}},console);
 const anatomy=[
  ["Skeleton","Scaphoid bone.l",-3,2,0],
  ["Skeleton","Lunate bone.l",-3.15,2,0],
  ["Skeleton","Scaphoid bone.r",3,2,0],
  ["Skeleton","Lunate bone.r",3.15,2,0],
  ["Skeleton","Body of sternum",0,4,0],
  ["Cardiovascular","Left atrium",0,4.7,0],
  ["Cardiovascular","Right atrium",.2,4.7,0],
  ["Cardiovascular","Left ventricle",0,4.5,0],
  ["Cardiovascular","Right ventricle",.2,4.5,0]
 ];
 const registry=new Map(anatomy.map(([system,name,x,y,z])=>{
  const key=system+"::"+name;
  return [key,{key,name,system,hidden:false,meshes:[{pos:{x,y,z},updateWorldMatrix(){}}]}]
 }));
 const viewer={
  registry,groups:new Map([["Skeleton",{}],["Cardiovascular",{}]]),
  enabled:new Set(["Skeleton"]),selected:null,isolated:null,
  systems(){return ["Skeleton","Cardiovascular","Nervous"]},
  apply(){},setExplodeScope(x){this.explodeScope=x},
  async setSystem(name){this.groups.set(name,{})},
  boxFocus(box){this.focusBounds=box},
  fitAll(){},explodeAmount:0,
  setExplosion(n){this.explodeAmount=n;return true}
 };
 const warnings=[];
 document.getElementById("regionSide").value="both"; // matches the initial HTML select value
 api.installRegions(viewer,m=>warnings.push(m));
 return {document,viewer,api,warnings}
}
test("both wrists retain each wrist but do not include a middle-of-body bone",async()=>{
 const {viewer}=context();
 assert.equal(await viewer.navigateRegion("wrist","Skeleton"),true);
 const keys=[...viewer.regionFilter];
 assert.equal(keys.filter(x=>x.includes("Scaphoid")).length,2);
 assert.ok(keys.some(x=>x.includes("Lunate bone.l")));
 assert.ok(keys.some(x=>x.includes("Lunate bone.r")));
 assert.ok(!keys.some(x=>x.includes("sternum")));
 assert.equal(viewer.activeRegion,"wrist");
});
test("a side-specific wrist view keeps only the selected side",async()=>{
 const {viewer,document}=context();
 document.getElementById("regionSide").value="right";
 assert.equal(await viewer.navigateRegion("wrist","Skeleton"),true);
 assert.ok([...viewer.regionFilter].every(x=>!x.endsWith(".l")));
});
test("an unavailable system falls back to skeleton without abandoning the body region",async()=>{
 const {viewer,document}=context();
 assert.equal(await viewer.navigateRegion("wrist","Nervous"),true);
 assert.equal(viewer.activeRegion,"wrist");
 assert.equal(document.getElementById("regionSystem").value,"Skeleton");
 assert.ok(viewer.regionFilter.size>=2);
});
test("heart region uses modeled heart chambers, not a nonexistent whole-heart mesh",async()=>{
 const {viewer}=context();
 assert.equal(await viewer.navigateRegion("heart","Cardiovascular"),true);
 assert.equal(viewer.regionFilter.size,4);
 assert.ok([...viewer.regionFilter].every(x=>x.startsWith("Cardiovascular::")));
});
test("regional dissection can infer a wrist from the selected scaphoid",async()=>{
 const {viewer,document}=context();
 viewer.selected="Skeleton::Scaphoid bone.l";
 assert.equal(await viewer.openSelectedRegion(),true);
 assert.equal(document.getElementById("regionSelect").value,"wrist");
 assert.equal(document.getElementById("regionSide").value,"left");
});
