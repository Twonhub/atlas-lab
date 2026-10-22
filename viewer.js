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
  this.controls.enablePan=true;this.controls.screenSpacePanning=true;this.controls.zoomToCursor=true;
  this.controls.rotateSpeed=.65;this.controls.panSpeed=1.05;this.controls.zoomSpeed=1.15;
  this.controls.minPolarAngle=.005;this.controls.maxPolarAngle=Math.PI-.005;
  this.controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
  this.panMode=false;this.labelHit=null;this.labelKey=null;
  this.callout=document.createElement("div");this.callout.id="selectedCallout";this.callout.hidden=true;
  this.callout.innerHTML='<span class="label-dot"></span><span class="label-name"></span>';
  root.append(this.callout);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x4d697a,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,3,6);this.scene.add(light);
  this.raycaster=new THREE.Raycaster();this.loader=new GLTFLoader();const draco=new DRACOLoader();draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/libs/draco/");this.loader.setDRACOLoader(draco);
  let start;this.renderer.domElement.addEventListener("pointerdown",e=>start=[e.clientX,e.clientY]);
  this.renderer.domElement.addEventListener("pointerup",e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])<5)this.pick(e)});
  new ResizeObserver(()=>this.resize()).observe(root);this.resize();this.animate();
 }
 resize(){let w=this.root.clientWidth,h=this.root.clientHeight;if(w&&h){this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)}}
 animate(){this.controls.update();this.renderer.render(this.scene,this.camera);this.updateCallout();requestAnimationFrame(()=>this.animate())}
 updateCallout(){
  const entry=this.registry.get(this.selected);
  if(!entry || !entry.meshes.some(m=>m.visible)){this.callout.hidden=true;return}
  const box=new THREE.Box3();for(const m of entry.meshes)if(m.visible)box.expandByObject(m);
  if(box.isEmpty()){this.callout.hidden=true;return}
  // A label is tied to an actual surface ray hit, never to the center of the
  // entire body or to an approximate anatomical region.
  let point=null;
  if(this.labelHit?.key===entry.key&&this.labelHit.mesh?.visible){
    point=this.labelHit.mesh.localToWorld(this.labelHit.local.clone());
  }else{
    const direction=box.getCenter(new THREE.Vector3()).sub(this.camera.position);
    const dist=direction.length();
    if(dist>0){
      this.raycaster.set(this.camera.position,direction.normalize());
      const candidates=this.raycaster.intersectObjects(entry.meshes.filter(m=>m.visible),false);
      if(candidates.length)point=candidates[0].point;
    }
    if(!point){
      // Select a visible mesh center (not an aggregate across distant parts).
      const mesh=entry.meshes.filter(m=>m.visible).sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).distanceToSquared(this.camera.position)-b.getWorldPosition(new THREE.Vector3()).distanceToSquared(this.camera.position))[0];
      if(mesh){const b=new THREE.Box3().setFromObject(mesh);point=b.getCenter(new THREE.Vector3())}
    }
  }
  if(!point){this.callout.hidden=true;return}
  const ndc=point.clone().project(this.camera);
  const forward=new THREE.Vector3();this.camera.getWorldDirection(forward);
  if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y)||ndc.z>1||ndc.z< -1||ndc.x< -1||ndc.x>1||ndc.y< -1||ndc.y>1||point.clone().sub(this.camera.position).dot(forward)<=0){this.callout.hidden=true;return}
  const x=(ndc.x+1)*this.root.clientWidth/2,y=(1-ndc.y)*this.root.clientHeight/2;
  this.callout.hidden=false;
  this.callout.style.left=x+"px";
  this.callout.style.top=y+"px";
  this.callout.classList.toggle("flip-left",x>this.root.clientWidth-270);
  this.callout.classList.toggle("flip-up",y>this.root.clientHeight-75);
  this.callout.querySelector(".label-name").textContent=entry.name+" · "+entry.system;
 }
 enableUnifiedNavigation(){
   this.tool="unified";this.panMode=false;
   this.controls.enabled=true;this.controls.enableRotate=true;this.controls.enablePan=true;this.controls.enableZoom=true;
   this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};
   this.controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
   this.controls.enableDamping=true;this.controls.dampingFactor=.095;
   this.controls.rotateSpeed=.72;this.controls.panSpeed=1.05;this.controls.zoomSpeed=1.15;
   this.controls.zoomToCursor=true;this.controls.screenSpacePanning=true;
   this.renderer.domElement.style.cursor="grab";
   this.renderer.domElement.tabIndex=0;
   this.renderer.domElement.setAttribute("aria-label","Interactive 3D anatomy. Left drag rotates, right or Shift drag pans, wheel zooms, Option drag pulls anatomy.");
 }
 orbitKeyboard(horizontal,vertical){
   const center=this.controls.target;
   const offset=this.camera.position.clone().sub(center);
   if(offset.lengthSq()<1e-12)return;
   const up=this.camera.up.clone().normalize();
   offset.applyAxisAngle(up,horizontal);
   let right=new THREE.Vector3().crossVectors(up,offset).normalize();
   if(right.lengthSq()<1e-10)right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0).normalize();
   const rotated=offset.clone().applyAxisAngle(right,vertical);
   const polar=rotated.clone().normalize().dot(up);
   if(Math.abs(polar)<.995)offset.copy(rotated);
   this.camera.position.copy(center).add(offset);
   this.camera.lookAt(center);
   this.controls.update();
   this.updateClipping()
 }
 viewPreset(name){
   const presets={
    anterior:[[0,0,1],[0,1,0]],posterior:[[0,0,-1],[0,1,0]],
    right:[[1,0,0],[0,1,0]],left:[[-1,0,0],[0,1,0]],
    superior:[[0,1,0],[0,0,-1]],inferior:[[0,-1,0],[0,0,1]],
    oblique:[[.72,.22,1],[0,1,0]]
   };
   const preset=presets[name];if(!preset)return false;
   const target=this.controls.target.clone();
   const radius=Math.max(this.camera.position.distanceTo(target),this.controls.minDistance*3,0.01);
   const goal=new THREE.Vector3(...preset[0]).normalize().multiplyScalar(radius).add(target);
   const up=new THREE.Vector3(...preset[1]);
   this.controls.minPolarAngle=0;this.controls.maxPolarAngle=Math.PI;
   this.camera.position.copy(goal);this.camera.up.copy(up);
   this.camera.lookAt(target);
   this.controls.update();
   this.updateClipping();
   this.labelHit=null;
   return true;
 }
 zoom(factor){const offset=this.camera.position.clone().sub(this.controls.target);
   const d=offset.length(),next=Math.max(this.controls.minDistance||.000001,Math.min(this.controls.maxDistance||1e9,d*factor));
   offset.setLength(next);this.camera.position.copy(this.controls.target).add(offset);this.controls.update();this.updateClipping()}
 pan(dx,dy){
   const pixels=this.root.clientHeight||500;
   const units=this.camera.position.distanceTo(this.controls.target)*2*Math.tan(this.camera.fov*Math.PI/360)/pixels;
   const right=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,0);
   const up=new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld,1);
   const delta=right.multiplyScalar(dx*units).addScaledVector(up,dy*units);
   this.camera.position.add(delta);this.controls.target.add(delta);this.controls.update()
 }
 updateClipping(){const d=this.camera.position.distanceTo(this.controls.target);this.camera.near=Math.max(.0000001,d/10000);this.camera.far=Math.max(1,d*1500);this.camera.updateProjectionMatrix()}
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
 visibleEntries(){return [...this.registry.values()].filter(x=>this.enabled.has(x.system)&&!x.hidden&&(!this.isolated||this.isolated===x.key)&&(!this.regionFilter||this.regionFilter.has(x.key)))}
 pick(e,toggle=true){const b=this.renderer.domElement.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.raycaster.setFromCamera(p,this.camera);const a=this.raycaster.intersectObjects([...this.registry.values()].flatMap(x=>x.meshes).filter(x=>x.visible),false);this.pickedFromCanvas=true;try{if(a.length)this.select(a[0].object.userData.atlasKey,toggle,a[0]);else this.select(null)}finally{this.pickedFromCanvas=false}}
 select(key,toggle=false,hit=null){
   const next=toggle&&this.selected===key?null:key;
   if(next!==this.selected||!next)this.labelHit=null;
   this.selected=next;
   if(next&&hit?.object&&hit?.point){hit.object.updateWorldMatrix(true,false);
     this.labelHit={key:next,mesh:hit.object,local:hit.object.worldToLocal(hit.point.clone())};
   }
   this.apply();this.onRegionSelectionChanged?.();
 }
 snapshot(){this.history.push({selected:this.selected,isolated:this.isolated,enabled:[...this.enabled],data:[...this.registry.values()].filter(e=>e.hidden||e.ghost).map(e=>[e.key,e.hidden,e.ghost])});if(this.history.length>30)this.history.shift()}
 undo(){const x=this.history.pop();if(!x)return;this.selected=x.selected;this.isolated=x.isolated;this.enabled=new Set(x.enabled);for(const e of this.registry.values()){e.hidden=false;e.ghost=false}for(const [k,h,g]of x.data){const e=this.registry.get(k);if(e){e.hidden=h;e.ghost=g}}this.apply()}
 act(action){if(action==="showAll"){this.snapshot();this.isolated=null;for(const x of this.registry.values()){x.hidden=false;x.ghost=false}this.apply();return}const e=this.registry.get(this.selected);if(!e)return;this.snapshot();if(action==="hide"){e.hidden=true;this.selected=null}if(action==="isolate")this.isolated=this.isolated===e.key?null:e.key;if(action==="ghost")e.ghost=!e.ghost;if(action==="focus")this.focus(e);this.apply()}
 boxFocus(b){if(b.isEmpty())return;const size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,.01),dist=span/(2*Math.tan(this.camera.fov*Math.PI/360))*1.6;this.controls.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(0,0,dist));this.controls.minDistance=Math.max(.0000001,span*.002);this.controls.maxDistance=span*100;this.updateClipping();this.controls.update()}
 focus(e){const b=new THREE.Box3();for(const m of e.meshes)b.expandByObject(m);this.boxFocus(b);this.labelHit=null}
 fitAll(){const b=new THREE.Box3();for(const x of this.visibleEntries())for(const m of x.meshes)b.expandByObject(m);this.boxFocus(b)}
 view(which){this.fitAll();const c=this.controls.target,d=this.camera.position.distanceTo(c);if(which==="back")this.camera.position.set(c.x,c.y,c.z-d);if(which==="side")this.camera.position.set(c.x+d,c.y,c.z);this.controls.update()}
 find(q,sys){const a=q.toLowerCase().trim();return [...this.registry.values()].find(x=>(!sys||x.system===sys)&&x.name.toLowerCase().includes(a))}
 async findAndFocus(q,sys,{toggle=false}={}){if(sys&&!this.groups.has(sys))await this.setSystem(sys,true);const e=this.find(q,sys);if(!e)return false;
   if(toggle&&this.selected===e.key){this.select(null);return {entry:e,deselected:true}}
   this.enabled.add(e.system);e.hidden=false;this.isolated=null;
   if(this.activeRegion&&this.activeRegion!=="whole"&&this.regionFilter&&!this.regionFilter.has(e.key)){this.clearRegion?.()}
   this.select(e.key);this.focus(e);return {entry:e,deselected:false}
 }
}