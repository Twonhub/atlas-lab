const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("model_naming.js","utf8").replace("export function","function");
const resolveSourcePartName=new Function(source+";return resolveSourcePartName")();
function node(name,parent=null){return {name:name||"",userData:{},parent}}
test("reads real Z-Anatomy label from a named parent rather than anonymous mesh name",()=>{
 const root=node("Scene"),bone=node("Bone_038",root),mesh=node("mesh_992",bone);
 bone.userData.za_name="Scaphoid bone.l";
 assert.equal(resolveSourcePartName(mesh,root),"Scaphoid bone.l")
});
test("the closest named anatomical node owns nested geometry",()=>{
 const root=node("Scene"),parent=node("Parent",root),inner=node("Structure",parent),mesh=node("mesh_33",inner);
 parent.userData.za_name="Upper limb";inner.userData.za_name="Radius.r";
 assert.equal(resolveSourcePartName(mesh,root),"Radius.r")
});
test("does not mistake glTF-generated mesh IDs for anatomy",()=>{
 const root=node("Scene"),mesh=node("mesh_225",root);
 assert.equal(resolveSourcePartName(mesh,root),null)
});
test("recognizes heart chambers and trims surrounding whitespace",()=>{
 const root=node("Scene"),a=node("node",root),mesh=node("mesh",a);
 a.userData.za_name="  Left ventricle  ";
 assert.equal(resolveSourcePartName(mesh,root),"Left ventricle")
});
