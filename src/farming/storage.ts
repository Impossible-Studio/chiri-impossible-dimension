import { CONFIG } from './config'
import {
  PlayerData,
  Inventory,
  PlotData,
  PlayerProgress,
  PlayerHouse,
  createDefaultPlayerProgress,
  normalizePlayerProgress,
  createDefaultPlayerHouse,
  normalizePlayerHouse
} from './types'
import { migrateLegacyPreparedMate } from './inventoryMigrations'

function headers() {
  return {
    apikey: CONFIG.SUPABASE_KEY,
    Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates'
  }
}

async function request(
  url: string,
  options: RequestInit
) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(
      `Supabase Error ${response.status}`
    )
  }

  return response
}

export async function loadPlayer(
  wallet: string
): Promise<PlayerData | null> {

  try {

    const response = await request(

      `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,

      {
        method: 'GET',
        headers: headers()
      }

    )

    const data = await response.json()

    if (data.length === 0) {

      return null

    }

    const inventory: Inventory = {

  items:
    data[0].inventory?.items ?? {},

  itemOrder:
    data[0].inventory?.itemOrder
    ??
    Object.keys(
      data[0].inventory?.items ?? {}
    )

}


const hadLegacyInventoryOrder =
  !Array.isArray(
    data[0].inventory?.itemOrder
  )
const migratedPreparedMate = migrateLegacyPreparedMate(inventory)
const needsInventoryMigration =
  hadLegacyInventoryOrder || migratedPreparedMate


if (needsInventoryMigration) {

  await saveInventory(
    data[0].wallet,
    inventory
  )

}


const progress = normalizePlayerProgress(data[0].progress)
const house = normalizePlayerHouse(data[0].house)

if (data[0].progress?.version !== progress.version) {
  await saveProgress(data[0].wallet, progress)
}

return {

  wallet: data[0].wallet,

  inventory,

  plots: data[0].plots ?? {},

  collected: data[0].collected ?? {},

  progress,

  house

}

  } catch (error) {

    console.log(error)

    return null

  }

}

export async function createPlayer(
  wallet: string
): Promise<PlayerData> {

  const plots: Record<number, PlotData | null> = {}

  for (let i = 1; i <= 16; i++) {

    plots[i] = null

  }

  const player: PlayerData = {

    wallet,

    inventory: {

  items: {},

  itemOrder: []

},

    plots,

    collected: {},

    progress: createDefaultPlayerProgress(),

    house: createDefaultPlayerHouse()

  }

  // Keep creation compatible while the house migration is being installed.
  // When the column exists, Supabase supplies its JSONB default; the first
  // furniture change then saves the in-memory house state normally.
  const { house: _house, ...newPlayerRow } = player

  await request(

    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}`,

    {

      method: 'POST',

      headers: headers(),

      body: JSON.stringify(newPlayerRow)

    }

  )

  return player

}

export async function getOrCreatePlayer(
  wallet: string
): Promise<PlayerData> {

  const player = await loadPlayer(wallet)

  if (player) {

    return player

  }

  return await createPlayer(wallet)

}

export async function saveInventory(
  wallet: string,
  inventory: Inventory
) {

  await request(

    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,

    {

      method: 'PATCH',

      headers: headers(),

      body: JSON.stringify({

        inventory

      })

    }

  )

}

export async function savePlots(
  wallet: string,
  plots: Record<number, PlotData | null>
) {

  await request(

    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,

    {

      method: 'PATCH',

      headers: headers(),

      body: JSON.stringify({

        plots

      })

    }

  )

}

export async function saveCollected(
  wallet: string,
  collected: Record<string, number[]>
) {

  await request(

    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,

    {

      method: 'PATCH',

      headers: headers(),

      body: JSON.stringify({

        collected

      })

    }

  )

}

export async function saveProgress(
  wallet: string,
  progress: PlayerProgress
) {

  await request(

    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,

    {
      method: 'PATCH',

      headers: headers(),

      body: JSON.stringify({

        progress

      })

    }

  )

}

// One row update keeps a cooking reward/cost and its completed order together.
export async function saveCookingState(wallet: string, inventory: Inventory, progress: PlayerProgress) {
  await request(
    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify({ inventory, progress }) }
  )
}

export async function saveHouse(
  wallet: string,
  house: PlayerHouse
) {
  await request(
    `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE_NAME}?wallet=eq.${wallet}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ house })
    }
  )
}

export interface PublicHouseSnapshot {
  wallet: string
  house: PlayerHouse
  plots: Record<number, PlotData | null>
}

// The SQL function returns only houses whose owner selected "public". This is
// deliberately separate from loadPlayer so a visitor can never receive the
// owner's inventory, quests, collected spawns or other private player data.
export async function loadPublicHouse(
  wallet: string
): Promise<PublicHouseSnapshot | null> {
  try {
    const response = await request(
      `${CONFIG.SUPABASE_URL}/rest/v1/rpc/get_public_player_house`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ target_wallet: wallet })
      }
    )

    const data = await response.json()
    const row = Array.isArray(data) ? data[0] : data

    if (!row?.wallet || !row?.house) return null

    return {
      wallet: row.wallet,
      house: normalizePlayerHouse(row.house),
      plots: row.plots ?? {}
    }
  } catch (error) {
    console.log('PUBLIC HOUSE LOAD FAILED')
    console.log(error)
    return null
  }
}
