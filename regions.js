import * as THREE from "three";

/* Region navigation is derived from licensed anatomical meshes, not a synthetic 2D map.
   The anchors are deliberately named structures. If no anchor exists, no region is invented. */
export const REGIONS=[
 ["whole","Whole body",[]],
 ["skull","Skull & cranial bones",["frontal bone","parietal bone","temporal bone","occipital bone","sphenoid","ethmoid","mandible","maxilla","zygomatic","nasal bone","lacrimal","vomer","palatine bone"]],
 ["neck","Neck & cervical spine",["cervical vertebra","atlas","axis","hyoid"]],
 ["shoulder","Shoulder girdle",["clavicle","scapula","humerus"]],
 ["upperarm","Upper arm",["humerus"]],
 ["elbow","Elbow",["humerus","radius","ulna"]],
 ["forearm","Forearm",["radius","ulna"]],
 ["wrist","Wrist / carpals",["scaphoid","lunate","triquetrum","pisiform","trapezium","trapezoid","capitate","hamate"]],
 ["hand","Hand & fingers",["scaphoid","lunate","triquetrum","pisiform","trapezium","trapezoid","capitate","hamate","metacarp","phalange"]],
 ["thorax","Chest & ribs",["sternum","rib","thoracic vertebra"]],
 ["abdomen","Abdomen",["lumbar vertebra"]],
 ["spine","Vertebral column",["vertebra","atlas","axis","sacrum","coccyx"]],
 ["pelvis","Pelvis & hip",["ilium","ischium","pubis","pelvis","hip bone","sacrum"]],
 ["thigh","Thigh",["femur"]],
 ["knee","Knee",["patella","distal femur","proximal tibia"]],
 ["leg","Lower leg",["tibia","fibula"]],
 ["ankle","Ankle / tarsals",["talus","calcaneus","navicular","cuboid","cuneiform"]],
 ["foot","Foot & toes",["talus","calcaneus","navicular","cuboid","cuneiform","metatars","phalange"]]
];
const normalize=s=>String(s||"").toLowerCase().replace(/[_\-.]+/g," ").replace(/\s+/g," ").trim();
const alias=(a,term)=>a===term||a.startsWith(term+" ")||a.endsWith(" "+term)||a.includes(" "+term+" ");
export function installRegions(viewer,notify) {
 viewer.activeRegion="whole";viewer.regionFilter=null;viewer.regionList=[];
 let pending=0;
 const select=document.getElementById("regionSelect"), sys=document.getElementById("regionSystem"), info=document.getElementById("regionInfo"), list=document.getElementById("regionMeshList");
 const clear=document.getElementById("regionClear");
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
 viewer.clearRegion=()=>{viewer.activeRegion="whole";viewer.regionFilter=null;viewer.regionList=[];select.value="whole";info.textContent="Whole body • all visible structures in selected systems";viewer.apply()};
 async function go(){
   const token=++pending;const region=select.value,system=sys.value;
   if(region==="whole"){viewer.clearRegion();viewer.fitAll();return true}
   info.textContent="Locating "+select.selectedOptions[0].textContent+" in the source anatomy…";
   if(!viewer.groups.has("Skeleton"))await viewer.setSystem("Skeleton",true);
   if(system!=="Skeleton"&&!viewer.groups.has(system))await viewer.setSystem(system,true);
   if(token!==pending)return false;
   const regionDef=REGIONS.find(r=>r[0]===region),terms=regionDef[2];
   const skeletal=[...viewer.registry.values()].filter(e=>e.system==="Skeleton");
   let matches=skeletal.filter(e=>terms.some(t=>alias(normalize(e.name),t)));
   if(region==="elbow"||region==="knee"){matches=matches.filter(e=>!e.name.toLowerCase().includes("phalange"))}
   if(!matches.length){
     info.textContent="No named skeletal anchors found for this region. The atlas may use different names.";
     viewer.clearRegion();notify("No confirmed model anchors for "+regionDef[1]+". Try searching a bone by name.");return false;
   }
   const box=new THREE.Box3();for(const e of matches)box.union(meshBounds(e));
   if(box.isEmpty()){info.textContent="Region mesh bounds unavailable.";return false}
   const body=new THREE.Box3();for(const e of skeletal)body.union(meshBounds(e));
   const h=Math.max(.01,body.getSize(new THREE.Vector3()).length());
   const pad=Math.max(h*.008,box.getSize(new THREE.Vector3()).length()*.065);
   box.expandByScalar(pad);
   /* Exclude long anchor bones extending beyond the region by using spatial limits for
      elbow, shoulder and knee only when there are multiple anchor bones. */
   viewer.activeRegion=region;
   const allowed=new Set();
   for(const e of viewer.registry.values()){
     if(e.system!==system)continue;
     const b=meshBounds(e),center=b.getCenter(new THREE.Vector3());
     if(box.containsPoint(center)||box.intersectsBox(b)&&b.getSize(new THREE.Vector3()).length()<box.getSize(new THREE.Vector3()).length()*1.8)allowed.add(e.key)
   }
   if(!allowed.size){viewer.regionFilter=null;viewer.activeRegion="whole";info.textContent="No "+system+" meshes found in this area. Change the system or region.";notify(info.textContent);viewer.apply();return false}
   viewer.regionFilter=allowed;viewer.enabled=new Set([system]);viewer.isolated=null;
   if(viewer.selected&&!allowed.has(viewer.selected))viewer.selected=null;
   viewer.apply();viewer.refreshRegionList();viewer.boxFocus(box);
   info.textContent=regionDef[1]+" · "+system+" · "+allowed.size+" selectable structures (spatial estimate from source models)";
   return true
 }
 document.getElementById("regionJump").onclick=go;
 select.onchange=go;sys.onchange=go;
 clear.onclick=()=>{viewer.clearRegion();viewer.fitAll()};
 viewer.navigateRegion=async(region,system="Skeleton")=>{if(!REGIONS.find(r=>r[0]===region))return false;select.value=region;sys.value=system;return go()};
 viewer.onRegionSelectionChanged=()=>{if(viewer.activeRegion!=="whole")renderList()};
 window.addEventListener("keydown",e=>{if(e.key==="Escape"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)){viewer.select(null)}});
 info.textContent="Choose a body region and system to examine its component structures.";
 return {go};
}
