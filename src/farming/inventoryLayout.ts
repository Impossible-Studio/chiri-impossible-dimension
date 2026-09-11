import { INVENTORY_SCALE } from '../uiLayout'

export const INVENTORY_WIDTH = 1536
export const INVENTORY_HEIGHT = 1024

export const DRAW_WIDTH =
  INVENTORY_WIDTH * INVENTORY_SCALE

export const DRAW_HEIGHT =
  INVENTORY_HEIGHT * INVENTORY_SCALE

// Fine-tune the notification dot relative to the mini-inventory PNG.
// Negative values move it beyond the top/right edge; positive values move it inward.
export const MINI_INVENTORY_NOTICE_STYLE = {
  size: 24,
  right: 10,
  top: -2
}


export const INVENTORY_TEXT_STYLE = {

  itemName: {
    font: 'sans-serif' as const,
    fontSize: 19,
    textAlign: 'middle-center' as const
  },

  quantity: {
    font: 'sans-serif' as const,
    fontSize: 20,
    textAlign: 'middle-center' as const
  }

}


export const INVENTORY_LAYOUT = {

  slots: [

    {
      id: 1,
      item: { x: 326, y: 394.9 },
      quantity: { x: 395.5, y: 317 },
      name: { x: 326, y: 464.1 }
    },

    {
      id: 2,
      item: { x: 545, y: 394.9 },
      quantity: { x: 614.5, y: 317 },
      name: { x: 545, y: 464.1 }
    },

    {
      id: 3,
      item: { x: 764, y: 394.9 },
      quantity: { x: 833.5, y: 317 },
      name: { x: 764, y: 464.1 }
    },

    {
      id: 4,
      item: { x: 983, y: 394.9 },
      quantity: { x: 1052.5, y: 317 },
      name: { x: 983, y: 464.1 }
    },

    {
      id: 5,
      item: { x: 1202, y: 394.9 },
      quantity: { x: 1271.5, y: 317 },
      name: { x: 1202, y: 464.1 }
    },

    {
      id: 6,
      item: { x: 326, y: 625.5 },
      quantity: { x: 395.5, y: 548 },
      name: { x: 326, y: 695.1 }
    },

    {
      id: 7,
      item: { x: 545, y: 625.5 },
      quantity: { x: 614.5, y: 548 },
      name: { x: 545, y: 695.1 }
    },

    {
      id: 8,
      item: { x: 764, y: 625.5 },
      quantity: { x: 833.5, y: 548 },
      name: { x: 764, y: 695.1 }
    },

    {
      id: 9,
      item: { x: 983, y: 625.5 },
      quantity: { x: 1052.5, y: 548 },
      name: { x: 983, y: 695.1 }
    },

    {
      id: 10,
      item: { x: 1202, y: 625.5 },
      quantity: { x: 1271.5, y: 548 },
      name: { x: 1202, y: 695.1 }
    }

  ]

}

export const INVENTORY_INFO = {

  center: {
    x: 1142,
    y: 887.5
  },

  width: 322,
  height: 73,

  fontSize: 25

}

export const INVENTORY_SLOT_STYLE = {

  backgroundSize: 201,

  itemSize: 150,
  // Negative moves the item image upward without moving its slot background.
  itemOffsetY: -6,

  hoverSize: 255,

  // Full-slot dimension layer. Scale and move it without changing the item icon.
  dimensionLayerScale: 1,
  dimensionLayerOffsetX: -2,
  dimensionLayerOffsetY: 2,

  quantityWidth: 50,
  quantityHeight: 34,
  // Full-slot transparent layer: its PNG matches the item background size.
  quantityCircleOffsetX: 0,
  quantityCircleOffsetY: 0,

  nameWidth: 210,
  nameHeight: 44,

  nameOffsetY: -5

}


// ======================================================
// INVENTORY BUTTON HITBOXES
// Coordenadas basadas en inventory_mask.png
// ======================================================

export const INVENTORY_BUTTONS = {

  farming: {
    x: 463,
    y: 158,
    width: 259,
    height: 123
  },

  inventory: {
    x: 772,
    y: 158,
    width: 331,
    height: 121
  },

  cooking: {
    x: 1075.5,
    y: 157.5,
    width: 248,
    height: 120
  },

  close: {
    x: 1388,
    y: 105,
    width: 81,
    height: 83
  },

  quests: {
    x: 358.5,
    y: 890,
    width: 302,
    height: 141
  },

  previous: {
    x: 692,
    y: 839,
    width: 89,
    height: 83
  },

  next: {
    x: 809,
    y: 839,
    width: 91,
    height: 87
  }

}


// ======================================================
// INVENTORY SLOT HITBOXES
// Basados en los 10 colores de inventory_mask.png
// ======================================================

export const INVENTORY_SLOT_HITBOXES = [

  {
    id: 1,
    x: 325.5,
    y: 394,
    width: 196,
    height: 205
  },

  {
    id: 2,
    x: 544.5,
    y: 394,
    width: 196,
    height: 205
  },

  {
    id: 3,
    x: 763.5,
    y: 394,
    width: 196,
    height: 205
  },

  {
    id: 4,
    x: 982.5,
    y: 394,
    width: 196,
    height: 205
  },

  {
    id: 5,
    x: 1201.5,
    y: 394,
    width: 196,
    height: 205
  },

  {
    id: 6,
    x: 325.5,
    y: 625,
    width: 196,
    height: 205
  },

  {
    id: 7,
    x: 544.5,
    y: 625,
    width: 196,
    height: 205
  },

  {
    id: 8,
    x: 763.5,
    y: 625,
    width: 196,
    height: 205
  },

  {
    id: 9,
    x: 982.5,
    y: 625,
    width: 196,
    height: 205
  },

  {
    id: 10,
    x: 1201.5,
    y: 625,
    width: 196,
    height: 205
  }

]
