import { CropDefinition } from './types'

export const CROPS: Record<string, CropDefinition> = {

  eggplant: {

    id: 'eggplant',

    displayName: 'Eggplant',

    seedItem: 'seed_eggplant',

    cropItem: 'eggplant',

    growTime: 1800000,

    yieldMin: 10,

    yieldMax: 25,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_eggplant.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/eggplant/eggplant_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/eggplant/eggplant_stage_2.glb'

  },

  tomato: {

    id: 'tomato',

    displayName: 'Tomato',

    seedItem: 'seed_tomato',

    cropItem: 'tomato',

    growTime: 1800000,

    yieldMin: 10,

    yieldMax: 24,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_tomato.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/tomato/tomato_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/tomato/tomato_stage_2.glb'

  },

  cheese: {

    id: 'cheese',

    displayName: 'Cheese',

    seedItem: 'seed_cheese',

    cropItem: 'cheese',

    growTime: 2400000,

    yieldMin: 10,

    yieldMax: 23,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_cheese.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/cheese/cheese_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/cheese/cheese_stage_2.glb'

  },

  potato: {

    id: 'potato',

    displayName: 'Potato',

    seedItem: 'seed_potato',

    cropItem: 'potato',

    growTime: 1200000,

    yieldMin: 10,

    yieldMax: 25,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_potato.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/potato/potato_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/potato/potato_stage_2.glb'

  },

  carrot: {

    id: 'carrot',

    displayName: 'Carrot',

    seedItem: 'seed_carrot',

    cropItem: 'carrot',

    growTime: 1200000,

    yieldMin: 10,

    yieldMax: 24,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_carrot.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/carrot/carrot_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/carrot/carrot_stage_2.glb'

  },

  onion: {

    id: 'onion',

    displayName: 'Onion',

    seedItem: 'seed_onion',

    cropItem: 'onion',

    growTime: 1800000,

    yieldMin: 10,

    yieldMax: 24,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_onion.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/onions/onion_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/onions/onion_stage_2.glb'

  },

    humita: {

    id: 'humita',

    displayName: 'Humita',

    seedItem: 'seed_humita',

    cropItem: 'humita',

    growTime: 2200000,

    yieldMin: 10,

    yieldMax: 24,

    seedModel:
      'assets/scene/Models/farming/seeds/seed_humita.glb',

    stage1Model:
      'assets/scene/Models/farming/crops/humita/humita_stage_1.glb',

    stage2Model:
      'assets/scene/Models/farming/crops/humita/humita_stage_2.glb'

  }

}

export function getCrop(id: string): CropDefinition {

  const crop = CROPS[id]

  if (!crop) {

    throw new Error(`Crop "${id}" not found`)

  }

  return crop

}

export function getAllCrops(): CropDefinition[] {

  return Object.values(CROPS)

}

export function getCropBySeedItem(
  seedItem: string
): CropDefinition | null {

  for (const crop of Object.values(CROPS)) {

    if (crop.seedItem === seedItem) {

      return crop

    }

  }

  return null

}
