import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {DRACOLoader} from "three/addons/loaders/DRACOLoader.js";
export class AnatomyViewer {
 constructor(root,changed,status) {
  this.root=root;this.changed=changed;this.status=status;this.registry=new Map();this.groups=new Map();this.enabled=new Set(["Skeleton"]);this.selected=null;this.isolated=null;this.history=[];this.manifest={};
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x0e2131);
  this.camera=new THREE.PerspectiveCamera(38,1,.0001,10000);this.camera.position.set(0,1,4);
  this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;root.prepend(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x4d697a,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,3,6);this.scene.add(light);
  this.raycaster=new THREE.Raycaster();this.loader=new GLTFLoader();const draco=new DRACOLoader();draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/libs/draco/");this.loader.setDRACOLoader(draco);
  let start;this.renderer.domElement.addEventListener("pointerdown",e=>start=[e.clientX,e.clientY]);
  this.renderer.domElement.addEventListener("pointerup",e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])<5)this.pick(e)});
  new ResizeObserver(()=>this.resize()).observe(root);this.resize();this.animate();
 }
 resize(){let w=this.root.clientWidth,h=this.root.clientHeight;if(w&&h){this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)}}
 animate(){this.controls.update();this.renderer.render(this.scene,this.camera);requestAnimationFrame(()=>this.animate())}
 async configure(manifest){this.manifest=manifest;await this.setSystem("Skeleton",true)}
 systems(){return Object.keys(this.manifest)}
 async setSystem(sys,on){if(on)this.enabled.add(sys);else this.enabled.delete(sys);
  if(on&&!this.groups.has(sys)){this.status("Loading "+sys+" anatomy…");try{const gltf=await this.loader.loadAsync(this.manifest[sys]);let g=new THREE.Group();this.scene.add(g);let meshes=[];gltf.scene.traverse(x=>{if(x.isMesh&&x.geometry)meshes.push(x)});
  if(!meshes.length)throw Error("No individually selectable meshes were found");
  for(const m of meshes){m.updateMatrixWorld(true);g.attach(m);const name=m.userData?.za_name||m.name||"Unnamed structure",key=sys+"::"+name;
   if(!this.registry.has(key))this.registry.set(key,{key,name,system:sys,meshes:[],hidden:false,ghost:false});
   this.registry.get(key).meshes.push(m);m.userData.atlasKey=key;m.userData.original=m.material;
  }this.groups.set(sys,g);if(this.groups.size===1)this.fitAll();this.status(sys+" loaded: "+meshes.length+" meshes")}
  catch(e){this.enabled.delete(sys);this.status(sys+" failed to load: "+e.message,true)}}
  this.apply();this.changed(this);
 }
 apply(){for(const x of this.registry.values()){let visible=this.enabled.has(x.system)&&!x.hidden&&(!this.isolated||x.key===this.isolated);for(const m of x.meshes){m.visible=visible;const orig=m.userData.original;
  if(visible&&(x.key===this.selected||x.ghost)){const arr=(Array.isArray(orig)?orig:[orig]).map(o=>{const c=o.clone();if(x.ghost){c.transparent=true;c.opacity=.18;c.depthWrite=false}if(x.key===this.selected){c.emissive=new THREE.Color("#1fbbaa");c.emissiveIntensity=.5}return c});m.material=Array.isArray(orig)?arr:arr[0]}else m.material=orig;}}
  this.changed(this)}
 visibleEntries(){return [...this.registry.values()].filter(x=>this.enabled.has(x.system)&&!x.hidden&&(!this.isolated||this.isolated===x.key))}
 pick(e){const b=this.renderer.domElement.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.raycaster.setFromCamera(p,this.camera);const a=this.raycaster.intersectObjects([...this.registry.values()].flatMap(x=>x.meshes).filter(x=>x.visible));if(a.length)this.select(a[0].object.userData.atlasKey)}
 select(key){this.selected=key;this.apply()}
 snapshot(){this.history.push({selected:this.selected,isolated:this.isolated,enabled:[...this.enabled],data:[...this.registry.values()].filter(e=>e.hidden||e.ghost).map(e=>[e.key,e.hidden,e.ghost])});if(this.history.length>30)this.history.shift()}
 undo(){const x=this.history.pop();if(!x)return;this.selected=x.selected;this.isolated=x.isolated;this.enabled=new Set(x.enabled);for(const e of this.registry.values()){e.hidden=false;e.ghost=false}for(const [k,h,g]of x.data){const e=this.registry.get(k);if(e){e.hidden=h;e.ghost=g}}this.apply()}
 act(action){if(action==="showAll"){this.snapshot();this.isolated=null;for(const x of this.registry.values()){x.hidden=false;x.ghost=false}this.apply();return}const e=this.registry.get(this.selected);if(!e)return;this.snapshot();if(action==="hide"){e.hidden=true;this.selected=null}if(action==="isolate")this.isolated=this.isolated===e.key?null:e.key;if(action==="ghost")e.ghost=!e.ghost;if(action==="focus")this.focus(e);this.apply()}
 boxFocus(b){if(b.isEmpty())return;const size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,.01),dist=span/(2*Math.tan(this.camera.fov*Math.PI/360))*1.6;this.controls.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(0,0,dist));this.camera.near=Math.max(.000001,dist/1000);this.camera.far=dist*1000;this.camera.updateProjectionMatrix();this.controls.update()}
 focus(e){const b=new THREE.Box3();for(const m of e.meshes)b.expandByObject(m);this.boxFocus(b)}
 fitAll(){const b=new THREE.Box3();for(const x of this.registry.values())for(const m of x.meshes)b.expandByObject(m);this.boxFocus(b)}
 view(which){this.fitAll();const c=this.controls.target,d=this.camera.position.distanceTo(c);if(which==="back")this.camera.position.set(c.x,c.y,c.z-d);if(which==="side")this.camera.position.set(c.x+d,c.y,c.z);this.controls.update()}
 find(q,sys){const a=q.toLowerCase().trim();return [...this.registry.values()].find(x=>(!sys||x.system===sys)&&x.name.toLowerCase().includes(a))}
 async findAndFocus(q,sys){if(sys&&!this.groups.has(sys))await this.setSystem(sys,true);const e=this.find(q,sys);if(!e)return false;this.enabled.add(e.system);e.hidden=false;this.isolated=null;this.select(e.key);this.focus(e);return true}
}