import type { JoypadDevice } from "./input";

// Keyboard listener
// Does the mapping between the keyboard and the Input class
type JoypadKey = "START" | "SELECT" | "B" | "A" | "DOWN" | "UP" | "LEFT" | "RIGHT";

class Keyboard implements JoypadDevice {
  onPress?: (key: JoypadKey) => void;
  onRelease?: (key: JoypadKey) => void;

  // Initialize the keyboard listeners and set up the callbacks
  // for button press / release
  init(
    canvas: HTMLElement,
    onPress: (key: JoypadKey) => void,
    onRelease: (key: JoypadKey) => void
  ) {
    this.onPress = onPress;
    this.onRelease = onRelease;
    if (canvas.getAttribute("tabIndex") === null) {
      canvas.setAttribute("tabIndex", "1");
    }

    let self = this;
    canvas.addEventListener("keydown", function (e: KeyboardEvent) {
      self.managePress(e.code);
      if (e.code !== "Tab") {
        // only keep Tab active
        e.preventDefault();
      }
    });
    canvas.addEventListener("keyup", function (e: KeyboardEvent) {
      self.manageRelease(e.code);
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
      case "KeyG":
        return "A";
      case "KeyB":
        return "B";
      case "KeyH":
        return "START";
      case "KeyN":
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
