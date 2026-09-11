# Compatibilidad mobile — 3 septiembre 2026

## Ascensores y hormigas

No hace falta exportarlos por separado ni agregarlos otra vez al Creator Hub.
El editor y desktop conservan los GLB originales. `mobileSceneModels.ts` sustituye
únicamente esos dos modelos en mobile, sobre las mismas entidades: se conservan
transformaciones, visibilidad, jerarquía y máscaras de colisión.

Copias generadas junto a los originales:

- `assets/scene/Models/ascensores/ascensores_mobile.glb`: los dos ascensores en `lifts_loop`.
- `assets/scene/Models/ants_fn_2/ants_fn_2_mobile.glb`: las 18 hormigas en `ants_loop`.

El cliente mobile tiene un controlador de mezcla para varios clips, y otro
camino para un único clip/estado. Usamos el segundo como workaround; no significa
que haya un límite de una hormiga ni que mobile no soporte varias animaciones.
El anterior reinicio de los 2/18 clips seguía usando el controlador múltiple.
No se pudo reproducir el fallo dentro del teléfono desde este entorno, por lo
que el resultado visual necesita prueba con el siguiente deploy.

Las copias conservan todos los nodos, colliders, geometría, materiales, texturas
y valores de las poses. Los ascensores mantienen su loop de 8.333 s. Los clips
de hormigas tenían duraciones distintas (32.375–35.958 s); se normalizan a 35.958 s
para que ninguna quede esperando al final. Algunas caminan hasta aproximadamente
10% más lento, sin cambiar sus caminos. Desktop conserva los tiempos originales.

Al reemplazar un original, regenerar:

```sh
node tools/generateMobileAnimationModels.cjs
node tools/generateMobileAnimationModels.cjs --check
node tools/testChiriMobile.cjs
```

El generador rechaza canales que compitan por la misma propiedad de un nodo.
No modificar las copias generadas a mano. No sustituir `main.composite` por ellas.

## Spawn de Chiri

El retorno usaba una posición 3.5 m adelante y aceptaba sin límite el primer
collider detectado desde 2.8 m por encima: podía confundir un elemento alto con
el piso. El teletransporte de recuperación usaba otra posición y el piso del
avatar, por eso podía corregirlo después.

Ahora el retorno comparte la posición de seguimiento/teletransporte, espera
que se estabilice la altura inicial del avatar y usa un rayo más bajo con
validación de altura. Chiri permanece oculto hasta recibir un piso físico
válido: ya no usa la altura aérea estimada como salida de emergencia. Un
teleport durante la partida vuelve a activar esta misma espera de aterrizaje.
No se cambiaron las velocidades, sensores frontales, salto/wave de presentación
ni tiempos de idle/bored.

En `../companion/chiriCompanion.ts`: `spawnMinWaitSeconds` (3),
`spawnStableSeconds` (0.75), `spawnMaxVerticalSpeed` (0.15) y
`teleportLandingMinWaitSeconds` (0.35). La espera adicional evita tomar como
estable un frame intermedio mientras el avatar todavía cae desde el spawn.
`chiriSpawnGround.ts` contiene las comprobaciones aisladas.

## Backface culling y versiones por dispositivo

Mobile sí admite backface culling. En glTF, `doubleSided: true` desactiva ese
descarte para ese material; no duplica una textura. Los siete materiales del
GLB local `isla_casa_chiri.glb` ya tienen `doubleSided: true`.

Se pueden elegir rutas GLB distintas con `isMobile()`. Para una casa:

1. Mantener el mismo origen, escala, posición y nombres necesarios en ambas versiones.
2. Mantener colliders y puntos interactivos coherentes entre dispositivos.
3. Crear una versión mobile optimizada si hace falta; no quitar caras suponiendo
   que el teléfono nunca las descarta. Material doble cara también cuesta renderizar.
4. Usar espesor/paredes interiores donde corresponde. Antes de duplicar geometría
   o texturas, probar materiales y normales en ambos clientes.

No se alteró la casa ni se crearon versiones nuevas de ella. La sustitución de
modelos actuales sirve de ejemplo; una casa estática no necesita un Animator.
La sustitución de entidades importadas por Creator Hub puede ocurrir después
de que el cliente haya solicitado el original, así que no garantiza por sí sola
que solo se descargue uno. Para ahorrar descarga desde el inicio, la entidad
debe crearse por código con la ruta elegida para ese dispositivo.

Fuentes oficiales consultadas:

- [Controlador de animaciones de Decentraland mobile](https://github.com/decentraland/godot-explorer/blob/main/lib/src/godot_classes/animator_controller.rs).
- [Importador glTF de Godot, materiales doubleSided](https://github.com/godotengine/godot/blob/4.6-stable/modules/gltf/gltf_document.cpp).
- [Materiales de Decentraland](https://docs.decentraland.org/creator/3d-modeling-and-animations/materials).

## Prueba pendiente en dispositivos

- Entrar con misión 1 ya completada: Chiri aparece apoyado, sin necesitar alejarse.
- Caminar/correr, esperar bored1 y alejarse para confirmar recuperación.
- En iPhone/Android, observar ambos ascensores durante más de 17 s y las 18
  hormigas durante más de 72 s (al menos dos ciclos).
- Desktop: originales, mismos tiempos y presentación inicial jump/wave.

Las pruebas automatizadas verifican lógica y archivos, no sustituyen la prueba
visual dentro de los exploradores. No se desplegó ni se cambiaron datos Supabase.
