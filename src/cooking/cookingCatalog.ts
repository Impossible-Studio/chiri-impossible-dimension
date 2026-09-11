import { ITEM_DATA } from '../farming/itemData'
import { COOKING_ITEM_ART } from './cookingConfig'

// Reuse the established inventory composition. Missing artwork deliberately
// stays empty (visible label + slot), rather than loading nonexistent PNGs.
export function registerCookingCatalog() {
  const template = ITEM_DATA.eggplant
  if (!template) return
  for (const item of Object.values(ITEM_DATA)) {
    if (item.categories.includes('cooking') && (item.type === 'crop' || item.type === 'ingredient')) {
      item.cooking = { group: 'ingredients', interaction: 'toggle' }
    }
  }
  // Humita is a complete base: it goes into the oven alone.
  if (ITEM_DATA.humita) ITEM_DATA.humita.cooking = { group: 'bases', interaction: 'toggle' }
  const entries = [
    { id: 'pizza_dough', name: 'Pizza Dough', icon: COOKING_ITEM_ART.pizzaDough, group: 'bases' as const },
    { id: 'yerba', name: 'Yerba', icon: COOKING_ITEM_ART.yerba, group: 'ingredients' as const },
    { id: 'eggplant_pizza', name: 'Eggplant Pizza', icon: COOKING_ITEM_ART.eggplantPizza },
    { id: 'pizza_eggplant_mate_infinite', name: 'Eggplant Pizza & Infinite Mate', icon: COOKING_ITEM_ART.eggplantPizzaMateInfinite },
    { id: 'plain_noodles', name: 'Plain Noodles', icon: COOKING_ITEM_ART.plainNoodles },
    { id: 'prepared_mate_infinite', name: 'Prepared Infinite Mate', icon: COOKING_ITEM_ART.preparedMateInfinite },
    { id: 'prepared_mate_supersonic', name: 'Prepared Supersonic Mate', icon: COOKING_ITEM_ART.preparedMateSupersonic },
    { id: 'prepared_mate_relique', name: 'Prepared Relique Mate', icon: COOKING_ITEM_ART.preparedMateRelique },
    { id: 'prepared_mate_alchemist', name: 'Prepared Alchemist Mate', icon: COOKING_ITEM_ART.preparedMateAlchemist }
  ]
  for (const entry of entries) {
    ITEM_DATA[entry.id] = {
      ...template, icon: entry.icon, name: entry.name,
      info: entry.group ? `Use ${entry.name.toLowerCase()} in the kitchen.` : 'Prepared in your kitchen. Keep it in your backpack for Chiri!',
      type: entry.group ? 'ingredient' : 'food', categories: ['inventory', 'cooking'],
      showDimensionInInfo: false,
      cooking: entry.group ? { group: entry.group, interaction: entry.id === 'yerba' ? 'hold-yerba' : 'toggle' } : undefined
    }
  }
  ITEM_DATA.cooked_humita = {
    ...template,
    icon: ITEM_DATA.humita?.icon ?? '',
    name: 'Cooked Humita',
    info: 'Humita cooked and ready to eat.',
    type: 'food', categories: ['inventory', 'cooking'],
    showDimensionInInfo: false,
    cooking: undefined
  }
}
