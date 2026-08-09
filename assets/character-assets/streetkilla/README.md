# StreetKilla rigged multiplayer operator

Place the original, game-owned player model at:

`assets/character-assets/streetkilla/operator.glb`

The runtime loads this file through `GLTFLoader`, clones it with `SkeletonUtils` so every remote player has an independent skeleton, and uses `AnimationMixer` for its clips. The model must contain a `SkinnedMesh` and skeleton bones. Include clips named with at least `idle`, `walk`, and `run` (optional `sprint` and `crouch`).

Name the right-hand bone `RightHand`, `right_hand`, or similar. The runtime attaches the equipped weapon there. If it is absent, it creates a visible fallback weapon socket on the character root.

This folder deliberately contains no third-party game character. The included PNG turnaround is reference art only; it is not a 3D, rigged model.
