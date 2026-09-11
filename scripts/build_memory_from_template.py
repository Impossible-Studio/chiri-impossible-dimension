import sys
from pathlib import Path

import bpy


def script_args():
    separator = sys.argv.index("--") if "--" in sys.argv else len(sys.argv)
    values = sys.argv[separator + 1 :]
    if len(values) != 4:
        raise SystemExit("Expected: NUMBER SOURCE_IMAGE GLB_PATH BLEND_PATH")
    return int(values[0]), *(Path(value).resolve() for value in values[1:])


def find_page_and_collider():
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    collider = next((obj for obj in meshes if obj.name.endswith("_collider")), None)
    page = next((obj for obj in meshes if obj is not collider), None)
    if page is None or collider is None:
        raise RuntimeError("The template must contain one page mesh and one _collider mesh")
    return page, collider


def replace_artwork(page, number, source_image):
    artwork = next(
        (
            material
            for material in page.data.materials
            if material and "Artwork" in material.name
        ),
        None,
    )
    if artwork is None or not artwork.use_nodes:
        raise RuntimeError("Artwork material was not found in the template")

    artwork.name = f"Memory_{number}_Artwork"
    image = bpy.data.images.load(str(source_image), check_existing=False)
    image.name = f"Memory_{number}_Image"
    image.pack()

    texture_nodes = [
        node for node in artwork.node_tree.nodes if node.type == "TEX_IMAGE"
    ]
    if not texture_nodes:
        raise RuntimeError("Artwork material has no image texture node")
    for node in texture_nodes:
        node.image = image

    for material in page.data.materials:
        if material and "White" in material.name:
            material.name = f"Memory_{number}_White"


def export_glb(page, collider, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    page.select_set(True)
    collider.select_set(True)
    bpy.context.view_layer.objects.active = page
    bpy.ops.export_scene.gltf(
        filepath=str(path),
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
    number, source_image, glb_path, blend_path = script_args()
    if not source_image.is_file():
        raise FileNotFoundError(source_image)

    page, collider = find_page_and_collider()
    page.name = f"memory_{number}_page"
    page.data.name = f"memory_{number}_page_mesh"
    collider.name = f"memory_{number}_page_collider"
    collider.data.name = f"memory_{number}_page_collider_mesh"
    replace_artwork(page, number, source_image)

    # Remove images that belonged only to the template, while keeping the new
    # packed artwork and Blender's internal render buffers.
    for image in list(bpy.data.images):
        if image.name.startswith("Memory_1_Image") and image.users == 0:
            bpy.data.images.remove(image)

    blend_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    export_glb(page, collider, glb_path)

    dims = tuple(round(value, 5) for value in page.dimensions)
    print(
        f"MEMORY_{number}=dimensions:{dims},visual:{page.name},"
        f"collider:{collider.name},glb:{glb_path},blend:{blend_path}"
    )


if __name__ == "__main__":
    main()
