import * as THREE from "three";

/* Region navigation is derived from licensed anatomical meshes, not a synthetic 2D map.
   The anchors are deliberately named structures. If no anchor exists, no region is invented. */
export const REGIONS=[
 ["whole","Whole body",[]],
 ["skull","Skull & cranial bones",["frontal bone","parietal bone","temporal bone","occipital bone","sphenoid","ethmoid","mandible","maxilla","zygomatic","nasal bone","lacrimal","vomer","palatine bone"]],
 ["neck","Neck & cervical spine",["cervical vertebra","vertebra c","atlas","axis","hyoid"]],
 ["shoulder","Shoulder girdle",["clavicle","scapula","humerus"]],
 ["upperarm","Upper arm",["humerus"]],
 ["elbow","Elbow",["humerus","radius","ulna"]],
 ["forearm","Forearm",["radius","ulna"]],
 ["wrist","Wrist / carpals",["scaphoid","lunate","triquetrum","pisiform","trapezium","trapezoid","capitate","hamate"]],
 ["hand","Hand & fingers",["scaphoid","lunate","triquetrum","pisiform","trapezium","trapezoid","capitate","hamate","metacarp","phalange","phalanx"]],
 ["thorax","Chest & ribs",["sternum","rib","thoracic vertebra","vertebra t"]],
 ["heart","Heart & cardiac chambers",["left atrium","right atrium","left ventricle","right ventricle"]],
 ["abdomen","Abdomen",["lumbar vertebra","vertebra l"]],
 ["spine","Vertebral column",["vertebra","atlas","axis","sacrum","coccyx"]],
 ["pelvis","Pelvis & hip",["ilium","ischium","pubis","pelvis","hip bone","sacrum"]],
 ["thigh","Thigh",["femur"]],
 ["knee","Knee",["patella","distal femur","proximal tibia"]],
 ["leg","Lower leg",["tibia","fibula"]],
 ["ankle","Ankle / tarsals",["talus","calcaneus","navicular","cuboid","cuneiform"]],
 ["foot","Foot & toes",["talus","calcaneus","navicular","cuboid","cuneiform","metatars","phalange","phalanx"]]
];
const normalize=s=>String(s||"").toLowerCase().replace(/[_\-.]+/g," ").replace(/\s+/g," ").trim();
const alias=(a,term)=>a===term||a.startsWith(term+" ")||a.endsWith(" "+term)||a.includes(" "+term+" ")||(term.length>=4&&a.includes(term));
export function installRegions(viewer,notify) {
 viewer.activeRegion="whole";viewer.regionFilter=null;viewer.regionList=[];
 let pending=0;
 const select=document.getElementById("regionSelect"), sys=document.getElementById("regionSystem"), info=document.getElementById("regionInfo"), list=document.getElementById("regionMeshList");
 const clear=document.getElementById("regionClear"),sideSelect=document.getElementById("regionSide");
 select.innerHTML="";for(const [id,title] of REGIONS){const option=document.createElement("option");option.value=id;option.textContent=title;select.append(option)}
 const populate=()=>{const current=sys.value;sys.innerHTML="";for(const name of viewer.systems()){const o=document.createElement("option");o.value=name;o.textContent=name==="Visceral"?"Organs":name;sys.append(o)}if([...sys.options].some(o=>o.value===current))sys.value=current};
 populate();
 const meshBounds=e=>{const b=new THREE.Box3();for(const m of e.meshes){m.updateWorldMatrix(true,false);b.expandByObject(m)}return b};
 function renderList(){
   list.replaceChildren();const matches=viewer.regionList;
   const selected=viewer.selected;
   for(const e of matches.slice(0,300)){
     const b=document.createElement("button");b.type="button";b.className="region-entry"+(selected===e.key?" active":"");b.textContent=e.name;b.title=e.system+" — click again to deselect";
     b.onclick=()=>{if(viewer.selected===e.key){viewer.select(null);return}e.hidden=false;viewer.select(e.key);viewer.focus(e);};
     list.append(b)
   }
   if(matches.length>300){let el=document.createElement("div");el.className="muted";el.textContent="Showing first 300 parts. Use Search structure to find others.";list.append(el)}
 }
 viewer.refreshRegionList=()=>{if(viewer.activeRegion==="whole"){viewer.regionList=[];renderList();return}const system=sys.value;viewer.regionList=[...viewer.registry.values()].filter(e=>e.system===system&&viewer.regionFilter?.has(e.key)).sort((a,b)=>a.name.localeCompare(b.name));renderList()};
 const baseApply=viewer.apply.bind(viewer);
 viewer.apply=(...args)=>{baseApply(...args)};
 viewer.clearRegion=()=>{viewer.activeRegion="whole";viewer.regionFilter=null;viewer.regionList=[];select.value="whole";
 if(viewer.setExplodeScope){viewer.setExplodeScope("whole");document.getElementById("explodeScope").value="whole";
  document.getElementById("explodeSlider").value=0;document.getElementById("explodeValue").textContent="0%"}
 info.textContent="Whole body • all visible anatomy. Use the Dissect / Separate slider to spread structures, or select an anatomical region for a close-up.";viewer.apply()};
 async function go(){
   const token=++pending;
   const region=select.value,requestedSystem=sys.value,side=sideSelect.value;
   if(region==="whole"){viewer.clearRegion();viewer.fitAll();return true}
   const regionDef=REGIONS.find(r=>r[0]===region);
   if(!regionDef){info.textContent="Select a valid anatomical region.";return false}
   const heart=region==="heart";
   info.textContent="Loading and focusing "+regionDef[1]+"…";
   try{
     // Hide model movement before computing world-space bounds. A previous
     // explosion can otherwise cause a region to be focused on empty space.
     if(viewer.explodeAmount>0)viewer.setExplosion(0);
     if(!viewer.groups.has("Skeleton"))await viewer.setSystem("Skeleton",true);
     if(heart&&!viewer.groups.has("Cardiovascular"))await viewer.setSystem("Cardiovascular",true);
     if(requestedSystem!=="Skeleton"&&!viewer.groups.has(requestedSystem))await viewer.setSystem(requestedSystem,true);
     if(token!==pending)return false;
     const skeletal=[...viewer.registry.values()].filter(e=>e.system==="Skeleton");
     const anchors=heart?[...viewer.registry.values()].filter(e=>e.system==="Cardiovascular"):skeletal;
     if(!skeletal.length||!anchors.length){
       info.textContent="This model layer did not load. Check the model status and reload if necessary.";
       notify(info.textContent);return false
     }
     const terms=regionDef[2];
     let matched=anchors.filter(e=>terms.some(t=>alias(normalize(e.name),t)));
     const lateral=new Set(["shoulder","upperarm","elbow","forearm","wrist","hand","pelvis","thigh","knee","leg","ankle","foot"]);
     const bilateral=lateral.has(region);
     if(bilateral&&side!=="both"){
       matched=matched.filter(e=>e.name.toLowerCase().endsWith(side==="left"?".l":".r"));
     }
     if(!matched.length){
       info.textContent="No matching 3D anchor found for "+regionDef[1]+" ("+side+"). Try Both sides or a different system.";
       notify(info.textContent);return false
     }
     // IMPORTANT: left and right wrists / hands must not form one enormous
     // selection box running through the torso. Use an independent bounds
     // volume for each side, then union only their camera framing bounds.
     const groups=[];
     if(bilateral&&side==="both"){
       for(const suffix of [".l",".r"]){
         const chunk=matched.filter(e=>e.name.toLowerCase().endsWith(suffix));
         if(chunk.length)groups.push(chunk)
       }
       const unpaired=matched.filter(e=>!/\.(l|r)$/i.test(e.name));
       if(unpaired.length)groups.push(unpaired)
     }else groups.push(matched);
     const bodyBounds=new THREE.Box3();
     for(const e of skeletal)bodyBounds.union(meshBounds(e));
     const bodySpan=Math.max(.01,bodyBounds.getSize(new THREE.Vector3()).length());
     const joint={elbow:["humerus","radius"],knee:["femur","tibia"],shoulder:["humerus","clavicle"]};
     const localBoxes=[];
     for(const members of groups){
       const box=new THREE.Box3();
       for(const e of members)box.union(meshBounds(e));
       if(box.isEmpty())continue;
       // Long bones span entire limbs. Limit joint views near the articulation.
       if(joint[region]){
         const [a,b]=joint[region];
         const ea=members.filter(e=>normalize(e.name).includes(a));
         const eb=members.filter(e=>normalize(e.name).includes(b));
         if(ea.length&&eb.length){
           const aa=new THREE.Box3(),bb=new THREE.Box3();
           for(const e of ea)aa.union(meshBounds(e));
           for(const e of eb)bb.union(meshBounds(e));
           const level=region==="shoulder"?(aa.max.y+bb.getCenter(new THREE.Vector3()).y)/2:(aa.min.y+bb.max.y)/2;
           const half=bodyBounds.getSize(new THREE.Vector3()).y*.05;
           box.min.y=level-half;box.max.y=level+half;
         }
       }
       if(box.isEmpty())continue;
       const extent=box.getSize(new THREE.Vector3()).length();
       const pad=Math.max(bodySpan*.0035,extent*(heart?.20:.09));
       box.expandByScalar(pad);
       localBoxes.push(box)
     }
     if(!localBoxes.length){info.textContent="Could not calculate the 3D position of this region.";return false}
     const viewBox=new THREE.Box3();for(const b of localBoxes)viewBox.union(b);
     function entriesFor(system){
       const selected=new Set();
       for(const e of viewer.registry.values()){
         if(e.system!==system)continue;
         const b=meshBounds(e);
         if(b.isEmpty())continue;
         const center=b.getCenter(new THREE.Vector3());
         for(const volume of localBoxes){
           const size=b.getSize(new THREE.Vector3()).length();
           const fits=volume.containsPoint(center)||(volume.intersectsBox(b)&&size<volume.getSize(new THREE.Vector3()).length()*1.6);
           if(fits){selected.add(e.key);break}
         }
       }
       // Always retain named anchor bones for Skeletal, even when boundaries
       // at a joint are tight; otherwise key wrist bones can disappear.
       if(system==="Skeleton"&&!heart){
         for(const e of matched)selected.add(e.key)
       }
       // Cardiac chambers are the required heart anchors.
       if(system==="Cardiovascular"&&heart){
         for(const e of matched)selected.add(e.key)
       }
       return selected
     }
     let usedSystem=requestedSystem,allowed=entriesFor(usedSystem);
     if(!allowed.size&&usedSystem!=="Skeleton"&&!heart){
       // Never silently reset the BODY REGION selector back to Whole body.
       // Offer a reliable skeletal view if a selected tissue system has no
       // individually modeled objects in this specific 3D area.
       usedSystem="Skeleton";allowed=entriesFor(usedSystem);
     }
     if(!allowed.size){
       info.textContent="The "+requestedSystem+" source model has no selectable structures here. Try Skeleton or another anatomical system.";
       notify(info.textContent);return false
     }
     viewer.activeRegion=region;viewer.regionFilter=allowed;
     viewer.enabled=new Set([usedSystem]);viewer.isolated=null;
     if(viewer.selected&&!allowed.has(viewer.selected))viewer.selected=null;
     sys.value=usedSystem;
     if(viewer.setExplodeScope){
       viewer.setExplodeScope("region");
       document.getElementById("explodeScope").value="region";
       document.getElementById("explodeSlider").value=0;
       document.getElementById("explodeValue").textContent="0%"
     }
     viewer.apply();viewer.refreshRegionList();
     viewer.boxFocus(viewBox);
     info.textContent=regionDef[1]+" · "+usedSystem+" · "+(bilateral?side+" side":side)+
       " · "+allowed.size+" selectable parts"+(usedSystem!==requestedSystem?" (No "+requestedSystem+" mesh here; showing Skeleton instead)":"");
     return true
   }catch(err){
     console.error("Atlas Lab region navigation",err);
     info.textContent="This region could not be opened: "+(err?.message||String(err));
     notify(info.textContent);return false
   }
 }
 document.getElementById("regionJump").onclick=go;
 select.onchange=()=>{const lateral=new Set(["shoulder","upperarm","elbow","forearm","wrist","hand","pelvis","thigh","knee","leg","ankle","foot"]);
  if(select.value==="heart")sys.value="Cardiovascular";
  else if(select.value!=="whole")sys.value="Skeleton";
  if(lateral.has(select.value)&&sideSelect.value==="both")sideSelect.value="left";
  go();
};sys.onchange=go;sideSelect.onchange=go;
 clear.onclick=()=>{viewer.clearRegion();viewer.fitAll()};
 viewer.navigateRegion=async(region,system="Skeleton")=>{if(!REGIONS.find(r=>r[0]===region))return false;select.value=region;sys.value=system;return go()};
 viewer.openSelectedRegion=async()=>{
   const part=viewer.registry.get(viewer.selected);
   if(!part)return false;
   const name=normalize(part.name);
   let id=null;
   if(part.system==="Cardiovascular"&&/\b(heart|atrium|ventricle|coronary)\b/.test(name))id="heart";
   else{
     // Prefer smaller and more specific regions for named skeletal parts.
     const prioritized=["wrist","hand","ankle","foot","skull","neck","elbow","knee","shoulder","forearm","upperarm","thigh","leg","thorax","pelvis","spine","abdomen"];
     for(const rid of prioritized){
       const entry=REGIONS.find(r=>r[0]===rid);
       if(entry?.[2].some(t=>alias(name,t))){id=rid;break}
     }
   }
   if(!id)return false;
   if(part.name.toLowerCase().endsWith(".l"))sideSelect.value="left";
   else if(part.name.toLowerCase().endsWith(".r"))sideSelect.value="right";
   return viewer.navigateRegion(id,part.system)
 };

 viewer.onRegionSelectionChanged=()=>{if(viewer.activeRegion!=="whole")renderList()};
 window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){viewer.select(null)}});
 info.textContent="Choose a body region and system to examine its component structures.";
 return {go};
}
