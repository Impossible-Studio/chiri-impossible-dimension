import sys
from pathlib import Path

import bpy


root = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
failures = []

for number in range(2, 13):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    path = root / f"memory_{number}.glb"
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    names = sorted(obj.name for obj in meshes)
    expected = sorted([f"memory_{number}_page", f"memory_{number}_page_collider"])
    page = next((obj for obj in meshes if not obj.name.endswith("_collider")), None)
    dims = tuple(round(value, 4) for value in page.dimensions) if page else None
    packed_images = [image for image in bpy.data.images if image.size[0] > 0]
    valid = names == expected and dims == (0.8, 0.8, 0.0421) and len(packed_images) == 1
    if not valid:
        failures.append((number, names, dims, len(packed_images)))
    print(
        f"CHECK memory_{number}: objects={names}, dimensions={dims}, "
        f"images={len(packed_images)}, bytes={path.stat().st_size}"
    )

if failures:
    raise RuntimeError(f"Memory validation failed: {failures}")

print("ALL_MEMORY_GLBS_OK")
