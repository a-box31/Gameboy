import CPU from "./cpu";
import MBC from "./mbc";

// Memory unit
class Memory extends Array {
  MEM_SIZE = 65536; // 64KB
  // MBCtype = 0;
  banksize = 0x4000;
  rom?: Uint8Array;
  mbc?: MBC;
  cpu: CPU;

  constructor(cpu: CPU) {
    super();
    this.cpu = cpu;
  }

  static addresses = {
    VRAM_START: 0x8000,
    VRAM_END: 0x9fff,

    EXTRAM_START: 0xa000,
    EXTRAM_END: 0xbfff,

    OAM_START: 0xfe00,
    OAM_END: 0xfe9f,

    DEVICE_START: 0xff00,
    DEVICE_END: 0xff7f,
  };

  reset() {
    this.length = this.MEM_SIZE;
    for (
      let i = Memory.addresses.VRAM_START;
      i <= Memory.addresses.VRAM_END;
      i++
    ) {
      this[i] = 0;
    }
    for (
      let i = Memory.addresses.DEVICE_START;
      i <= Memory.addresses.DEVICE_END;
      i++
    ) {
      this[i] = 0;
    }
    this[0xffff] = 0;
    this[0xff47] = 0xfc;
    this[0xff04] = 0x18;
  }

  setRomData(data: Uint8Array) {
    this.rom = data;
    this.loadRomBank(0);
    this.mbc = MBC.getMbcInstance(this, this[0x147]);
    this.loadRomBank(1);
    this.mbc.loadRam(this.cpu.getGameName(), this.cpu.getRamSize());
  }

  loadRomBank(index: number) {
    const start = index ? 0x4000 : 0x0;
    const romStart = index * 0x4000;
    if (!this.rom) {
      throw new Error("ROM data is not loaded.");
    }
    for (let i = 0; i < this.banksize; i++) {
      this[i + start] = this.rom[romStart + i];
    }
  }

//   // Video ram accessor
//   vram(address) {
//     if (
//       address < Memory.addresses.VRAM_START ||
//       address > Memory.addresses.VRAM_END
//     ) {
//       throw "VRAM access in out of bounds address " + address;
//     }

//     return this[address];
//   }

//   // OAM ram accessor
//   oamram(address) {
//     if (
//       address < Memory.addresses.OAM_START ||
//       address > Memory.addresses.OAM_END
//     ) {
//       throw "OAMRAM access in out of bounds address " + address;
//     }

//     return this[address];
//   }

//   // Device ram accessor
//   deviceram(address: number, value?: number) {
//     if (
//       address < Memory.addresses.DEVICE_START ||
//       address > Memory.addresses.DEVICE_END
//     ) {
//       throw "Device RAM access in out of bounds address " + address;
//     }
//     if (typeof value === "undefined") {
//       return this[address];
//     } else {
//       this[address] = value;
//     }
//   }

  // Memory read proxy function
  // Used to centralize memory read access
  rb(addr: number): number {
    if (addr >= 0xff10 && addr < 0xff40) {
      const mask = apuMask[addr - 0xff10];
      return this[addr] | mask;
    }
    if (this.mbc && addr >= 0xa000 && addr < 0xc000) {
      return this.mbc.readRam(addr) ?? 0;
    }
    return this[addr];
  }

  // Memory write proxy function
  // Used to centralize memory writes and delegate specific behaviour
  // to the correct units
  wb(addr: number, value: number) {
    if (addr < 0x8000 || (addr >= 0xa000 && addr < 0xc000)) {
      // MBC
      if (this.mbc) {
        this.mbc.manageWrite(addr, value);
      }
    } else if (addr >= 0xff10 && addr <= 0xff3f) {
      // sound registers
      this.cpu.apu.manageWrite(addr, value);
    } else if (addr == 0xff00) {
      // input register
      this[addr] = (this[addr] & 0x0f) | (value & 0x30);
    } else {
      this[addr] = value;
      if ((addr & 0xff00) == 0xff00) {
        if (addr == 0xff02) {
          if (value & 0x80) {
            this.cpu.enableSerialTransfer();
          }
        }
        if (addr == 0xff04) {
          this.cpu.resetDivTimer();
        }
        if (addr == 0xff46) {
          // OAM DMA transfer
          this.dmaTransfer(value);
        }
        // GPU register writes
        if (this.cpu.gpu) {
          if (addr == 0xff40) {
            // LCDC - LCD Control
            this.cpu.gpu.writeLCDC(value);
          } else if (addr == 0xff42) {
            // SCY - Scroll Y
            this.cpu.gpu.writeScrollY(value);
          } else if (addr == 0xff43) {
            // SCX - Scroll X
            this.cpu.gpu.writeScrollX(value);
          } else if (addr == 0xff47) {
            // BGP - Background Palette
            this.cpu.gpu.writeBGP(value);
          } else if (addr == 0xff48) {
            // OBP0 - Object Palette 0
            this.cpu.gpu.writeOBP0(value);
          } else if (addr == 0xff49) {
            // OBP1 - Object Palette 1
            this.cpu.gpu.writeOBP1(value);
          } else if (addr == 0xff4a) {
            // WY - Window Y
            this.cpu.gpu.writeWindowY(value);
          } else if (addr == 0xff4b) {
            // WX - Window X
            this.cpu.gpu.writeWindowX(value);
          }
        }
      }
    }
  }

//   // Start a DMA transfer (OAM data from cartrige to RAM)
  dmaTransfer(startAddressPrefix: number) {
    const startAddress = startAddressPrefix << 8;
    for (let i = 0; i < 0xa0; i++) {
      this[Memory.addresses.OAM_START + i] = this[startAddress + i];
    }
  }
}

// Bitmasks for audio addresses reads
const apuMask = [
  0x80,
  0x3f,
  0x00,
  0xff,
  0xbf, // NR10-NR15
  0xff,
  0x3f,
  0x00,
  0xff,
  0xbf, // NR20-NR25
  0x7f,
  0xff,
  0x9f,
  0xff,
  0xbf, // NR30-NR35
  0xff,
  0xff,
  0x00,
  0x00,
  0xbf, // NR40-NR45
  0x00,
  0x00,
  0x70, // NR50-NR52
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0xff,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00, // Wave RAM
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
];

export default Memory;
