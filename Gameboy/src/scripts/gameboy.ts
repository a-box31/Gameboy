// import Rom from "./rom/rom";
import RomFileReader, { type RomReader } from "./rom/file_reader";
// import RomDropFileReader from "./rom/drop_file_reader";
// import RomAjaxReader from "./rom/ajax_reader";
import Keyboard from "./input/keyboard";
import Util from "./util";
import CPU from "./cpu";
import GPU from "./display/gpu";
import Screen from "./display/screen";
import Rom from "./rom/rom";
import UnimplementedException from "./exception";
import Input, { type JoypadDevice } from "./input/input";
// import UnimplementedException from "./exception";
// import Debug from "./debug";

export interface GameboyOptions {
  // your properties here
  pad: { class: typeof Keyboard; mapping: unknown };
  zoom: number;
  romReaders: Array<RomReader>;
  statusContainerId: string;
  gameNameContainerId: string;
  errorContainerId: string;
}

const defaultOptions: GameboyOptions = {
  pad: { class: Keyboard, mapping: null },
  zoom: 1,
  romReaders: [],
  statusContainerId: "status",
  gameNameContainerId: "game-name",
  errorContainerId: "error",
};

// Gameboy class
//
// This object is the entry point of the application
// Will delegate user actions to the emulated devices
// and provide information where needed

class Gameboy {
  options: GameboyOptions;
  cpu: CPU;
  // screen: Screen;
  // gpu: GPU;
//   input: Input;
//   pad: JoypadDevice;

  statusContainer?: HTMLElement;
  gameNameContainer?: HTMLElement;
  errorContainer?: HTMLElement;

constructor(canvas: HTMLCanvasElement, options?: Partial<GameboyOptions>) {
    options = options || {};
    this.options = Util.extend({}, defaultOptions, options);
// 
    const cpu: CPU = new CPU(this);
    // const screen: Screen = new Screen(canvas, this.options.zoom as number || 1);
    // const gpu: GPU = new GPU(screen, cpu);
    // cpu.gpu = gpu;

    const pad: JoypadDevice = new this.options.pad.class(this.options.pad.mapping);
    const input: Input = new Input(cpu, pad, canvas);
    // cpu.input = input;

    this.cpu = cpu;
    // this.screen = screen;
    // this.gpu = gpu;
    // this.input = input;
    // this.pad = pad;

    this.createRom(this.options.romReaders as any[]);

    this.statusContainer =
        document.getElementById(this.options.statusContainerId as string) ||
        document.createElement("div");
    this.gameNameContainer =
        document.getElementById(this.options.gameNameContainerId as string) ||
        document.createElement("div");
    this.errorContainer =
        document.getElementById(this.options.errorContainerId as string) ||
        document.createElement("div");
}

  // Create the ROM object and bind one or more readers
  createRom(readers: RomReader[]) {
    const rom = new Rom(this);
    if (readers.length == 0) {
      // add the default rom reader
      const romReader = new RomFileReader();
      rom.addReader(romReader);
    } else {
      readers.forEach((reader) => {
        rom.addReader(reader);
      });
    }
  }

  startRom(rom: Rom) {
    if (this.errorContainer) {
      this.errorContainer.classList.add("hide");
    }
    this.cpu.reset();
    try {
      if (rom.data !== undefined) {
        this.cpu.loadRom(rom.data);
        this.setStatus("Game Running :");
        this.setGameName(this.cpu.getGameName());
        this.cpu.run();
        this.screen.canvas.focus();
      } else {
        this.error("ROM data is undefined.");
      }
    } catch (e: unknown) {
      this.handleException(e);
    }
  }

//   pause(value) {
//     if (value) {
//       this.setStatus("Game Paused :");
//       this.cpu.pause();
//     } else {
//       this.setStatus("Game Running :");
//       this.cpu.unpause();
//     }
//   }

  error(message: string) {
    this.setStatus("Error during execution");
    this.setError("An error occurred during execution:" + message);
    this.cpu.stop();
  }

  setStatus(status: string) {
    if (this.statusContainer) {
      this.statusContainer.innerHTML = status;
    }
  }

  // Display an error message
  setError(message: string) {
    if (this.errorContainer) {
      this.errorContainer.classList.remove("hide");
      this.errorContainer.innerHTML = message;
    }
  }

  // Display the name of the game running
  setGameName(name: string) {
    if (this.gameNameContainer) {
      this.gameNameContainer.innerHTML = name;
    }
  }

//   setSoundEnabled(value) {
//     if (value) {
//       this.cpu.apu.connect();
//     } else {
//       this.cpu.apu.disconnect();
//     }
//   }
//   setScreenZoom(value) {
//     this.screen.setPixelSize(value);
//   }
  handleException(e: unknown) {
    if (e instanceof UnimplementedException) {
      if (e.fatal) {
        this.error("This cartridge is not supported (" + e.message + ")");
      } else {
        console.error(e.message);
      }
    } else {
      throw e;
    }
  }
}

export {
  Gameboy,
  RomFileReader,
//   RomDropFileReader,
//   RomAjaxReader,
  Util,
//   Debug,
};
