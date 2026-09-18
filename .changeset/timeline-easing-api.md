---
'@liveog/core': minor
'@liveog/react': minor
---

Add easing curves, per-element timing and a `useLiveOGTime()` hook.

`@liveog/core` gains `easings` (nine curves, each anchored at `f(0) === 0` and `f(1) === 1`), the `Easing`/`EasingName`/`EasingFunction` types, `resolveEasing()`, `ease()` and `segmentProgress()` for delayed segments on a shared timeline.

`@liveog/react` gains `useLiveOGTime()`, which subscribes to the `liveog:time` event when no `LiveOGTimeProvider` is present, so cards no longer need listener boilerplate. `Animate` and `Counter` now accept `duration`, `delay` and `easing`; `Animate` also takes `distance` and `Counter` a `format` callback. Previously hardcoded 700 ms and 1800 ms timings become the defaults, so existing cards render unchanged apart from the new default `easeOutCubic` curve.
