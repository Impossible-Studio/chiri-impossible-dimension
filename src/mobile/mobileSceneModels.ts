import { Animator, engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState } from '@dcl/sdk/ecs'
import { isMobile } from '@dcl/sdk/platform'

// Creator Hub keeps the originals. Runtime substitutes ONLY on mobile, on the
// same entity: position, scale, visibility, parenting and collider masks survive.
// Do not add a second copy in Creator Hub. Regenerate with
// node tools/generateMobileAnimationModels.cjs after replacing an original GLB.
export const MOBILE_SCENE_MODELS: Record<string, { src: string; clip: string }> = {
  'assets/scene/models/ascensores/ascensores.glb': {
    src: 'assets/scene/Models/ascensores/ascensores_mobile.glb', clip: 'lifts_loop'
  },
  'assets/scene/models/ants_fn_2/ants_fn_2.glb': {
    src: 'assets/scene/Models/ants_fn_2/ants_fn_2_mobile.glb', clip: 'ants_loop'
  }
}

const normalized = (src: string) => src.replace(/\\/g, '/').toLowerCase()
let initialized = false

export function initializeMobileSceneModels() {
  if (initialized || !isMobile()) return
  initialized = true
  const pending = new Map<Entity, { src: string; clip: string; frames: number }>()

  function play(entity: Entity, clip: string) {
    // Exactly one clip AND one state bypass the mobile multi-animation blend
    // controller. Both lifts/all 18 ants are baked into this clip, not just one.
    Animator.createOrReplace(entity, {
      states: [{ clip, playing: true, loop: true, speed: 1, weight: 1, shouldReset: false }]
    })
  }

  engine.addSystem(() => {
    for (const [entity, job] of pending) {
      const gltf = GltfContainer.getOrNull(entity)
      if (!gltf || normalized(gltf.src) !== normalized(job.src)) {
        pending.delete(entity)
        continue
      }
      job.frames++
      const loaded = GltfContainerLoadingState.getOrNull(entity)
      if (job.frames >= 2 && loaded?.currentState === LoadingState.FINISHED) {
        play(entity, job.clip)
        pending.delete(entity)
      } else if (loaded?.currentState === LoadingState.FINISHED_WITH_ERROR ||
        loaded?.currentState === LoadingState.NOT_FOUND) {
        console.error(`[mobile models] Could not load ${job.src}; check generated assets.`)
        pending.delete(entity)
      }
    }

    for (const [entity, gltf] of engine.getEntitiesWith(GltfContainer)) {
      const replacement = MOBILE_SCENE_MODELS[normalized(gltf.src)]
      if (!replacement) continue
      GltfContainer.createOrReplace(entity, { ...gltf, src: replacement.src })
      play(entity, replacement.clip)
      pending.set(entity, { ...replacement, frames: 0 })
    }

    // Preserve the previous explicit-default compatibility for other mobile
    // animations, without resetting them every frame or altering desktop.
    for (const [entity, animator] of engine.getEntitiesWith(Animator)) {
      if (!animator.states.some(s => s.speed === undefined || s.weight === undefined || s.shouldReset === undefined)) continue
      for (const state of Animator.getMutable(entity).states) {
        if (state.speed === undefined) state.speed = 1
        if (state.weight === undefined) state.weight = 1
        if (state.shouldReset === undefined) state.shouldReset = false
      }
    }
  })
}
