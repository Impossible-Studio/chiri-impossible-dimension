import { engine, Schemas } from '@dcl/sdk/ecs'

/*
|--------------------------------------------------------------------------
| SEED
|--------------------------------------------------------------------------
| Representa un frasco de semillas colocado en el mundo.
| Una vez recogido queda marcado como picked.
*/

export const SeedComponent = engine.defineComponent(
  'SeedComponent',
  {
    cropId: Schemas.String,
    seedId: Schemas.Number,
    picked: Schemas.Boolean
  },
  {
    picked: false
  }
)

/*
|--------------------------------------------------------------------------
| FARM PLOT
|--------------------------------------------------------------------------
| Cada espacio de la huerta donde se puede plantar.
*/

export const FarmPlotComponent = engine.defineComponent(
  'FarmPlotComponent',
  {
    plotId: Schemas.Number,
    occupied: Schemas.Boolean,
    cropId: Schemas.String
  },
  {
    occupied: false,
    cropId: ''
  }
)

/*
|--------------------------------------------------------------------------
| CROP
|--------------------------------------------------------------------------
| Planta actualmente sembrada en un plot.
*/

export const CropComponent = engine.defineComponent(
  'CropComponent',
  {
    plotId: Schemas.Number,
    cropId: Schemas.String,
    stage: Schemas.Number,
    plantedAt: Schemas.Number,
    harvested: Schemas.Boolean
  },
  {
    stage: 1,
    harvested: false
  }
)