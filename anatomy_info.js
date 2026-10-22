/**
 * Atlas Lab educational content matching.
 *
 * Data with an individual citation is provided by study_cards.json.
 * An uncurated source mesh receives an explicitly GENERAL description of its
 * tissue/system category, not invented origins, actions, innervation or disease.
 */
export const stripSide=(name)=>String(name||"").trim()
  .replace(/\.(l|r)$/i,"")
  .replace(/\s*\((left|right)\)$/i,"")
  .trim();
export const canonical=(name)=>stripSide(name).toLowerCase().replace(/[_-]/g," ")
  .replace(/\b(bones|bone|muscles|muscle)\b/g,"")
  .replace(/\s+/g," ").trim();
export function matchCard(name,system,cards=[]){
 const base=canonical(name);if(!base)return null;
 const same=cards.filter(c=>c.system===system&&c.name!=="Heart");
 let found=same.find(c=>canonical(c.name)===base);
 if(found)return found;
 // A safe alias permits named divisions like "Acromial part of deltoid muscle"
 // only when the card explicitly states the whole muscle.
 const alias={"atlas (c1)":"atlas","axis (c2)":"axis","mandible":"mandible",
  "scaphoid bone":"scaphoid","lunate bone":"lunate"};
 const adjusted=alias[stripSide(name).toLowerCase()]||base;
 found=same.find(c=>canonical(c.name)===adjusted);
 return found||null;
}
export function categoryInfo(name,system){
 const t=String(name||"").toLowerCase();
 const intro="This specific source-mesh label does not yet have an individually reviewed explanatory entry. The following describes its general anatomical category only.";
 let what="",purpose="",study="";
 if(/\bnerve\b/.test(t)){
  what="A nerve is a bundle of nerve fibers in the peripheral nervous system.";
  purpose="Peripheral nerves convey sensory information toward the central nervous system and/or motor commands toward their targets; the precise role varies by nerve.";
  study="Trace its route, named branches and neighboring muscles. Specific innervation has not been verified for this mesh.";
 } else if(/\b(artery|aorta|arteriole)\b/.test(t)){
  what="An artery carries blood away from the heart.";
  purpose="Arteries distribute blood through the circulatory system. Most systemic arteries carry oxygen-rich blood; pulmonary arteries are an important exception.";
  study="Trace its branching and identify whether the structure is systemic or pulmonary before assigning a tissue territory.";
 } else if(/\b(vein|vena cava|sinus)\b/.test(t)&&system==="Cardiovascular"){
  what="A vein is a blood vessel returning blood toward the heart.";
  purpose="Venous vessels collect blood from tissues or organs; pulmonary veins uniquely return oxygenated blood.";
  study="Follow drainage pathways and check the relationship to nearby arteries.";
 } else if(/\b(lymph|node)\b/.test(t)||system==="Lymphatic"){
  what="This structure belongs to the lymphatic or immune system.";
  purpose="Lymphatic structures help return interstitial fluid to circulation and support immune surveillance; a lymph node filters lymph.";
  study="Study the drainage area and relation to adjacent veins and arteries.";
 } else if(/\b(ligament)\b/.test(t)){
  what="A ligament is a band of dense connective tissue connecting bones or stabilizing a joint.";
  purpose="Ligaments help limit excessive joint movement and contribute to stability.";
  study="Identify its two attachments and which motion it helps restrain.";
 } else if(/\b(tendon|aponeurosis)\b/.test(t)){
  what="A tendon or aponeurosis is dense connective tissue that transmits muscle force.";
  purpose="It helps transfer force from a contracting muscle to a bony or other connective-tissue attachment.";
  study="Trace it to the associated muscle and insertion.";
 } else if(/\b(cartilage)\b/.test(t)){
  what="Cartilage is a supportive connective tissue.";
  purpose="Its role depends on type and location: it may resist compression, maintain shape or create a smooth joint surface.";
  study="Identify whether this is articular, costal, respiratory or another cartilage.";
 } else if(/\b(joint|articulation)\b/.test(t)||system==="Joints"){
  what="This structure is part of the articular or supportive apparatus of a joint.";
  purpose="Joints connect skeletal elements and may permit controlled movement, transfer loads or confer stability.";
  study="Identify the joint surfaces, stabilizing tissues and allowed movements.";
 } else if(/\b(bone|vertebra|rib|femur|tibia|fibula|humerus|radius|ulna|patella|clavicle|scapula|sacrum|sternum|mandible|pelvis|carpal|phalanx|metacarpal|metatarsal)\b/.test(t)||system==="Skeleton"){
  what="This is a structure in the skeletal system.";
  purpose="Bones support the body, protect organs, store minerals and provide attachment or leverage for movement; exact roles depend on location.";
  study="Identify nearby joints, prominent landmarks and muscle attachments.";
 } else if(/\bmuscle\b/.test(t)||system==="Muscular"){
  what="This is a structure of the muscular system.";
  purpose="Skeletal muscles generate movement, support posture and contribute to joint stability through contraction; a specific action depends on its attachments.";
  study="Identify origin, insertion, action and nerve supply from a verified source.";
 } else if(system==="Visceral"){
  what="This structure belongs to an internal organ or visceral system.";
  purpose="Internal organs carry out specialized processes such as breathing, digestion, filtration, reproduction or secretion, depending on the organ.";
  study="Locate the organ in its body cavity and examine neighboring structures before learning its specific physiology.";
 } else {
  what="This is a named component of the "+String(system||"anatomical")+" system.";
  purpose="Its exact function requires an individually referenced anatomy description.";
  study="Use the anatomical name and the linked textbook chapters to identify its origin, course, function and relationships.";
 }
 return {name,system,short:what,purpose,description:intro,relationships:"No individual relationships have been verified for this source label.",study_tip:study,source:null,curated:false};
}
export function anatomyInfo(name,system,cards=[]){
 const card=matchCard(name,system,cards);
 if(!card)return categoryInfo(name,system);
 return {name,system,short:card.short||card.fact,purpose:card.function||card.fact,
  description:card.description||card.fact,relationships:card.relationships||"See the cited anatomy chapter for neighboring structures.",
  study_tip:card.study_tip||"Find this structure in the 3D viewer; compare its anatomical position and function.",
  source:card.source,curated:true,region:card.region};
}
