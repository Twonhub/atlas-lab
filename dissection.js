import * as THREE from "three";

// Controls move the original licensed meshes. They do not generate substitute anatomy.
export function installDissection(viewer,notify) {
  const originalSet=viewer.setSystem.bind(viewer);
  const homes=new Map(),centers=new Map();
  let anchor=null,height=1,drag=null;
  viewer.explodeAmount=0;viewer.explodeScope="selected";viewer.grabMode=false;viewer.highContrast=false;
  const canvas=viewer.renderer.domElement;
  viewer.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  viewer.renderer.toneMappingExposure=1.15;
  viewer.scene.background.set(0x0e2131);
  const front=new THREE.DirectionalLight(0xffe6c7,1.7);front.position.set(2,5,6);viewer.scene.add(front);
  const rim=new THREE.DirectionalLight(0x9bcaff,1.2);rim.position.set(-4,3,-5);viewer.scene.add(rim);
  function prepare(){
    for(const e of viewer.registry.values())if(!centers.has(e.key)){
      const box=new THREE.Box3();
      for(const m of e.meshes){if(!homes.has(m))homes.set(m,m.position.clone());box.expandByObject(m)}
      if(!box.isEmpty())centers.set(e.key,box.getCenter(new THREE.Vector3()));
    }
    if(!anchor){
      const b=new THREE.Box3();
      for(const e of viewer.registry.values())if(e.system==="Skeleton")for(const m of e.meshes)b.expandByObject(m);
      if(!b.isEmpty()){anchor=b.getCenter(new THREE.Vector3());height=Math.max(.01,b.getSize(new THREE.Vector3()).y)}
    }
  }
  function dimensions(e){
    const box=new THREE.Box3();
    for(const m of e.meshes)box.expandByObject(m);
    return Math.max(box.getSize(new THREE.Vector3()).length(),height*.008);
  }
  function currentRegion(){
    const members=[...viewer.registry.values()].filter(e=>viewer.regionFilter?.has(e.key)&&viewer.enabled.has(e.system));
    if(!members.length)return null;
    const bb=new THREE.Box3();for(const e of members){const pos=centers.get(e.key);if(pos)bb.expandByPoint(pos)}
    if(bb.isEmpty())return null;
    return {members,center:bb.getCenter(new THREE.Vector3()),extent:Math.max(bb.getSize(new THREE.Vector3()).length(),height*.08)};
  }
  let regionCache=null;
  function shift(e){
    const result=e.pullOffset?e.pullOffset.clone():new THREE.Vector3();
    if(viewer.explodeAmount<=0)return result;
    if(viewer.explodeScope==="selected"){
      if(e.key!==viewer.selected)return result;
      const size=dimensions(e);
      // Move the chosen structure laterally into an inspection zone, without
      // disturbing its neighboring bones, muscles, vessels or organs.
      const right=new THREE.Vector3().setFromMatrixColumn(viewer.camera.matrixWorld,0);
      result.addScaledVector(right,viewer.explodeAmount*size*.55);
    }else if(viewer.explodeScope==="region"){
      if(!viewer.regionFilter?.has(e.key))return result;
      const data=regionCache;if(!data)return result;
      const center=centers.get(e.key);if(!center)return result;
      const dir=center.clone().sub(data.center);
      // Preserve anatomical relationships: move only parts inside the chosen
      // region and scale displacement to that region, not the whole skeleton.
      if(dir.lengthSq()<data.extent*data.extent*.00005){
        let h=0;for(const ch of e.key)h=(h*31+ch.charCodeAt(0))>>>0;
        const theta=(h%360)*Math.PI/180;dir.set(Math.cos(theta),Math.sin(theta),Math.sin(theta*.7));
      }
      dir.normalize();
      result.addScaledVector(dir,viewer.explodeAmount*data.extent*.32);
    }
    return result;
  }
  function move(e){const offset=shift(e);for(const m of e.meshes){const p=homes.get(m);if(p)m.position.copy(p).add(offset)}}
  viewer.apply=function(){
    prepare();
    regionCache=viewer.explodeScope==="region"&&viewer.explodeAmount>0?currentRegion():null;
    for(const e of viewer.registry.values()){
      move(e);
      const visible=viewer.enabled.has(e.system)&&!e.hidden&&(!viewer.isolated||viewer.isolated===e.key)&&(!viewer.regionFilter||viewer.regionFilter.has(e.key));
      for(const m of e.meshes){
        m.visible=visible;const original=m.userData.original;
        if(!visible||(!e.ghost&&viewer.selected!==e.key)){m.material=original;continue}
        const kind=viewer.selected===e.key?"selected":"ghost";
        const cache=m.userData.labMaterials||(m.userData.labMaterials={});
        if(!cache[kind]){
          const source=Array.isArray(original)?original:[original];
          const mats=source.map(o=>{const c=o.clone();if(kind==="selected"){if(c.emissive){c.emissive.set(0xf7c84b);c.emissiveIntensity=.85}if(c.color)c.color.lerp(new THREE.Color(0xffeaa2),.62)}if(kind==="ghost"){c.transparent=true;c.opacity=.16;c.depthWrite=false}return c});
          cache[kind]=Array.isArray(original)?mats:mats[0];
        }
        m.material=cache[kind];
      }
    }
    viewer.changed(viewer);
  };
  viewer.setSystem=async(...args)=>{await originalSet(...args);prepare();viewer.apply()};
  prepare();viewer.apply();
  viewer.setExplosion=value=>{
   const amount=Math.max(0,Math.min(1,Number(value)||0));
   if(amount>0&&viewer.explodeScope==="selected"&&!viewer.selected){
     notify("Select the anatomical structure you want to separate first.");return false
   }
   if(amount>0&&viewer.explodeScope==="region"&&(!viewer.regionFilter||viewer.activeRegion==="whole")){
     notify("Choose Skull, Wrist, or another body region before separating its parts.");return false
   }
   viewer.explodeAmount=amount;viewer.apply();return true
 };
 viewer.setExplodeScope=scope=>{
   viewer.explodeScope=scope==="region"?"region":"selected";
   viewer.explodeAmount=0;viewer.apply()
 };
  viewer.pullSelected=()=>{const e=viewer.registry.get(viewer.selected);if(!e)return false;e.pullOffset=e.pullOffset||new THREE.Vector3();const right=new THREE.Vector3().setFromMatrixColumn(viewer.camera.matrixWorld,0);e.pullOffset.addScaledVector(right,dimensions(e)*.30);viewer.apply();return true};
  viewer.returnSelected=()=>{const e=viewer.registry.get(viewer.selected);if(!e)return false;e.pullOffset=new THREE.Vector3();viewer.apply();return true};
  viewer.reassemble=()=>{viewer.explodeAmount=0;viewer.isolated=null;for(const e of viewer.registry.values()){e.hidden=false;e.ghost=false;e.pullOffset=new THREE.Vector3()}viewer.apply();viewer.fitAll()};
  function endDrag(){drag=null;viewer.controls.enabled=true;canvas.style.cursor=viewer.grabMode?"grab":"auto"}
  viewer.setGrabMode=enabled=>{viewer.grabMode=!!enabled;canvas.style.cursor=enabled?"grab":"auto";if(!enabled)endDrag()};
  viewer.setHighContrast=enabled=>{viewer.highContrast=!!enabled;viewer.renderer.toneMappingExposure=enabled?1.65:1.15;viewer.scene.background.set(enabled?0x07111c:0x0e2131)};
  function hit(e){
    const b=canvas.getBoundingClientRect(),v=new THREE.Vector2(2*(e.clientX-b.left)/b.width-1,1-2*(e.clientY-b.top)/b.height);
    viewer.raycaster.setFromCamera(v,viewer.camera);
    return viewer.raycaster.intersectObjects([...viewer.registry.values()].flatMap(x=>x.meshes).filter(x=>x.visible),false)[0]?.object||null;
  }
  canvas.addEventListener("pointerdown",e=>{
    if(!viewer.grabMode||e.button!==0)return;const m=hit(e);if(!m)return;
    viewer.select(m.userData.atlasKey);drag={key:m.userData.atlasKey,x:e.clientX,y:e.clientY};
    viewer.controls.enabled=false;canvas.setPointerCapture?.(e.pointerId);e.stopImmediatePropagation();
  },true);
  canvas.addEventListener("pointermove",e=>{
    if(!drag)return;const entry=viewer.registry.get(drag.key);if(!entry)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
    const scale=2*viewer.camera.position.distanceTo(viewer.controls.target)*Math.tan(viewer.camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight);
    const right=new THREE.Vector3().setFromMatrixColumn(viewer.camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(viewer.camera.matrixWorld,1);
    entry.pullOffset=entry.pullOffset||new THREE.Vector3();entry.pullOffset.addScaledVector(right,dx*scale).addScaledVector(up,-dy*scale);
    move(entry);canvas.style.cursor="grabbing";e.stopImmediatePropagation();
  },true);
  canvas.addEventListener("pointerup",e=>{if(drag){endDrag();e.stopImmediatePropagation()}},true);
  canvas.addEventListener("pointercancel",endDrag,true);
  const norm=s=>String(s||"").toLowerCase().replace(/\.(l|r)$/,"").replace(/[()]/g," ").replace(/[_-]/g," ").replace(/\b(left|right)\b/g," ").replace(/\s+/g," ").trim();
  viewer.locateStudyTarget=async(name,system)=>{
    if(!viewer.groups.has(system))await viewer.setSystem(system,true);
    const alias={"Lungs":["Lung"],"Kidney":["Kidneys"],"Atlas":["C1 vertebra"],"Axis":["C2 vertebra"]};
    const values=[...viewer.registry.values()].filter(x=>x.system===system);
    let entry=null;
    for(const namePart of [name,...(alias[name]||[])]){
      const term=norm(namePart);
      entry=values.find(x=>norm(x.name)===term)||values.find(x=>norm(x.name).startsWith(term+" "))||values.find(x=>norm(x.name).endsWith(" "+term));
      if(entry)break;
    }
    if(!entry)return null;
    viewer.enabled.add(system);entry.hidden=false;viewer.isolated=null;viewer.select(entry.key);viewer.focus(entry);return entry;
  };
  const $=id=>document.getElementById(id);let frame=0;
  $("explodeSlider").oninput=e=>{
    const value=Number(e.target.value);
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      if(viewer.setExplosion(value/100))$("explodeValue").textContent=value+"%";
      else{e.target.value=0;$("explodeValue").textContent="0%"}
    });
  };
  $("explodeScope").onchange=e=>{viewer.setExplodeScope(e.target.value);$("explodeSlider").value=0;$("explodeValue").textContent="0%"};
  $("pullMode").onclick=()=>{viewer.setGrabMode(!viewer.grabMode);$("pullMode").setAttribute("aria-pressed",String(viewer.grabMode));$("pullMode").textContent="✥ Grab & pull: "+(viewer.grabMode?"On":"Off")};
  $("pullSelected").onclick=()=>{if(!viewer.pullSelected())notify("Select a structure first.")};
  $("resetSelected").onclick=()=>{if(!viewer.returnSelected())notify("Select a structure to restore its position.")};
  $("reassemble").onclick=()=>{viewer.reassemble();$("explodeSlider").value=0;$("explodeValue").textContent="0%"};
  $("renderQuality").onclick=()=>{viewer.setHighContrast(!viewer.highContrast);$("renderQuality").setAttribute("aria-pressed",String(viewer.highContrast))};
}
