/** Read the authoritative anatomical structure label from the closest named
 *  ancestor in the glTF scene graph. Geometry meshes often have only IDs. */
export function resolveSourcePartName(mesh,root){
 let node=mesh;
 while(node){
  const value=node.userData?.za_name||node.userData?.partId;
  if(typeof value==="string"&&value.trim())return value.trim();
  if(node===root)break;
  node=node.parent;
 }
 return null;
}
