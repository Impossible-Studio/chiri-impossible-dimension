import {
  COOKING_HEAT_CONFIG, COOKING_INTERACTION_CONFIG, COOKING_MATE_CONFIG, COOKING_OVEN_INGREDIENT_ART,
  COOKING_PREPARED_MATE_ITEMS, COOKING_RECIPES,
  cookingHeatSpeed, type CookingRecipe
} from './cookingConfig'
import type { CookingPourSource } from './cookingSession'

interface CookingGameHooks {
  amount: (itemId: string) => number
  // Must check ALL costs before removing anything. False leaves the prep untouched.
  spend: (costs: Record<string, number>) => boolean
  serve: (recipeId: string, outputId: string, result?: { quality: 'good' | 'bad' }) => void
  message?: (text: string) => void
  random?: () => number
}

// Pure gameplay state; no timers outside update(), no UI or persistence imports.
export class CookingGame {
  heat = 0
  zone: 'oven' | 'mate' = 'oven'
  selectedArea: 'oven' | 'mate' | null = null
  ovenBase: string | null = null
  private ovenIngredientCounts: Record<string, number> = {}
  private recipe: CookingRecipe | null = null
  private cookReadyTargetSeconds = 0
  ovenOn = false
  progress = 0 // 0=yellow1, 5=green3, 8=red3/burnt
  mateBase: string | null = null
  yerbaItem: string | null = null
  yerbaPaid = false
  yerbaSeconds = 0
  waterSeconds = 0
  private yerbaTarget = 0
  private waterTarget = 0
  yerbaSpilled = false
  waterSpilled = false
  readyFeedbackZone: 'oven' | 'mate' | null = null
  private readyFeedbackSeconds = 0

  constructor(private readonly hooks: CookingGameHooks) {}

  private say(text: string) { this.hooks.message?.(text) }
  private randomPourTime(kind: 'yerba' | 'water') {
    const random = Math.max(0, Math.min(1, (this.hooks.random ?? Math.random)()))
    const type = this.mateBase ? COOKING_MATE_CONFIG.types[this.mateBase] : undefined
    const min = type?.minSeconds ?? COOKING_MATE_CONFIG.pourMinSeconds
    const max = type?.maxSeconds ?? COOKING_MATE_CONFIG.pourMaxSeconds
    // Keep separate rolls for yerba and water. The parameter documents this
    // intentional independence and helps future per-liquid balancing.
    void kind
    return min + random * (max - min)
  }

  reset() {
    this.heat = 0
    this.zone = 'oven'
    this.selectedArea = null
    this.readyFeedbackZone = null
    this.readyFeedbackSeconds = 0
    this.clearOven()
    this.clearMate()
  }

  selectArea(area: 'oven' | 'mate') {
    this.zone = area
    if (area === 'oven' && this.burnt) {
      this.clearOven()
      this.selectedArea = null
      return
    }
    if (area === 'mate' && this.invalidMate) {
      this.clearMate()
      this.selectedArea = null
      return
    }
    if (this.selectedArea === area) {
      this.selectedArea = null
      return
    }
    this.selectedArea = area
  }

  clearOven() {
    this.heat = 0
    this.ovenOn = false
    this.ovenBase = null
    this.ovenIngredientCounts = {}
    this.recipe = null
    this.cookReadyTargetSeconds = 0
    this.progress = 0
  }

  clearMate() {
    this.mateBase = null
    this.yerbaItem = null
    this.yerbaPaid = false
    this.yerbaSeconds = 0
    this.waterSeconds = 0
    this.yerbaTarget = 0
    this.waterTarget = 0
    this.yerbaSpilled = false
    this.waterSpilled = false
  }

  selectBase(itemId: string, isMate: boolean) {
    if (this.hooks.amount(itemId) < 1) return
    this.readyFeedbackZone = null
    this.readyFeedbackSeconds = 0
    if (isMate) {
      this.zone = 'mate'
      if (this.yerbaPaid) { this.say('Finish or clear this mate first.'); return }
      const next = this.mateBase === itemId ? null : itemId
      this.clearMate()
      this.mateBase = next
      if (next) {
        this.yerbaTarget = this.randomPourTime('yerba')
        this.waterTarget = this.randomPourTime('water')
      }
    } else {
      this.zone = 'oven'
      if (this.recipe) { this.say('The ingredients are already cooking.'); return }
      if (this.ovenIngredients.length > 0) {
        this.say('Remove the ingredients before changing the base.')
        return
      }
      this.ovenBase = this.ovenBase === itemId ? null : itemId
    }
  }

  selectIngredient(itemId: string) {
    this.zone = 'oven'
    this.readyFeedbackZone = null
    this.readyFeedbackSeconds = 0
    if (this.recipe) { this.say('The ingredients are already cooking.'); return }
    if (!this.ovenBase) { this.say('Choose a base first.'); return }
    const layers = COOKING_OVEN_INGREDIENT_ART[this.ovenBase]?.[itemId] ?? []
    if (layers.length === 0) { this.say('That ingredient cannot be added to this base.'); return }
    const current = this.ovenIngredientCounts[itemId] ?? 0
    const availableMaximum = Math.min(layers.length, this.hooks.amount(itemId))
    if (availableMaximum < 1) return
    if (current >= availableMaximum) delete this.ovenIngredientCounts[itemId]
    else this.ovenIngredientCounts[itemId] = current + 1
  }

  adjustHeat(direction: -1 | 1) {
    if (!this.recipe || this.burnt) return
    this.heat = Math.min(COOKING_HEAT_CONFIG.max, Math.max(COOKING_HEAT_CONFIG.min, this.heat + direction))
  }

  private findRecipe() {
    if (!this.ovenBase) return null
    const recipesForBase = COOKING_RECIPES.filter(candidate =>
      candidate.baseId === this.ovenBase)
    const exactRecipe = recipesForBase.find(candidate => {
      const allowed = new Set([...Object.keys(candidate.ingredients), ...(candidate.optionalIngredients ?? [])])
      if (this.ovenIngredients.some(id => !allowed.has(id))) return false
      return Object.entries(candidate.ingredients).every(([id, quantity]) =>
        this.getOvenIngredientQuantity(id) === quantity)
    })

    // Cooking begins with any composition that has a known base profile. The
    // exact recipe still wins when all ingredients match; an incomplete test
    // preparation uses the base's timing/output instead of leaving Flame dead.
    return exactRecipe ?? recipesForBase[0] ?? null
  }

  igniteOven() {
    this.zone = 'oven'
    if (this.burnt) return false
    if (this.recipe) {
      this.ovenOn = !this.ovenOn
      return this.ovenOn
    }
    if (!this.ovenBase) { this.say('Choose a base first.'); return false }
    const recipe = this.findRecipe()
    if (!recipe) { this.say('This base does not have a cooking profile yet.'); return false }
    const costs: Record<string, number> = { [this.ovenBase]: 1, ...this.ovenIngredientCounts }
    if (!this.hooks.spend(costs)) return false
    const random = Math.max(0, Math.min(1, (this.hooks.random ?? Math.random)()))
    const range = recipe.readyTimeSeconds
    this.recipe = recipe
    this.cookReadyTargetSeconds = range.min + random * (range.max - range.min)
    this.heat = 1
    this.ovenOn = true
    this.progress = 0
    return true
  }

  get ovenIngredients() { return Object.keys(this.ovenIngredientCounts).filter(id => this.ovenIngredientCounts[id] > 0) }
  getOvenIngredientQuantity(itemId: string) { return this.ovenIngredientCounts[itemId] ?? 0 }
  get cooking() { return this.recipe !== null }
  get burnt() { return this.cooking && this.progress >= 8 }
  get ovenReady() { return this.cooking && this.progress >= 5 && !this.burnt }
  get stage() { return this.cooking ? Math.min(9, Math.floor(this.progress + 1e-8) + 1) : this.heat > 0 ? 1 : 0 }
  get readyInSeconds(): number | null {
    if (this.ovenReady || this.burnt) return 0
    if (!this.cooking || !this.heat) return null
    return Math.ceil((5 - this.progress) * this.cookReadyTargetSeconds / 5 / cookingHeatSpeed(this.heat))
  }
  get overflow(): 'yerba' | 'water' | 'both' | null {
    return this.yerbaSpilled && this.waterSpilled ? 'both' : this.yerbaSpilled ? 'yerba' : this.waterSpilled ? 'water' : null
  }
  get invalidMate() { return this.yerbaSpilled && this.waterSpilled }
  get yerbaReady() { return this.yerbaPaid && this.yerbaSeconds >= this.yerbaTarget }
  get waterReady() {
    return this.mateBase !== null && this.waterTarget > 0 &&
      this.waterSeconds >= this.waterTarget
  }
  get mateReady() { return this.yerbaReady && this.waterReady && !this.invalidMate }
  get mateQuality(): 'good' | 'bad' { return this.yerbaSpilled || this.waterSpilled ? 'bad' : 'good' }
  get ready() {
    return this.selectedArea === 'oven' ? this.ovenReady :
      this.selectedArea === 'mate' ? this.mateReady : false
  }

  canPour(source: CookingPourSource) {
    if (!this.mateBase || this.invalidMate || this.hooks.amount(this.mateBase) < 1) return false
    if (source.kind === 'water') return !this.waterSpilled
    const requiredYerba = COOKING_MATE_CONFIG.types[this.mateBase]?.requiredYerbaItemId
    return !this.yerbaSpilled && (!requiredYerba || requiredYerba === source.itemId) &&
      (!this.yerbaItem || this.yerbaItem === source.itemId) &&
      (this.yerbaPaid || this.hooks.amount(source.itemId) > 0)
  }

  pour(source: CookingPourSource, seconds: number) {
    if (!this.canPour(source) || !Number.isFinite(seconds) || seconds <= 0 || seconds > 0.25) return
    this.zone = 'mate'
    if (source.kind === 'yerba') {
      if (!this.yerbaPaid) {
        if (!this.hooks.spend({ [source.itemId]: 1 })) return
        this.yerbaItem = source.itemId
        this.yerbaPaid = true
      }
      this.yerbaSeconds += seconds
      if (this.yerbaSeconds >= this.yerbaTarget + COOKING_MATE_CONFIG.overflowGraceSeconds) this.yerbaSpilled = true
    } else {
      this.waterSeconds += seconds
      if (this.waterSeconds >= this.waterTarget + COOKING_MATE_CONFIG.overflowGraceSeconds) this.waterSpilled = true
    }
  }

  update(seconds: number) {
    // Do not fast-forward on resume from a suspended mobile app.
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 0.25) return
    if (this.readyFeedbackSeconds > 0) {
      this.readyFeedbackSeconds = Math.max(0, this.readyFeedbackSeconds - seconds)
      if (this.readyFeedbackSeconds === 0) this.readyFeedbackZone = null
    }
    if (!this.cooking || !this.ovenOn || this.burnt) return
    this.progress = Math.min(8, this.progress + seconds * 5 /
      this.cookReadyTargetSeconds * cookingHeatSpeed(this.heat))
    if (this.progress >= 8 - 1e-8) this.progress = 8
  }

  serve() {
    if (this.selectedArea === 'oven' && this.ovenReady && this.recipe) {
      const recipe = this.recipe
      this.clearOven() // Clear first: repeated Ready clicks cannot duplicate rewards.
      this.selectedArea = null
      this.readyFeedbackZone = 'oven'
      this.readyFeedbackSeconds = COOKING_INTERACTION_CONFIG.readyFeedbackSeconds
      this.hooks.serve(recipe.id, recipe.outputId)
      return true
    }
    if (this.selectedArea === 'mate' && this.mateReady) {
      const quality = this.mateQuality
      const selectedMateId = this.mateBase
      if (!selectedMateId || !this.hooks.spend({ [selectedMateId]: 1 })) {
        this.say('You need to find another one of this mate before preparing it.')
        return false
      }
      const preparedMateId = COOKING_PREPARED_MATE_ITEMS[selectedMateId] ?? 'prepared_mate_infinite'
      this.clearMate()
      this.selectedArea = null
      this.readyFeedbackZone = 'mate'
      this.readyFeedbackSeconds = COOKING_INTERACTION_CONFIG.readyFeedbackSeconds
      this.hooks.serve('mate', preparedMateId, { quality })
      return true
    }
    this.say(!this.selectedArea ? 'Select the oven or mate area before pressing Ready.' :
      this.invalidMate && this.selectedArea === 'mate' ? 'The yerba and water both spilled. Tap the message to start again.' :
      this.burnt && this.selectedArea === 'oven' ? 'Overcooked! Tap the oven to clear it.' : 'Not ready yet!')
    return false
  }
}
