import type { JoypadDevice } from "./input";

// Keyboard listener
// Does the mapping between the keyboard and the Input class
export type JoypadKey =
  | "START"
  | "SELECT"
  | "B"
  | "A"
  | "DOWN"
  | "UP"
  | "LEFT"
  | "RIGHT";

class Keyboard implements JoypadDevice {
  onPress?: (key: JoypadKey) => void;
  onRelease?: (key: JoypadKey) => void;

  // Initialize the keyboard listeners and set up the callbacks
  // for button press / release
  init(
    canvas: HTMLCanvasElement,
    onPress: (key: JoypadKey) => void,
    onRelease: (key: JoypadKey) => void
  ) {
    this.onPress = onPress;
    this.onRelease = onRelease;
    if (canvas.getAttribute("tabIndex") === null) {
      canvas.setAttribute("tabIndex", "1");
    }

    canvas.addEventListener("keydown", (e: KeyboardEvent) => {
      this.managePress(e.code);
      if (e.code !== "Tab") {
        // only keep Tab active
        e.preventDefault();
      }
    });
    canvas.addEventListener("keyup", (e: KeyboardEvent) => {
      this.manageRelease(e.code);
      if (e.code !== "Tab") {
        // only keep Tab active
        e.preventDefault();
      }
    });
  }

  managePress(code: string) {
    const key = this.translateKey(code);
    if (key) {
      this.onPress?.(key);
    }
  }

  manageRelease(code: string) {
    const key = this.translateKey(code);
    if (key) {
      this.onRelease?.(key);
    }
  }

  // Transform a keyboard event.code into a key of the Input.keys object
  translateKey(code: string): JoypadKey | undefined {
    switch (code) {
      case "KeyX":
        return "A";
      case "KeyZ":
        return "B";
      case "KeyC":
        return "START";
      case "KeyV":
        return "SELECT";
      case "ArrowLeft":
        return "LEFT";
      case "ArrowUp":
        return "UP";
      case "ArrowRight":
        return "RIGHT";
      case "ArrowDown":
        return "DOWN";
      default:
        return undefined;
    }
  }
}

export default Keyboard;
