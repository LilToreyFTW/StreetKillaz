/**
 * Central input state. Gameplay systems poll this manager instead of adding
 * their own listeners. Interactive menu controls are ignored so lobby inputs
 * do not accidentally capture the mouse.
 */
export class InputManager {
  constructor(domElement, blockerEl) {
    this.domElement = domElement;
    this.blockerEl = blockerEl;
    this.keys = new Set();
    this.mouseButtons = new Set();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isLocked = false;

    this._onKeyDown = (event) => {
      if (this._isTypingTarget(event.target)) return;
      this.keys.add(event.code);
    };
    this._onKeyUp = (event) => this.keys.delete(event.code);
    this._onMouseDown = (event) => {
      if (!this.isLocked) return;
      this.mouseButtons.add(event.button);
    };
    this._onMouseUp = (event) => this.mouseButtons.delete(event.button);
    this._onMouseMove = (event) => {
      if (!this.isLocked) return;
      this.mouseDeltaX += event.movementX || 0;
      this.mouseDeltaY += event.movementY || 0;
    };
    this._onLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      this.blockerEl?.classList.toggle('hidden', this.isLocked);
      if (!this.isLocked) {
        this.mouseButtons.clear();
        this.keys.clear();
      }
    };
    this._onContextMenu = (event) => event.preventDefault();

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('contextmenu', this._onContextMenu);
  }

  requestPointerLock() {
    return this.domElement.requestPointerLock();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  mouseDown(button = 0) {
    return this.mouseButtons.has(button);
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  /** Read mouse delta without resetting it (viewmodel sway reads same frame as the controller). */
  peekMouseDelta() {
    return { x: this.mouseDeltaX, y: this.mouseDeltaY };
  }

  getNetworkInput(yaw, pitch, state = {}) {
    return {
      forward: (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0),
      strafe: (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0),
      sprint: this.isDown('ShiftLeft') || this.isDown('ShiftRight'),
      jump: this.isDown('Space'),
      crouched: this.isDown('KeyC') || this.isDown('ControlLeft'),
      aiming: Boolean(state.isAiming),
      yaw,
      pitch,
    };
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('contextmenu', this._onContextMenu);
  }

  _isTypingTarget(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  }
}
