from pathlib import Path

import bpy
from mathutils import Vector


root = Path(__file__).resolve().parents[1]
blend_path = root / "source_assets" / "blender" / "sewing_machine" / "sewing_machine.blend"
preview_path = root / ".codex_preview" / "sewing_machine.png"
preview_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(blend_path))

bpy.ops.object.camera_add(location=(4.1, -5.2, 3.1))
camera = bpy.context.object
camera.data.lens = 58
camera.rotation_euler = (
    Vector((0.0, 0.0, 1.15)) - camera.location
).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.camera = camera

for location, energy, size in (
    ((-3.0, -4.0, 5.0), 1100, 4.0),
    ((3.0, 1.0, 4.0), 800, 3.0),
):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.rotation_euler = (
        Vector((0.0, 0.0, 1.0)) - light.location
    ).to_track_quat("-Z", "Y").to_euler()

bpy.ops.mesh.primitive_plane_add(size=14, location=(0.0, 0.0, -0.01))
floor = bpy.context.object
floor_mat = bpy.data.materials.new("PreviewFloor")
floor_mat.diffuse_color = (0.06, 0.075, 0.09, 1.0)
floor.data.materials.append(floor_mat)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(preview_path)
scene.render.film_transparent = False
scene.world.color = (0.025, 0.03, 0.04)
bpy.ops.render.render(write_still=True)
print(f"PREVIEW={preview_path}")
