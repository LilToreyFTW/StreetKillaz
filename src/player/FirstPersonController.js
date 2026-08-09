import * as THREE from 'three';
import { GAME_CONFIG, getVisualSettings, getInputSettings } from '../config/GameConfig.js?v=20260822';

const EYE_STAND = 1.7;
const EYE_CROUCH = 1.05;
const GRAVITY = GAME_CONFIG.movement.gravity;
const WALK_SPEED = GAME_CONFIG.movement.walkSpeed;
const SPRINT_SPEED = GAME_CONFIG.movement.sprintSpeed;
const TAC_SPRINT_SPEED = 11.5;   // CoD tactical sprint — fastest, committed, no shooting
const SLIDE_SPEED = 12.5;        // initial slide burst
const CROUCH_SPEED = GAME_CONFIG.movement.crouchSpeed;
const JUMP_SPEED = GAME_CONFIG.movement.jumpSpeed;
const LOOK_SENSITIVITY = GAME_CONFIG.camera.mouseSensitivity;
const MAX_PITCH = Math.PI / 2 - 0.05;
const TAC_DOUBLE_TAP_MS = 300;   // window to double-tap Shift for tactical sprint
const SLIDE_TIME = 0.55;         // base slide duration
const SLIDE_COOLDOWN = 0.35;
const GROUND_ACCELERATION = 19;
const GROUND_DECELERATION = 24;
const AIR_ACCELERATION = 6;

export class FirstPersonController {
  constructor(camera, input, { spawn = new THREE.Vector3(0, EYE_STAND, 0), recoil = null } = {}) {
    this.camera = camera;
    this.input = input;
    this.recoil = recoil; // optional RecoilSystem — adds view kick on top of aim
    this.position = spawn.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = true;
    this.bounds = 45;
    this.collisionBoxes = [];
    this.networkReconciliationStrength = 0.35;
    this.camera.rotation.order = 'YXZ';

    // --- movement state for CoD-style mobility ---
    this.eyeHeight = EYE_STAND;
    this.crouching = false;
    this.sliding = false;
    this.slideTimer = 0;
    this.slideCooldown = 0;
    this.slideDir = new THREE.Vector3();
    this.tacSprinting = false;
    this._lastShiftTap = 0;
    this.adsActive = false;
    this._crouchLatched = false;
    this._crouchHeld = false;
    this._moveSpeed = WALK_SPEED; // exposed to viewmodel for bob/sway scaling
    this.landingOffset = 0;
    this.headBobOffset = 0;
    this.headBobPhase = 0;
    this._wasGrounded = true;
    this._lastVerticalSpeed = 0;
    this.groundHeight = EYE_STAND;

    this._applyCamera();
  }

  get isSprinting() {
    return this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
  }

  /** True when the player can't currently bring the weapon up (tac-sprint / slide). */
  get weaponLowered() {
    return this.tacSprinting || this.sliding;
  }

  get movementState() {
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    return {
      moving: horizontalSpeed > 0.15,
      sprinting: this.isSprinting && !this.crouching && horizontalSpeed > SPRINT_SPEED * 0.6,
      crouched: this.crouching || this.sliding,
      grounded: this.onGround,
      jumping: !this.onGround && this.velocity.y > 0.5,
    };
  }

  _handleTacticalSprint() {
    if (!this.isSprinting) { this.tacSprinting = false; return; }
    const now = performance.now();
    if (now - this._lastShiftTap <= TAC_DOUBLE_TAP_MS && !this.tacSprinting) {
      this.tacSprinting = true; // committed sprint; exits when Shift released or slide/crouch
    }
    this._lastShiftTap = now;
  }

  update(dt, lookDelta) {
    const look = lookDelta || this.input.consumeMouseDelta();
    const x = look.x || 0;
    const y = look.y || 0;
    const inputSettings = getInputSettings();
    const sensitivity = inputSettings.mouseSensitivity * (this.adsActive ? inputSettings.adsSensitivity : 1);
    this.yaw -= x * sensitivity;
    this.pitch -= y * sensitivity * (inputSettings.invertY ? -1 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH, MAX_PITCH);

    const forward = (this.input.isDown('KeyW') ? 1 : 0) - (this.input.isDown('KeyS') ? 1 : 0);
    const strafe = (this.input.isDown('KeyD') ? 1 : 0) - (this.input.isDown('KeyA') ? 1 : 0);
    const moveDir = new THREE.Vector3(strafe, 0, -forward);
    if (moveDir.lengthSq() > 0) moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // --- Crouch input ---
    const crouchDown = this.input.isDown('KeyC') || this.input.isDown('ControlLeft');
    if (crouchDown && !this._crouchHeld && inputSettings.toggleCrouch) this._crouchLatched = !this._crouchLatched;
    this._crouchHeld = crouchDown;
    const wantCrouch = inputSettings.toggleCrouch ? this._crouchLatched : crouchDown;
    this.crouching = wantCrouch;

    // --- Tactical sprint (double-tap Shift) ---
    this._handleTacticalSprint();
    // Leaving tac sprint: released Shift, or crouching, or not moving forward.
    if (this.tacSprinting && (!this.isSprinting || this.crouching || forward <= 0)) {
      this.tacSprinting = false;
    }

    // --- Slide: crouch while tactical sprinting (or crouch + moving fast) ---
    this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    const canSlide = this.onGround && this.slideCooldown <= 0 && !this.sliding;
    if (canSlide && ((this.tacSprinting && this.crouching) || (this.crouching && this._moveSpeed >= SPRINT_SPEED * 0.8 && forward > 0))) {
      this.sliding = true;
      this.slideTimer = SLIDE_TIME;
      this.slideDir.copy(moveDir.lengthSq() > 0 ? moveDir : new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw));
    }

    // --- Resolve speed ---
    let speed;
    if (this.sliding) {
      // decay slide speed over its duration
      const t = this.slideTimer / SLIDE_TIME;
      speed = SLIDE_SPEED * (0.45 + 0.55 * t);
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 || !this.crouching) {
        this.sliding = false;
        this.slideCooldown = SLIDE_COOLDOWN;
      }
    } else if (this.tacSprinting) {
      speed = TAC_SPRINT_SPEED;
    } else if (this.crouching) {
      speed = CROUCH_SPEED;
    } else if (this.isSprinting && forward > 0) {
      speed = SPRINT_SPEED;
    } else {
      speed = WALK_SPEED;
    }
    this._moveSpeed = speed;

    // Accelerate/decelerate toward the desired velocity. This avoids instant
    // skating while preserving a responsive competitive FPS feel.
    if (this.sliding) {
      this.velocity.x = this.slideDir.x * speed;
      this.velocity.z = this.slideDir.z * speed;
    } else {
      const targetX = moveDir.x * speed;
      const targetZ = moveDir.z * speed;
      const moving = moveDir.lengthSq() > 0;
      const response = moving
        ? (this.onGround ? GROUND_ACCELERATION : AIR_ACCELERATION)
        : GROUND_DECELERATION;
      const blend = 1 - Math.exp(-response * dt);
      this.velocity.x += (targetX - this.velocity.x) * blend;
      this.velocity.z += (targetZ - this.velocity.z) * blend;
    }

    if (this.onGround && this.input.isDown('Space') && !this.sliding) {
      this.velocity.y = JUMP_SPEED;
      this.onGround = false;
    }
    this._lastVerticalSpeed = this.velocity.y;
    this.velocity.y += GRAVITY * dt;

    this.position.addScaledVector(this.velocity, dt);
    if (this.position.y <= this.groundHeight) {
      const landedHard = !this._wasGrounded && this.velocity.y < -4;
      this.position.y = this.groundHeight;
      this.velocity.y = 0;
      this.onGround = true;
      if (landedHard) this.landingOffset = Math.min(0.12, Math.abs(this._lastVerticalSpeed) * 0.012);
    }
    this.position.x = THREE.MathUtils.clamp(this.position.x, -this.bounds, this.bounds);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -this.bounds, this.bounds);
    this._resolveWorldCollisions();

    // --- Smooth eye height toward crouch/slide target ---
    const targetEye = (this.crouching || this.sliding) ? EYE_CROUCH : EYE_STAND;
    this.eyeHeight += (targetEye - this.eyeHeight) * (1 - Math.exp(-dt * 12));
    // While sliding, the camera dips and we keep y at eye height (already clamped at EYE_STAND floor).
    if (this.sliding) this.position.y = Math.min(this.position.y, this.eyeHeight);

    this.landingOffset += (0 - this.landingOffset) * (1 - Math.exp(-dt * 18));
    const visuals = getVisualSettings();
    const movingOnGround = this.onGround && Math.hypot(this.velocity.x, this.velocity.z) > 0.2;
    if (movingOnGround) this.headBobPhase += dt * (this.isSprinting ? 12 : 8);
    const bobTarget = visuals.headBob && movingOnGround
      ? Math.abs(Math.sin(this.headBobPhase)) * 0.018 * visuals.motionIntensity : 0;
    this.headBobOffset += (bobTarget - this.headBobOffset) * (1 - Math.exp(-dt * 14));
    this._wasGrounded = this.onGround;
    this._applyCamera();
  }

  reconcile(serverPlayer) {
    if (!serverPlayer?.position) return;
    const authoritative = new THREE.Vector3(
      Number(serverPlayer.position.x) || 0,
      Number(serverPlayer.position.y) || EYE_STAND,
      Number(serverPlayer.position.z) || 0,
    );
    const error = this.position.distanceTo(authoritative);
    if (error > 4) this.position.copy(authoritative);
    else if (error > 0.08) this.position.lerp(authoritative, this.networkReconciliationStrength);
    this._applyCamera();
  }

  teleport(position, yaw = this.yaw, pitch = this.pitch) {
    this.position.set(position.x, position.y ?? EYE_STAND, position.z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this._applyCamera();
  }

  setWorldCollision(boxes = []) {
    this.collisionBoxes = boxes;
  }

  /** Allows future terrain/stair systems to provide a snapped walkable floor. */
  setGroundHeight(height = EYE_STAND) {
    this.groundHeight = Number.isFinite(height) ? height : EYE_STAND;
  }

  _resolveWorldCollisions() {
    const radius = 0.45;
    for (const box of this.collisionBoxes) {
      const minX = box.min.x - radius;
      const maxX = box.max.x + radius;
      const minZ = box.min.z - radius;
      const maxZ = box.max.z + radius;
      if (this.position.x < minX || this.position.x > maxX || this.position.z < minZ || this.position.z > maxZ) continue;
      const pushLeft = this.position.x - minX;
      const pushRight = maxX - this.position.x;
      const pushTop = this.position.z - minZ;
      const pushBottom = maxZ - this.position.z;
      const smallest = Math.min(pushLeft, pushRight, pushTop, pushBottom);
      if (smallest === pushLeft) this.position.x = minX;
      else if (smallest === pushRight) this.position.x = maxX;
      else if (smallest === pushTop) this.position.z = minZ;
      else this.position.z = maxZ;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
  }

  _applyCamera() {
    const visuals = getVisualSettings();
    this.camera.position.copy(this.position);
    // The simulation position stays at standing eye height for predictable
    // networking; presentation offsets provide crouch and landing motion.
    this.camera.position.y += this.eyeHeight - EYE_STAND - this.landingOffset * visuals.motionIntensity + this.headBobOffset;
    const shake = visuals.cameraShake ? visuals.motionIntensity : 0;
    this.camera.rotation.y = this.yaw + (this.recoil ? this.recoil.yawKick * shake : 0);
    this.camera.rotation.x = this.pitch + (this.recoil ? this.recoil.pitchKick * shake : 0);
  }

  getForwardVector() {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }
}
