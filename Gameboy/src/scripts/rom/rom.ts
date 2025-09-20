class Rom {
  gameboy;
  data: Uint8Array;

  constructor(gameboy, romReader?) {
    this.gameboy = gameboy;
    if (romReader) {
      this.addReader(romReader);
    }
  }

  addReader(romReader: RomReader) {
    let self = this;
    romReader.setCallback(function (data: Uint8Array) {
      if (!validate(data)) {
        self.gameboy.error("The file is not a valid GameBoy ROM.");
        return;
      }
      self.data = data;
      self.gameboy.startRom(self);
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
  setCallback(fn: Function): void;
}

export default Rom;
