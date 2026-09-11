import type { HouseTransform, HouseVector3 } from '../farming/types'

export type HouseFurnitureKind = 'furniture' | 'planter'
export type HouseZoneId = 'living-room' | 'tower' | 'greenhouse'

export interface HouseFurnitureDefinition {
  id: string
  name: string
  model: string
  kind: HouseFurnitureKind
  defaultScale: HouseVector3
  inventoryIcon?: string
  pickupBehavior?: 'craftpack'
}

export interface HouseBoxContentDefinition {
  instanceId: string
  furnitureId: string
  offset: HouseVector3
  rotation: HouseVector3
  scale?: HouseVector3
}

export interface HouseBoxDefinition {
  id: string
  name: string
  zone: HouseZoneId
  closedModel: string
  openModel: string
  transform: HouseTransform
  contents: HouseBoxContentDefinition[]
}

export const HOUSE_SYSTEM_CONFIG = {
  enabled: true,
  interactionDistance: 8,
  autoSaveDelayMs: 600,
  moveSpeedMetersPerSecond: 1.5,
  moveTapStepMeters: 0.25,
  moveHandleDistance: 1.35,
  gizmoLineLength: 1.9,
  gizmoLineThickness: 0.045,
  gizmoHandleSize: 0.18,
  rotationStepDegrees: 90
} as const

const FURNITURE_FOLDER = 'assets/scene/Models/furniture_boxes'
export const FURNITURE_INVENTORY_ICON_FOLDER = 'assets/scene/ui/inventory/items/furniture'
export const CRAFTPACK_INVENTORY_ITEM_ID = 'craftpack_backpack'

const FURNITURE_ICON_FILENAMES: Record<string, string> = {
  bookshelf: 'bookshelf.png',
  chair01: 'chair_01.png',
  chimney: 'chimney.png',
  lampInterior: 'lamp_interior.png',
  sofa02: 'sofa_02.png',
  sofa01: 'sofa_01.png',
  table: 'table.png',
  woodDeck: 'wood_deck.png',
  chair02: 'chair_02.png',
  campfire: 'campfire.png',
  lampExterior: 'lamp_exterior.png',
  plant01: 'plant_01.png',
  plant02: 'plant_02.png',
  plant03: 'plant_03.png',
  bed: 'bed.png',
  computer: 'computer.png',
  robot: 'robot.png',
  speaker: 'parlante.png',
  backpack: 'craftpack_backpack.png',
  minitable: 'minitable.png',
  drone: 'drone.png'
}

export function houseOpenBoxInventoryIcon(boxId: string): string {
  const filename = boxId === 'living-room-box'
    ? 'box_living_room_open.png'
    : boxId === 'greenhouse-box'
      ? 'box_greenhouse_open.png'
      : 'box_tower_open.png'
  return `${FURNITURE_INVENTORY_ICON_FOLDER}/${filename}`
}

// Add every furniture or movable pot GLB here. The id is permanent: once a
// player has unpacked a box, changing an id would orphan their saved placement.
export const HOUSE_FURNITURE: Record<string, HouseFurnitureDefinition> = {
  bookshelf: furniture('bookshelf', 'Bookshelf', 'Bookshelf.glb', 0.25),
  chair01: furniture('chair01', 'Chair 01', 'Chair_01.glb', 0.8),
  chimney: furniture('chimney', 'Chimney', 'Chimney.glb', 0.9),
  lampInterior: furniture('lampInterior', 'Interior Lamp', 'Lamp_interior.glb', 0.7),
  sofa02: furniture('sofa02', 'Sofa 02', 'Sofa_02.glb', 0.75),
  sofa01: furniture('sofa01', 'Sofa 01', 'Sofa_01.glb', 1.45),
  table: furniture('table', 'Table', 'Table.glb', 0.8),
  woodDeck: furniture('woodDeck', 'Wood Deck', 'Wood_deck.glb', 0.3),
  chair02: furniture('chair02', 'Chair 02', 'Chair_02.glb', 0.8),
  campfire: furniture('campfire', 'Campfire', 'Campfire.glb', 0.6),
  lampExterior: furniture('lampExterior', 'Exterior Lamp', 'Lamp_exterior.glb', 0.6),
  plant01: furniture('plant01', 'Plant 01', 'Plant_01.glb', 0.8),
  plant02: furniture('plant02', 'Plant 02', 'Plant_02.glb', 1),
  plant03: furniture('plant03', 'Plant 03', 'Plant_03.glb', 1),
  bed: furniture('bed', 'Bed', 'bed.glb', 1),
  computer: furniture('computer', 'Computer', 'computer.glb', 1),
  robot: furniture('robot', 'Robot', 'robot.glb', 1),
  speaker: furniture('speaker', 'Speaker', 'parlante.glb', 1),
  backpack: {
    ...furniture('backpack', 'Craftpack Backpack', 'mochila.glb', 1),
    pickupBehavior: 'craftpack'
  },
  minitable: furniture('minitable', 'Mini Table', 'minitable.glb', 1),
  drone: furniture('drone', 'Drone', 'drone.glb', 1)
}

// Each box defines where it appears and the local arrangement unpacked around
// it. Keep every instanceId unique across the whole house.
export const HOUSE_BOXES: HouseBoxDefinition[] = [
  houseBox('living-room-box', 'Living Room Box', 'living-room', { x: 336, y: 31, z: 353.25 }, [
    content('living-bookshelf', 'bookshelf', -0.5, 0, 3.25, 0),
    content('living-chair-01', 'chair01', -2.5, 0, 0.75, 0),
    content('living-chimney', 'chimney', -0.5, 0, 5.5, 270),
    content('living-lamp-interior', 'lampInterior', -1.23, 3.96, 2.62, 0),
    content('living-sofa-02', 'sofa02', -8.5, -0.19, 4.25, 90),
    content('living-sofa-01', 'sofa01', -8.36, -0.16, 7.87, 118.16),
    content('living-table', 'table', 0.49, -0.16, 1.66, 0)
  ]),
  houseBox('greenhouse-box', 'Greenhouse Box', 'greenhouse', { x: 334.5, y: 31, z: 364.75 }, [
    content('greenhouse-wood-deck', 'woodDeck', -6.84, 0, 4.41, 0),
    content('greenhouse-chair-02', 'chair02', -0.5, 0, 2.75, 280),
    content('greenhouse-campfire', 'campfire', -2.75, 0, 3.5, 0),
    content('greenhouse-lamp-exterior', 'lampExterior', -0.5, 2, -0.75, 270),
    content('greenhouse-plant-01', 'plant01', -6.67, 0, 0.66, 0),
    content('greenhouse-plant-02', 'plant02', 0.24, -0.15, 4.85, 0),
    content('greenhouse-plant-03', 'plant03', -1.75, -0.15, 5.25, 0)
  ]),
  houseBox('tower-box', 'Tower Box', 'tower', { x: 343.5, y: 50.75, z: 365.25 }, [
    content('tower-bed', 'bed', -2.75, 0, -0.75, 0),
    content('tower-computer', 'computer', -5.18, 0.86, 0, 90),
    content('tower-robot', 'robot', -3.78, -0.6, 1.18, 123.1),
    content('tower-speaker', 'speaker', -2.61, -0.16, 5.36, 154.96),
    content('tower-backpack', 'backpack', -4.38, -0.1, 5.3, 112.49),
    content('tower-minitable', 'minitable', 1, -0.17, 0.88, 0),
    content('tower-drone', 'drone', 0.84, 2.33, 1.22, 288.04)
  ])
]

function furniture(id: string, name: string, filename: string, scale: number): HouseFurnitureDefinition {
  return {
    id,
    name,
    model: `${FURNITURE_FOLDER}/${filename}`,
    kind: 'furniture',
    defaultScale: { x: scale, y: scale, z: scale },
    inventoryIcon: `${FURNITURE_INVENTORY_ICON_FOLDER}/${FURNITURE_ICON_FILENAMES[id]}`
  }
}

function content(
  instanceId: string,
  furnitureId: string,
  x: number,
  y: number,
  z: number,
  rotationY: number
): HouseBoxContentDefinition {
  return {
    instanceId,
    furnitureId,
    offset: { x, y, z },
    rotation: { x: 0, y: rotationY, z: 0 }
  }
}

function houseBox(
  id: string,
  name: string,
  zone: HouseZoneId,
  position: HouseVector3,
  contents: HouseBoxContentDefinition[]
): HouseBoxDefinition {
  return {
    id,
    name,
    zone,
    closedModel: `${FURNITURE_FOLDER}/box_closed.glb`,
    openModel: `${FURNITURE_FOLDER}/box_open.glb`,
    transform: {
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    contents
  }
}
