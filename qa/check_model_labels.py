"""Inspect actual deployed GLB JSON nodes for anatomical labels, no OCR or guessing.

Reads binary GLB metadata embedded in models downloaded by GitHub Actions.
See upstream nqwrc/3d-anatomy src/viewer/loadModel.js (za_name on parent nodes).
"""
import json, pathlib, struct

checks = {
    "skeletal": ["Frontal bone", "Scaphoid bone.l", "Scaphoid bone.r", "Femur.l", "Vertebra L1"],
    "cardiovascular": ["Right atrium", "Left atrium", "Right ventricle", "Left ventricle"]
}
label_sets = {}
for system, required in checks.items():
    blob = pathlib.Path("_site/models", system + ".glb").read_bytes()
    assert blob[:4] == b"glTF" and struct.unpack_from("<I", blob, 4)[0] == 2
    pos = 12
    json_chunk = None
    while pos + 8 <= len(blob):
        length, kind = struct.unpack_from("<II", blob, pos)
        start = pos + 8
        assert start + length <= len(blob), "GLB chunk out of range"
        if kind == 0x4E4F534A:
            json_chunk = blob[start:start+length]
            break
        pos = start + length
    assert json_chunk is not None, "GLB JSON chunk absent"
    doc = json.loads(json_chunk.decode("utf-8"))
    names = {
        str(node.get("extras", {}).get("za_name", "")).strip()
        for node in doc.get("nodes", [])
    }
    names.discard("")
    label_sets[system] = names
    named_mesh_nodes = sum(1 for n in doc.get("nodes", []) if n.get("extras", {}).get("za_name") and "mesh" in n)
    named_parents = sum(1 for n in doc.get("nodes", []) if n.get("extras", {}).get("za_name") and "mesh" not in n)
    print(f"{system}: {len(doc.get('nodes', []))} graph nodes, {len(names)} named anatomical structures; {named_mesh_nodes} named mesh nodes, {named_parents} named non-mesh parents")
    if names:
        print("Examples:", sorted(names)[:12])
    missing = [name for name in required if name not in names]
    assert not missing, f"{system} expected anatomy names missing from 3D GLB: {missing}; metadata examples {sorted(names)[:20]}"
print("Validated real GLB anatomical parent-node naming and expected regions.")


# This list is the exact set of body regions exposed by the Atlas Lab UI.
# Validate against the real, deployed glTF metadata rather than a mock list.
import re
text = pathlib.Path("regions.js").read_text()
match = re.search(r'export const REGIONS=(\[[\s\S]*?\]);', text)
assert match, "Region selector definition not found"
regions = json.loads(match.group(1))
def normalize(value):
    return re.sub(r"\s+", " ", re.sub(r"[_\-.]+", " ", value.lower())).strip()
def alias(value,term):
    return value == term or value.startswith(term + " ") or value.endswith(" " + term) or " " + term + " " in value or len(term)>=4 and term in value
for ident, label, terms in regions:
    if ident == "whole":
        continue
    system = "cardiovascular" if ident == "heart" else "skeletal"
    names = label_sets[system]
    candidates = [n for n in names if any(alias(normalize(n),term) for term in terms)]
    print(f"Region {label}: {len(candidates)} real source anchors")
    assert candidates, f"Missing 3D model labels for selectable body region: {ident}"
print("Validated",len(regions)-1,"selectable body regions against actual 3D geometry metadata.")
