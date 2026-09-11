# Cooking: horno y mate

El fondo, marco, máscara, nueve barras, estados activos y GLB del horno ya están
conectados. Los pickups de masa, queso y yerba ya están conectados; todavía
faltan algunos PNG. No se entregan
ingredientes gratis ni se modifican partidas remotas al compilar. Arcade queda
bloqueado con «SOON».

## Entrada desde el horno

El sistema crea por código `assets/scene/Models/cooking/oven.glb` en
341.25, 31, 346, escala 1 y rotación 0,0,0. No depende de que el modelo exista
en Creator Hub. Su collider permite hover/click y abre el selector. El selector
sigue usando controles temporales de texto Cook / Arcade porque la carpeta
`mode-menu` aún no contiene sus PNG finales. No se añadió click a Chiri.

En cookingConfig.ts, `COOKING_UI_CONFIG.showTestButton: true` muestra un acceso
temporal «Test kitchen»; debe volver a `false` antes de publicar.

Los tests usan inventarios simulados: node tools/testCooking.cjs. Para cocinar
en el mundo hacen falta items reales pizza_dough, eggplant, yerba y un mate
desbloqueado. Los GLB de masa y yerba se conectarán cuando estén disponibles.

## Calor y cocción

COOKING_HEAT_CONFIG, en cookingConfig.ts:

- min: 0, max: 10: límites; 0 apaga el fuego.
- Click en +/−: cambia exactamente 1 punto.
- holdDelaySeconds: 0.35: demora antes de repetir al mantener pulsado.
- holdRepeatSeconds: 0.12: intervalo de repetición.
- extraSpeedPerHeatPoint: 0.3: calor 10 cocina 3.7 veces más rápido que calor 1.

El tiempo base se sortea al prender Flame: pizza 10–15 segundos y humita 5–10
segundos a calor 1. Después se aplica el multiplicador de los diez niveles.

Al soltar, salir del botón, cerrar el horno o suspender la app deja de repetirse
el input. La cocción sigue aunque no mantengas el botón. Bajar el fuego desacelera
la cocción; apagarla la pausa, sin retroceder lo ya cocinado.

Orden: yellow1 → yellow2 → yellow3 → green1 → green2 → green3 → red1 → red2 → red3.
Green3 está listo; red1/red2 aún se pueden retirar; red3 quema inmediatamente.
Las tres líneas van cambiando de color, no se escalan por su recorte visible.
La preparación quemada muestra Overcooked y un click en el horno la limpia.
Los ingredientes ya gastados no se devuelven.

## Preparaciones y pedidos

El armado del horno exige elegir primero una base. Mientras no tenga ingredientes,
otra base la reemplaza y volver a tocar la misma la retira. El primer ingrediente
bloquea la base; cada ingrediente se puede retirar tocándolo otra vez. Las capas
de masa, humita, berenjena y queso son lienzos transparentes completos 1536×1024.

La pizza exige masa + berenjena + queso. Humita es una
base cerrada: no admite ingredientes. Seleccionar no gasta objetos ni comienza
la cocción. Flame valida la receta, descuenta la preparación una sola vez, prende
en calor 1 y muestra yellow1. `flame_glow` permanece mientras está encendido;
`flame_active` aparece solamente mientras se mantiene presionado el botón.
Los botones −/+ solo actúan después de Flame.
Ready entrega una sola vez y guarda la comida en la mochila.

Mate: elegir una base desbloqueada, mantener el item yerba, soltar cuando indique
Yerba OK, luego mantener agua y soltar al indicar Mate ready. Ready entrega un
item específico (`prepared_mate_infinite`, `prepared_mate_supersonic`,
`prepared_mate_relique` o `prepared_mate_alchemist`) según la taza usada. Su PNG
transparente se compone sobre el fondo Cooking del inventario. La taza coleccionable no se gasta. Se descuenta una yerba al
empezar a servir, incluso si era la última unidad; el control queda disponible
con cantidad 0 hasta terminar esa preparación. Si se derrama solo agua o solo
yerba, se puede entregar pero Chiri comenta que quedó mal preparado. Si se
derraman ambas, el intento queda inválido; clickear su aviso reinicia la zona.

COOKING_MATE_CONFIG ajusta tiempos y margen de derrame. Infinite es lento,
Supersonic rápido, Relique intermedio e impredecible y Alchemist intermedio pero
exige `yerba_alchemist`. Ese item especial todavía no existe en el inventario.
No hay servido automático con un click corto.

Los pedidos iniciales son pizza de berenjena y mate. Al preparar ambos se completa
la misión 2 del Chapter 1. El panel se cierra antes de la presentación de misión.
Las comidas siguen en inventario para dárselas a Chiri cuando exista esa UI.
Después queda cocina libre, sin repetir la misión ni cerrar cada vez el horno.
Cada preparación terminada suma POINTS_CONFIG.foodPrepared (25 inicialmente).

Se usan las columnas existentes de Supabase inventory y progress, guardadas
juntas por la cocina. Los flags cookingOrder:eggplant-pizza y cookingOrder:mate
conservan los pedidos terminados al volver a entrar. No hace falta SQL nuevo.
Si falla el guardado, se informa y se detiene la cocina hasta reconectar.

## Tamaño y capas

COOKING_UI_CONFIG.desktop/mobile tiene scale, offsetX, offsetY.
Valores iniciales del inventario: 0.8 desktop / 0.63 mobile. Si no entra,
se reduce proporcionalmente para dejar 8 px de margen, manteniendo el centro
del viewport real. No se modifica la UI del inventario ni del mapa.

timerFontSize: texto del contador.

Los PNG de los mates no usan coordenadas internas. Cada archivo de
`oven/mates` debe conservar el lienzo transparente completo 1536×1024 con el
mate ya diseñado en su lugar. Se centra y escala junto con todo el background.
Por ahora solo está presente y conectado `mate_infinite_cooking.png`; los otros
mates se conectan cuando sus archivos aparezcan en esa carpeta.

cookingLayout.ts → COOKING_ITEM_SCALES.desktop/mobile:

- bases: los cuatro de la izquierda.
- ingredients: los cuatro de la derecha.
- orders: los tres pedidos de arriba.

Cada escala cambia todas las capas de CADA tarjeta, sin separar sus centros.
Se reutiliza ItemCard del inventario, incluidas cantidad, dimensión y nombre.
Los PNG completos de mates no llevan un segundo fondo.

El marco se dibuja después de los pedidos y la preparación del mate. El fondo,
marco, barras y chorros conservan el mismo lienzo 1536×1024 y la misma escala.
Los controles se dibujan al final, encima de las capas transparentes.

## Dónde agregar los próximos PNG

- assets/scene/ui/cooking/oven/: estados del horno, Overcooked, yerba/agua OK y
  derramadas. Si son overlays del horno completo, conservar 1536×1024 transparente.
- assets/scene/ui/cooking/mode-menu/: menú Cook/Arcade y máscara; Cook #00FF00,
  Arcade #0000FF, cerrar #FF00FF. Hay que conectar su diseño final y sus regiones.
- Los iconos de items pueden quedar con los del inventario; apuntar sus rutas en
  COOKING_ITEM_ART. Mientras falten se ve la tarjeta con nombre, sin imagen falsa.
- Los PNG de bases e ingredientes del horno viven en `oven/ingredients`, siempre
  con lienzo completo 1536×1024. Se conectan en COOKING_OVEN_BASE_ART y
  COOKING_OVEN_INGREDIENT_ART; no usan coordenadas manuales.
- Las rutas vacías de COOKING_ART usan texto temporal, nunca archivos inexistentes.

La máscara vive en `assets/scene/ui/cooking/masks/cooking_mask.png`. Flame usa
`#FF4000`. Si cambia, ejecutar node tools/generateCookingMask.cjs para regenerar
sus 23 regiones de interacción.

## Mates alrededor de la casa

Infinite: 5 para desbloquear. Supersonic y Relique: 20. Los extras siguen dando
solo puntos, sin duplicar el coleccionable. Se mantienen 100/50/50 en el mundo.
En src/mates/mateLocations.ts, HOUSE_INFINITE_MATES recoloca seis IDs existentes
(95–100) por la zona de casa/huerta. Son coordenadas mundiales, con un raycast corto
hacia el suelo. No se reinician los IDs ya recogidos. Revisar sus ubicaciones con
una caminata en el deploy antes de dar por validado el recorrido dentro de la casa.

## Verificación pendiente

Las pruebas locales cubren controles, costos, quemado, servido, escalas y capas.
No sustituyen probar el horno en la app real de iPhone/Android. No se hizo deploy
ni se ejecutaron operaciones de datos en Supabase durante esta implementación.
