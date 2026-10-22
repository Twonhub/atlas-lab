import {installDissection} from "./dissection.js";
import {installRegions} from "./regions.js";
import {AnatomyViewer} from "./viewer.js";
const $=id=>document.getElementById(id);
let lessonSession=null;
let viewer,study=[],lessons=[],active=0,quiz=[],qi=0,score=0,meshExam=null;let progress={studied:[],notes:{},scores:[]};
try{progress={...progress,...JSON.parse(localStorage.getItem("atlasLabV2")||"{}")}}catch{}
const save=()=>{try{localStorage.setItem("atlasLabV2",JSON.stringify(progress))}catch{}};
function show(page){document.querySelectorAll(".page").forEach(e=>e.classList.toggle("active",e.id==="page-"+page));document.querySelectorAll(".nav").forEach(e=>e.classList.toggle("active",e.dataset.page===page));$("pageHeading").textContent={lab:"Virtual Dissection Lab",lessons:"Guided Lessons",cards:"Anatomy Library",quiz:"Practice Exam",progress:"My Progress",sources:"Sources & Accuracy"}[page]||"Atlas Lab";if(page==="progress")renderProgress();if(page==="lab"){viewer?.resize();requestAnimationFrame(fitWorkspace)}}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>show(b.dataset.page));
function status(message,error=false){$("modelStatus").textContent=message;$("source-status").textContent=message;if(error)$("installNotice").hidden=false}
function sync(){if(!viewer)return;const all=[...viewer.registry.values()];$("countChip").textContent=all.length.toLocaleString()+" structures loaded";$("shownCount").textContent=viewer.visibleEntries().length+" visible";
 const selected=viewer.registry.get(viewer.selected);$("selectedEmpty").hidden=!!selected;$("selectedDetail").hidden=!selected;
 if(meshExam && selected && viewer.pickedFromCanvas && selected.key!==meshExam.lastAnswer){
   const target=meshExam.targets[meshExam.index];
   const ok=selected.key===target.key;
   meshExam.lastAnswer=selected.key;
   if(ok) meshExam.correct++;
   meshExam.index++;
   if(meshExam.index>=meshExam.targets.length){
     const final=meshExam;
     progress.scores.push({date:new Date().toISOString(),mode:"3D identification",score:final.correct,total:final.targets.length});
     save();
     status("3D practical completed: "+final.correct+"/"+final.targets.length+". Open Practice Exam for your result.");
     $("quizArea").innerHTML="<h2>3D practical result: "+final.correct+"/"+final.targets.length+"</h2><p>Questions are matched to the source model labels. Source mesh labels are not independently medically validated.</p>";
     meshExam=null;
   }else{
     const next=meshExam.targets[meshExam.index];
     status((ok?"Correct. ":"Not quite. ")+ "Identification "+(meshExam.index+1)+"/"+meshExam.targets.length+": click "+next.name+" ("+next.system+") on the actual 3D model.");
   }
 }
 if(selected){$("selectedSystem").textContent=selected.system;$("selectedName").textContent=selected.name;$("notes").value=progress.notes[selected.key]||"";$("markStudied").textContent=progress.studied.includes(selected.key)?"✓ Studied":"＋ Mark as studied";
  const card=study.find(c=>c.system===selected.system&&(c.name.toLowerCase()===selected.name.toLowerCase()||selected.name.toLowerCase().startsWith(c.name.toLowerCase()+" ")));
  const detail=$("selectedExtras");detail.replaceChildren();
  const suffix=selected.name.toLowerCase();
  const side=suffix.endsWith(".l")?"Left anatomical side":suffix.endsWith(".r")?"Right anatomical side":"Midline / unpaired / not indicated";
  const meta=document.createElement("p");meta.className="selected-meta";
  meta.textContent="SOURCE STRUCTURE · "+selected.system.toUpperCase()+" · "+side;
  detail.append(meta);
  const summary=document.createElement("p");
  summary.textContent=card?card.fact:"The atlas supplies the mesh name and geometry; this structure has not been assigned an independently verified description.";
  detail.append(summary);
  if(card?.source){const a=document.createElement("a");a.href=card.source;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Read anatomy textbook reference ↗";detail.append(a)}
  const caveat=document.createElement("p");caveat.className="muted small";caveat.textContent="Highlighted mesh and pinned label identify the source-model structure. Individual mesh labels are not independently medically audited.";detail.append(caveat);
 }
 document.querySelectorAll("[data-study-id]").forEach(b=>{const card=study.find(c=>c.id===b.dataset.studyId);const e=card&&viewer.find(card.name,card.system);b.classList.toggle("active",!!(e&&e.key===viewer.selected))});
 $("layerList").innerHTML="";for(const s of viewer.systems()){let b=document.createElement("button");b.textContent=(viewer.enabled.has(s)?"☑ ":"□ ")+s;b.onclick=()=>viewer.activeRegion&&viewer.activeRegion!=="whole"?viewer.navigateRegion(viewer.activeRegion,s):viewer.setSystem(s,!viewer.enabled.has(s));$("layerList").append(b)}
}
for(const [id,action] of [["hideSelected","hide"],["isolateSelected","isolate"],["ghostSelected","ghost"],["focusSelected","focus"],["showAll","showAll"]])$(id).onclick=()=>viewer?.act(action);
$("viewFront").onclick=()=>viewer?.view("front");$("viewBack").onclick=()=>viewer?.view("back");$("viewSide").onclick=()=>viewer?.view("side");$("viewReset").onclick=()=>viewer?.fitAll();$("undo").onclick=()=>viewer?.undo();$("unselect").onclick=()=>viewer?.select(null);
$("notes").oninput=()=>{if(viewer?.selected){progress.notes[viewer.selected]=$("notes").value;save()}};
$("markStudied").onclick=()=>{if(!viewer?.selected)return;if(!progress.studied.includes(viewer.selected))progress.studied.push(viewer.selected);save();sync()};
$("meshSearch").oninput=()=>{const q=$("meshSearch").value.trim(),list=$("searchResults");list.innerHTML="";if(q.length<2)return;for(const e of [...viewer.registry.values()].filter(e=>e.name.toLowerCase().includes(q.toLowerCase())).slice(0,25)){const b=document.createElement("button");b.textContent=e.name+" · "+e.system;b.onclick=()=>{viewer.enabled.add(e.system);if(viewer.regionFilter&&!viewer.regionFilter.has(e.key))viewer.clearRegion?.();viewer.select(e.key,true);if(viewer.selected)viewer.focus(e);$("meshSearch").value=e.name;list.innerHTML=""};list.append(b)}};
$("clearSearch").onclick=()=>{$("meshSearch").value="";$("searchResults").innerHTML=""};
$("backToLibrary").onclick=()=>show("cards");
$("panMode").onclick=()=>{if(!viewer)return;viewer.setPanMode(!viewer.panMode);$("panMode").setAttribute("aria-pressed",String(viewer.panMode));$("panMode").textContent="✥ Pan mode: "+(viewer.panMode?"On":"Off")};
$("zoomIn").onclick=()=>viewer?.zoom(.72);$("zoomOut").onclick=()=>viewer?.zoom(1.4);
$("panLeft").onclick=()=>viewer?.pan(105,0);$("panRight").onclick=()=>viewer?.pan(-105,0);
$("panUp").onclick=()=>viewer?.pan(0,-105);$("panDown").onclick=()=>viewer?.pan(0,105);
$("focusSelection").onclick=()=>{const e=viewer?.registry.get(viewer.selected);if(e)viewer.focus(e);else status("Select a structure, or choose a region to focus on.")};
function fitWorkspace(){
 if(document.fullscreenElement)return;
 const grid=$("page-lab").querySelector(".lab-grid"),main=document.querySelector("#app>main");
 if(!$("page-lab").classList.contains("active"))return;
 const space=main.getBoundingClientRect().bottom-grid.getBoundingClientRect().top-14;
 if(space>310){grid.style.height=Math.min(1100,Math.floor(space))+"px"}
 else{grid.style.height="340px"}
 viewer?.resize()
}
const fullscreenButton=$("expandViewer"),workspace=$("page-lab").querySelector(".lab-grid");
fullscreenButton.onclick=async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();
 else await workspace.requestFullscreen();}catch(err){status("Fullscreen unavailable in this browser: "+err.message)}
};
document.addEventListener("fullscreenchange",()=>{
 fullscreenButton.setAttribute("aria-pressed",String(document.fullscreenElement===workspace));
 fullscreenButton.textContent=document.fullscreenElement===workspace?"↙ Exit fullscreen":"⛶ Fullscreen lab";
 requestAnimationFrame(()=>viewer?.resize());
});
window.addEventListener("resize",()=>requestAnimationFrame(fitWorkspace));
window.addEventListener("keydown",e=>{
 if(e.key.toLowerCase()==="f"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)&&$("page-lab").classList.contains("active")){
   e.preventDefault();fullscreenButton.click()
 }
});
function renderLessons(){
  const menu=$("lessonMenu"),detail=$("lessonDetail");menu.innerHTML="";
  lessons.forEach((l,i)=>{const button=document.createElement("button");button.textContent=(i+1)+". "+l.title;button.onclick=()=>{active=i;renderLessons()};if(active===i)button.classList.add("active");menu.append(button)});
  const l=lessons[active];detail.innerHTML="";if(!l)return;
  const title=document.createElement("h2");title.textContent=l.title;
  const summary=document.createElement("p");summary.textContent=l.summary;
  const note=document.createElement("p");note.className="muted";note.textContent="Each step now targets the corresponding 3D source mesh. If it is unavailable or not individually selectable, the app will tell you rather than point to a different structure.";
  const heading=document.createElement("h3");heading.textContent="Locate these structures in 3D";
  const targetList=document.createElement("div");targetList.className="lesson-targets";
  for(const [i,name]of (l.targets||[]).entries()){const button=document.createElement("button");button.className="btn sm";button.textContent=(i+1)+". "+name+" ↗";button.onclick=()=>startLesson(active,i);targetList.append(button)}
  const task=document.createElement("p");task.textContent=l.task||"Select and inspect each target.";
  const start=document.createElement("button");start.className="btn primary";start.textContent="Start guided 3D lesson";start.onclick=()=>startLesson(active,0);
  const next=document.createElement("button");next.className="btn";next.textContent="Next lesson →";next.onclick=()=>{active=(active+1)%lessons.length;renderLessons()};
  const actions=document.createElement("div");actions.className="inline-actions";actions.append(start,next);
  detail.append(title,summary,note,heading,targetList,task,actions);
}
function updateLessonDock(message=""){
  const dock=$("lessonDock");if(!lessonSession){dock.hidden=true;return}
  const lesson=lessons[lessonSession.lesson],step=lessonSession.step;
  dock.hidden=false;
  $("lessonDockTitle").textContent=lesson.title+" — "+(step+1)+"/"+lesson.targets.length+": "+lesson.targets[step];
  $("lessonDockStatus").textContent=message||("Target: "+lesson.targets[step]+" · "+lesson.system+". Rotate, isolate or pull apart structures.");
}
async function startLesson(index,step=0){
  lessonSession={lesson:index,step};active=index;show("lab");
  updateLessonDock("Loading the anatomical layer and locating the target…");
  await focusLessonStep();
}
async function focusLessonStep(){
  if(!lessonSession)return;
  const lesson=lessons[lessonSession.lesson],name=lesson.targets[lessonSession.step];
  if(!viewer){updateLessonDock("The 3D viewer is not loaded. Reload the page.");return}
  viewer.isolated=null;viewer.enabled=new Set([lesson.system]);
  await viewer.setSystem(lesson.system,true);
  const entry=await viewer.locateStudyTarget(name,lesson.system);
  if(entry){updateLessonDock("Showing actual source mesh: "+entry.name+" ("+entry.system+").");status("Guided 3D lesson: "+entry.name)}
  else{updateLessonDock("No individually identifiable mesh found for "+name+" in this source layer. Try the next target.");status("Not in the available "+lesson.system+" mesh labels: "+name)}
}
$("lessonFind").onclick=()=>focusLessonStep();
$("lessonNext").onclick=()=>{if(!lessonSession)return;const l=lessons[lessonSession.lesson];lessonSession.step=(lessonSession.step+1)%l.targets.length;focusLessonStep()};
$("lessonHide").onclick=()=>{if(!viewer?.selected){updateLessonDock("Find a structure before hiding it.");return}viewer.act("hide");updateLessonDock("Structure hidden. Choose Next or Find target to continue.")};
$("lessonExit").onclick=()=>{lessonSession=null;updateLessonDock()};
async function openHeart(){
 if(!viewer){status("3D anatomy has not finished loading.");return false}
 show("lab");
 const ok=await viewer.navigateRegion("heart","Cardiovascular");
 if(ok)status("Heart anatomy: select the right atrium, left atrium, right ventricle, or left ventricle. Use the region part list for detailed study.");
 else status("Heart chambers were not found in the downloaded cardiovascular model.");
 return ok;
}
$("heartShortcut").onclick=openHeart;
function renderCards(){const list=$("studyList"),q=$("studySearch").value.toLowerCase(),filter=$("studyFilter").value;list.innerHTML="";const filtered=study.filter(c=>(filter==="all"||c.system===filter)&&(c.name+" "+c.fact).toLowerCase().includes(q));for(const c of filtered){const b=document.createElement("button");b.textContent=c.name+" · "+c.system;b.dataset.studyId=c.id;b.classList.toggle("active",!!(viewer&&c.name!=="Heart"&&viewer.selected===viewer.find(c.name,c.system)?.key));b.onclick=async()=>{const d=$("cardDetail");d.innerHTML="";const h=document.createElement("h2");h.textContent=c.name;const p=document.createElement("p");p.textContent=c.fact;const a=document.createElement("a");a.href=c.source;a.target="_blank";a.rel="noopener";a.textContent="Reference ↗";const v=document.createElement("button");v.textContent=c.name==="Heart"?"Explore cardiac chambers in 3D":"View highlighted structure in 3D";v.onclick=async()=>{if(c.name==="Heart"){await openHeart();return}show("lab");const found=await viewer.findAndFocus(c.name,c.system);if(!found)status("No matching mesh located for "+c.name+" in loaded systems.");else status(found.entry.name+" selected and labeled on the 3D body.")};
 const unselect=document.createElement("button");unselect.textContent="Deselect structure";unselect.onclick=()=>{viewer.select(null);status("Anatomical structure deselected.")};
 d.append(h,p,a,document.createElement("hr"),v,unselect);
 if(viewer){
  if(c.name==="Heart"&&c.system==="Cardiovascular"){await openHeart();return}
  if(c.system==="Cardiovascular"&&["Right atrium","Left atrium","Right ventricle","Left ventricle"].includes(c.name)){
    await openHeart();const entry=viewer.find(c.name,c.system);
    if(entry){viewer.select(entry.key);viewer.focus(entry);status("Cardiac chamber selected: "+entry.name)}
    else status("No exact cardiac chamber mesh found: "+c.name);
    return
  }
  const already=viewer.find(c.name,c.system);
   if(already){if(viewer.selected===already.key)viewer.select(null);else{viewer.enabled.add(c.system);already.hidden=false;if(viewer.regionFilter&&!viewer.regionFilter.has(already.key))viewer.clearRegion?.();viewer.select(already.key)}}
   else await viewer.setSystem(c.system,true).then(()=>{const entry=viewer.find(c.name,c.system);if(entry){viewer.select(entry.key)}else status("No matching source mesh located for "+c.name+".",false)});
 }};list.append(b)}}
$("studySearch").oninput=renderCards;$("studyFilter").onchange=renderCards;
$("startTextQuiz").onclick=()=>{quiz=[...study].sort(()=>Math.random()-.5).slice(0,Math.min(10,study.length));qi=0;score=0;renderQuestion()};
function renderQuestion(){const box=$("quizArea");box.innerHTML="";if(qi>=quiz.length){const h=document.createElement("h2");h.textContent="Score: "+score+"/"+quiz.length;box.append(h);progress.scores.push({date:new Date().toISOString(),score,total:quiz.length});save();return}const c=quiz[qi],h=document.createElement("h3");h.textContent="Which description matches "+c.name+"? ("+(qi+1)+"/"+quiz.length+")";box.append(h);const choices=[c,...study.filter(x=>x.id!==c.id).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);for(const x of choices){let b=document.createElement("button");b.style.display="block";b.style.margin="9px 0";b.textContent=x.fact;b.onclick=()=>{if(x.id===c.id)score++;qi++;renderQuestion()};box.append(b)}}
$("startMeshQuiz").onclick=async()=>{
 if(!viewer){$("quizArea").textContent="Wait for 3D anatomy to load before starting the identification exam.";return}
 await viewer.setSystem("Skeleton",true);
 const available=[...viewer.registry.values()].filter(x=>x.system==="Skeleton"&&x.name&&x.name.length>2&&x.name.length<65);
 if(available.length<5){$("quizArea").textContent="There are not enough loaded 3D bone meshes to run this exam. Check the model status.";return}
 const shuffled=[...available].sort(()=>Math.random()-.5);
 const seen=new Set(),unique=shuffled.filter(x=>{const k=x.name.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});
 const targets=unique.slice(0,Math.min(10,unique.length));
 meshExam={targets,index:0,correct:0,lastAnswer:viewer.selected};
 show("lab");
 status("3D identification 1/"+targets.length+": click "+targets[0].name+" on the actual 3D skeleton. Each click is scored.");
};
function renderProgress(){const e=$("progressView");e.innerHTML="";const h=document.createElement("h2");h.textContent=progress.studied.length+" structures marked studied";const p=document.createElement("p");p.textContent=progress.scores.length+" knowledge exams completed. Progress is stored only in this browser.";e.append(h,p)}
$("exportBtn").onclick=()=>{const a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:"application/json"}));a.href=url;a.download="atlas-lab-progress.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};
$("importFile").onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data.studied)||!data.notes)throw Error("Invalid progress file");progress=data;save();renderProgress()}catch(err){alert(err.message)}};
$("clearProgress").onclick=()=>{if(confirm("Reset saved study progress?")){progress={studied:[],notes:{},scores:[]};save();renderProgress()}};
async function init(){try{[study,lessons]=await Promise.all([fetch("study_cards.json").then(r=>r.json()),fetch("lessons.json").then(r=>r.json())]);renderLessons();renderCards();const manifest=await fetch("asset_manifest.json").then(r=>r.json());viewer=new AnatomyViewer($("sceneRoot"),sync,status);sync();await viewer.configure(manifest);installDissection(viewer,status);installRegions(viewer,status);
 requestAnimationFrame(fitWorkspace);
 viewer.renderer.domElement.addEventListener("dblclick",e=>{viewer.pick(e);const selected=viewer.registry.get(viewer.selected);if(selected)viewer.focus(selected)});
 sync()}catch(e){status("App initialization error: "+e.message,true);console.error(e)}}
init();
