import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "scene" / "Models" / "sewing_machine"
SOURCE_DIR = ROOT / "source_assets" / "blender" / "sewing_machine"
GLB_PATH = OUT_DIR / "sewing_machine.glb"
TEXTURE_PATH = OUT_DIR / "sewing_machine_BaseColor.png"
BLEND_PATH = SOURCE_DIR / "sewing_machine.blend"


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for group in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images):
        for item in list(group):
            if item.users == 0:
                group.remove(item)


def material(name, color, roughness=0.62, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def apply_bevel(obj, width=0.05, segments=2):
    bevel = obj.modifiers.new("Soft edges", "BEVEL")
    bevel.width = width
    bevel.segments = segments
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def box(name, location, size, mat, bevel=0.05, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    apply_bevel(obj, min(bevel, min(size) * 0.32), 2)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0.0, 0.0, 0.0), vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    apply_bevel(obj, min(radius * 0.18, depth * 0.18), 2)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def sphere(name, location, radius, mat, scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def tube(name, points, radius, mat, resolution=2):
    curve = bpy.data.curves.new(name + "_curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def build_machine():
    cream = material("Cream", (0.92, 0.78, 0.57, 1.0))
    aqua = material("Pastel Aqua", (0.22, 0.70, 0.78, 1.0))
    aqua_dark = material("Aqua Shadow", (0.055, 0.34, 0.42, 1.0))
    pink = material("Candy Pink", (0.96, 0.25, 0.52, 1.0))
    lilac = material("Soft Lilac", (0.55, 0.32, 0.82, 1.0))
    yellow = material("Butter Yellow", (1.0, 0.70, 0.18, 1.0))
    cloth = material("Mint Fabric", (0.26, 0.82, 0.57, 1.0), 0.82)
    metal = material("Soft Metal", (0.50, 0.55, 0.58, 1.0), 0.32, 0.65)
    dark = material("Thread Dark", (0.08, 0.055, 0.09, 1.0))
    parts = []

    # Broad stable base; every upper assembly meets this body or another part.
    parts.append(box("Base", (0.0, 0.0, 0.12), (2.65, 1.25, 0.24), cream, 0.10))
    parts.append(box("BaseInset", (0.05, -0.02, 0.265), (2.25, 0.95, 0.08), aqua, 0.035))
    parts.append(box("Fabric", (-0.50, -0.06, 0.335), (1.05, 0.72, 0.055), cloth, 0.025, (0.0, 0.0, -0.08)))

    # Rear column and long horizontal arm form the recognizable C silhouette.
    parts.append(box("RearColumn", (0.87, 0.12, 1.13), (0.62, 0.82, 1.78), aqua, 0.16))
    parts.append(box("TopArm", (0.05, 0.10, 1.80), (2.10, 0.82, 0.58), aqua, 0.17))
    parts.append(box("Head", (-0.72, 0.08, 1.40), (0.66, 0.78, 0.92), aqua, 0.16))
    parts.append(box("HeadFace", (-0.74, -0.335, 1.47), (0.48, 0.07, 0.56), pink, 0.10))

    # Needle mechanism physically bridges the head and the base plate.
    parts.append(cylinder("NeedleBar", (-0.72, -0.05, 0.87), 0.055, 0.62, metal, vertices=12))
    parts.append(cylinder("Needle", (-0.72, -0.05, 0.52), 0.016, 0.31, metal, vertices=10))
    parts.append(box("PresserFoot", (-0.72, -0.05, 0.385), (0.28, 0.32, 0.055), metal, 0.018))
    parts.append(box("NeedlePlate", (-0.72, -0.03, 0.325), (0.64, 0.52, 0.035), metal, 0.014))

    # Side wheel attached to the rear column.
    parts.append(cylinder("HandWheel", (1.215, 0.10, 1.32), 0.36, 0.18, lilac, (0.0, math.pi / 2, 0.0), 20))
    parts.append(cylinder("HandWheelHub", (1.32, 0.10, 1.32), 0.13, 0.22, yellow, (0.0, math.pi / 2, 0.0), 16))
    for angle in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
        parts.append(cylinder(
            f"WheelDot_{angle:.2f}",
            (1.322, 0.10 + math.sin(angle) * 0.245, 1.32 + math.cos(angle) * 0.245),
            0.045,
            0.025,
            cream,
            (0.0, math.pi / 2, 0.0),
            10,
        ))

    # Spool and pin sit directly on the arm.
    parts.append(cylinder("SpoolPin", (0.26, 0.08, 2.20), 0.025, 0.31, metal, vertices=10))
    parts.append(cylinder("ThreadSpool", (0.26, 0.08, 2.28), 0.15, 0.30, pink, vertices=16))
    parts.append(cylinder("SpoolCapTop", (0.26, 0.08, 2.445), 0.19, 0.055, yellow, vertices=16))
    parts.append(cylinder("SpoolCapBottom", (0.26, 0.08, 2.115), 0.19, 0.055, yellow, vertices=16))

    # Thread visually connects the spool, guide and needle head.
    parts.append(tube("Thread", [(0.26, 0.08, 2.28), (-0.18, -0.31, 2.02), (-0.73, -0.32, 1.78), (-0.72, -0.20, 1.05)], 0.014, dark, 1))
    parts.append(cylinder("ThreadGuide", (-0.20, -0.34, 1.99), 0.055, 0.05, metal, (math.pi / 2, 0.0, 0.0), 12))

    # Friendly controls and a small heart badge on the front.
    parts.append(sphere("ButtonPink", (0.46, -0.355, 1.79), 0.10, pink, (1.0, 0.32, 1.0)))
    parts.append(sphere("ButtonYellow", (0.72, -0.355, 1.79), 0.075, yellow, (1.0, 0.32, 1.0)))
    parts.append(sphere("HeartLeft", (0.05, -0.365, 1.78), 0.105, pink, (0.85, 0.25, 1.0)))
    parts.append(sphere("HeartRight", (0.18, -0.365, 1.78), 0.105, pink, (0.85, 0.25, 1.0)))
    parts.append(box("HeartPoint", (0.115, -0.365, 1.67), (0.18, 0.05, 0.18), pink, 0.035, (0.0, math.pi / 4, 0.0)))

    # Four integrated feet meet the base rather than floating below it.
    for index, (x, y) in enumerate(((-1.02, -0.42), (-1.02, 0.42), (1.02, -0.42), (1.02, 0.42))):
        parts.append(box(f"Foot_{index}", (x, y, 0.035), (0.34, 0.26, 0.10), lilac, 0.035))

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    machine = bpy.context.object
    machine.name = "kawaii_sewing_machine"
    machine.data.name = "kawaii_sewing_machine_mesh"
    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return machine


def bake_base_color(obj):
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.device = "CPU"
    bpy.context.scene.cycles.samples = 1
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.025)
    bpy.ops.object.mode_set(mode="OBJECT")

    image = bpy.data.images.new("sewing_machine_BaseColor", width=1024, height=1024, alpha=False)
    image.filepath_raw = str(TEXTURE_PATH)
    image.file_format = "PNG"

    for mat in obj.data.materials:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.name = "BakeTarget"
        node.image = image
        mat.node_tree.nodes.active = node

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.bake.use_clear = True
    scene.render.bake.margin = 8
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"})
    image.save()
    image.pack()

    baked = bpy.data.materials.new("SewingMachine_BaseColor_PBR")
    baked.use_nodes = True
    nodes = baked.node_tree.nodes
    links = baked.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.58
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    obj.data.materials.clear()
    obj.data.materials.append(baked)


def validate(obj):
    mesh = obj.data
    loose = sum(1 for vertex in mesh.vertices if not vertex.link_edges) if hasattr(mesh.vertices[0], "link_edges") else 0
    triangles = sum(max(0, len(poly.vertices) - 2) for poly in mesh.polygons)
    if len(mesh.vertices) == 0 or triangles == 0:
        raise RuntimeError("Empty sewing machine geometry")
    return len(mesh.vertices), triangles, loose


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    clean_scene()
    machine = build_machine()
    bake_base_color(machine)
    stats = validate(machine)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    machine.select_set(True)
    bpy.context.view_layer.objects.active = machine
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
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
    print(f"SEWING_MACHINE_GEOMETRY=vertices:{stats[0]},triangles:{stats[1]},loose:{stats[2]}")
    print(f"SEWING_MACHINE_BLEND={BLEND_PATH}")
    print(f"SEWING_MACHINE_GLB={GLB_PATH}")
    print(f"SEWING_MACHINE_TEXTURE={TEXTURE_PATH}")


if __name__ == "__main__":
    main()
