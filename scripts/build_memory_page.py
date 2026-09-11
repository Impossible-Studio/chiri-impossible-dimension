import math
import sys
from pathlib import Path

import bpy


def script_args():
    separator = sys.argv.index("--") if "--" in sys.argv else len(sys.argv)
    values = sys.argv[separator + 1 :]
    if len(values) != 3:
        raise SystemExit("Expected: SOURCE_IMAGE GLB_PATH BLEND_PATH")
    return tuple(Path(value).resolve() for value in values)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def make_principled_material(name, color, roughness=0.55):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = 0.0
    return material


def make_image_material(image_path):
    material = bpy.data.materials.new("Memory_1_Artwork")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    principled.inputs["Roughness"].default_value = 0.48
    principled.inputs["Metallic"].default_value = 0.0

    image = bpy.data.images.load(str(image_path), check_existing=True)
    image.name = "Memory_1_Image"
    image.pack()
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "Memory_1_Texture"
    texture.image = image
    texture.interpolation = "Linear"
    links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    links.new(texture.outputs["Alpha"], principled.inputs["Alpha"])
    material.surface_render_method = "DITHERED"
    return material


def build_page(image_path):
    white = make_principled_material("Memory_1_White", (1.0, 1.0, 1.0, 1.0), 0.62)
    artwork = make_image_material(image_path)

    bpy.ops.mesh.primitive_cube_add(location=(0.0, 0.0, 0.06))
    base = bpy.context.object
    base.name = "memory_1_page"
    base.dimensions = (2.5, 2.5, 0.12)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    base.data.materials.append(white)

    bevel = base.modifiers.new("Soft page edges", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 3
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.modifier_apply(modifier=bevel.name)

    for polygon in base.data.polygons:
        polygon.use_smooth = False

    # A dedicated top surface preserves the PNG alpha and lets the white page
    # show through around the irregular illustration border.
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0.0, 0.0, 0.121))
    art = bpy.context.object
    art.name = "memory_1_artwork"
    art.scale = (1.205, 1.205, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    art.data.materials.append(artwork)

    uv_layer = art.data.uv_layers.active
    coordinates = ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))
    for loop, coordinate in zip(art.data.loops, coordinates):
        uv_layer.data[loop.index].uv = coordinate

    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    art.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.join()
    page = bpy.context.object
    page.name = "memory_1_page"
    page.data.name = "memory_1_page_mesh"

    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    page["description"] = "Chiri comic memory page 1"
    return page


def export_glb(page, glb_path):
    glb_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    page.select_set(True)
    bpy.context.view_layer.objects.active = page
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )


def main():
    image_path, glb_path, blend_path = script_args()
    if not image_path.is_file():
        raise FileNotFoundError(image_path)

    clean_scene()
    page = build_page(image_path)

    blend_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    export_glb(page, glb_path)

    triangles = sum(len(poly.vertices) - 2 for poly in page.data.polygons)
    print(f"MEMORY_GLB={glb_path}")
    print(f"MEMORY_BLEND={blend_path}")
    print(f"MEMORY_GEOMETRY=vertices:{len(page.data.vertices)},triangles:{triangles}")


if __name__ == "__main__":
    main()
