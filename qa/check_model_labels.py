"""Inspect actual deployed GLB JSON nodes for anatomical labels, no OCR or guessing.

Reads binary GLB metadata embedded in models downloaded by GitHub Actions.
See upstream nqwrc/3d-anatomy src/viewer/loadModel.js (za_name on parent nodes).
"""
import json, pathlib, struct

checks = {
    "skeletal": ["Frontal bone", "Scaphoid bone.l", "Scaphoid bone.r", "Femur.l", "Vertebra L1"],
    "cardiovascular": ["Right atrium", "Left atrium", "Right ventricle", "Left ventricle"]
}
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
    print(f"{system}: {len(doc.get('nodes', []))} graph nodes, {len(names)} named anatomical structures")
    if names:
        print("Examples:", sorted(names)[:12])
    missing = [name for name in required if name not in names]
    assert not missing, f"{system} expected anatomy names missing from 3D GLB: {missing}; metadata examples {sorted(names)[:20]}"
print("Validated real GLB anatomical parent-node naming and expected regions.")
