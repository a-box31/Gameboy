import type {Gameboy} from "../gameboy";

class Rom {
  gameboy: Gameboy;
  data?: Uint8Array;

  constructor(gameboy: Gameboy, romReader?: RomReader) {
    this.gameboy = gameboy;
    if (romReader) {
      this.addReader(romReader);
    }
  }

  addReader(romReader: RomReader) {
    romReader.setCallback((data: Uint8Array) => {
      if (!validate(data)) {
        this.gameboy.error("The file is not a valid GameBoy ROM.");
        return;
      }
      this.data = data;
      this.gameboy.startRom(this);
    });
  }
}

// Validate the checksum of the cartridge header
function validate(data: Uint8Array) {
  let hash = 0;
  for (let i = 0x134; i <= 0x14c; i++) {
    hash = hash - data[i] - 1;
  }
  return (hash & 0xff) == data[0x14d];
}

export interface RomReader {
  setCallback(fn: (data: Uint8Array) => void): void;
}
export default Rom;