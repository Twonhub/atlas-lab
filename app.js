import {installDissection} from "./dissection.js";
import {AnatomyViewer} from "./viewer.js";
const $=id=>document.getElementById(id);
let lessonSession=null;
let viewer,study=[],lessons=[],active=0,quiz=[],qi=0,score=0,meshExam=null;let progress={studied:[],notes:{},scores:[]};
try{progress={...progress,...JSON.parse(localStorage.getItem("atlasLabV2")||"{}")}}catch{}
const save=()=>{try{localStorage.setItem("atlasLabV2",JSON.stringify(progress))}catch{}};
function show(page){document.querySelectorAll(".page").forEach(e=>e.classList.toggle("active",e.id==="page-"+page));document.querySelectorAll(".nav").forEach(e=>e.classList.toggle("active",e.dataset.page===page));$("pageHeading").textContent={lab:"Virtual Dissection Lab",lessons:"Guided Lessons",cards:"Anatomy Library",quiz:"Practice Exam",progress:"My Progress",sources:"Sources & Accuracy"}[page]||"Atlas Lab";if(page==="progress")renderProgress();if(page==="lab")viewer?.resize()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>show(b.dataset.page));
function status(message,error=false){$("modelStatus").textContent=message;$("source-status").textContent=message;if(error)$("installNotice").hidden=false}
function sync(){if(!viewer)return;const all=[...viewer.registry.values()];$("countChip").textContent=all.length.toLocaleString()+" structures loaded";$("shownCount").textContent=viewer.visibleEntries().length+" visible";
 const selected=viewer.registry.get(viewer.selected);$("selectedEmpty").hidden=!!selected;$("selectedDetail").hidden=!selected;
 if(meshExam && selected && selected.key!==meshExam.lastAnswer){
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
 if(selected){$("selectedSystem").textContent=selected.system;$("selectedName").textContent=selected.name;$("notes").value=progress.notes[selected.key]||"";$("markStudied").textContent=progress.studied.includes(selected.key)?"✓ Studied":"＋ Mark as studied";$("selectedExtras").textContent="Structure from the source anatomical mesh dataset; terminology not individually validated.";}
 $("layerList").innerHTML="";for(const s of viewer.systems()){let b=document.createElement("button");b.textContent=(viewer.enabled.has(s)?"☑ ":"□ ")+s;b.onclick=()=>viewer.setSystem(s,!viewer.enabled.has(s));$("layerList").append(b)}
}
for(const [id,action] of [["hideSelected","hide"],["isolateSelected","isolate"],["ghostSelected","ghost"],["focusSelected","focus"],["showAll","showAll"]])$(id).onclick=()=>viewer?.act(action);
$("viewFront").onclick=()=>viewer?.view("front");$("viewBack").onclick=()=>viewer?.view("back");$("viewSide").onclick=()=>viewer?.view("side");$("viewReset").onclick=()=>viewer?.fitAll();$("undo").onclick=()=>viewer?.undo();$("unselect").onclick=()=>viewer?.select(null);
$("notes").oninput=()=>{if(viewer?.selected){progress.notes[viewer.selected]=$("notes").value;save()}};
$("markStudied").onclick=()=>{if(!viewer?.selected)return;if(!progress.studied.includes(viewer.selected))progress.studied.push(viewer.selected);save();sync()};
$("meshSearch").oninput=()=>{const q=$("meshSearch").value.trim(),list=$("searchResults");list.innerHTML="";if(q.length<2)return;for(const e of [...viewer.registry.values()].filter(e=>e.name.toLowerCase().includes(q.toLowerCase())).slice(0,25)){const b=document.createElement("button");b.textContent=e.name+" · "+e.system;b.onclick=()=>{viewer.enabled.add(e.system);viewer.select(e.key);viewer.focus(e);$("meshSearch").value=e.name;list.innerHTML=""};list.append(b)}};
$("clearSearch").onclick=()=>{$("meshSearch").value="";$("searchResults").innerHTML=""};
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
function renderCards(){const list=$("studyList"),q=$("studySearch").value.toLowerCase(),filter=$("studyFilter").value;list.innerHTML="";const filtered=study.filter(c=>(filter==="all"||c.system===filter)&&(c.name+" "+c.fact).toLowerCase().includes(q));for(const c of filtered){const b=document.createElement("button");b.textContent=c.name+" · "+c.system;b.onclick=()=>{const d=$("cardDetail");d.innerHTML="";const h=document.createElement("h2");h.textContent=c.name;const p=document.createElement("p");p.textContent=c.fact;const a=document.createElement("a");a.href=c.source;a.target="_blank";a.rel="noopener";a.textContent="Reference ↗";const v=document.createElement("button");v.textContent="Find in 3D";v.onclick=async()=>{show("lab");const found=await viewer.findAndFocus(c.name,c.system);if(!found)status("No matching mesh located for "+c.name+" in loaded systems.",true)};d.append(h,p,a,document.createElement("hr"),v)};list.append(b)}}
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
async function init(){try{[study,lessons]=await Promise.all([fetch("study_cards.json").then(r=>r.json()),fetch("lessons.json").then(r=>r.json())]);renderLessons();renderCards();const manifest=await fetch("asset_manifest.json").then(r=>r.json());viewer=new AnatomyViewer($("sceneRoot"),sync,status);sync();await viewer.configure(manifest);installDissection(viewer,status);sync()}catch(e){status("App initialization error: "+e.message,true);console.error(e)}}
init();
