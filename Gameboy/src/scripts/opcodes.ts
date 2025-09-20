import { cpuOps as ops } from "./instructions";
import CPU from "./cpu";
// Each opcode (0 to 0xFF) is associated to a CPU operation
// CPU operations are implemented separately
// The cbmap object holds operations for CB prefixed opcodes (0xCB00 to 0xCBFF)
// Non-existent opcodes are commented out and marked empty
const map = {
  0x00: function (p: CPU) {
    p.clock.c += 4;
  },
  0x01: function (p: CPU) {
    ops.LDrrnn(p, "B", "C");
  },
  0x02: function (p: CPU) {
    ops.LDrrar(p, "B", "C", "A");
  },
  0x03: function (p: CPU) {
    ops.INCrr(p, "B", "C");
  },
  0x04: function (p: CPU) {
    ops.INCr(p, "B");
  },
  0x05: function (p: CPU) {
    ops.DECr(p, "B");
  },
  0x06: function (p: CPU) {
    ops.LDrn(p, "B");
  },
  0x07: function (p: CPU) {
    const out = p.r.A & 0x80 ? 1 : 0;
    if (out) {
      p.r.F = 0x10;
    } else {
      p.r.F = 0;
    }
    p.wr("A", ((p.r.A << 1) + out) & 0xff);
    p.clock.c += 4;
  },
  0x08: function (p: CPU) {
    ops.LDnnsp(p);
  },
  0x09: function (p: CPU) {
    ops.ADDrrrr(p, "H", "L", "B", "C");
  },
  0x0a: function (p: CPU) {
    ops.LDrrra(p, "A", "B", "C");
  },
  0x0b: function (p: CPU) {
    ops.DECrr(p, "B", "C");
  },
  0x0c: function (p: CPU) {
    ops.INCr(p, "C");
  },
  0x0d: function (p: CPU) {
    ops.DECr(p, "C");
  },
  0x0e: function (p: CPU) {
    ops.LDrn(p, "C");
  },
  0x0f: function (p: CPU) {
    const out = p.r.A & 0x01;
    if (out) {
      p.r.F = 0x10;
    } else {
      p.r.F = 0;
    }
    p.wr("A", (p.r.A >> 1) | (out * 0x80));
    p.clock.c += 4;
  },

  0x10: function (p: CPU) {
    p.r.pc++;
    p.clock.c += 4;
  },
  0x11: function (p: CPU) {
    ops.LDrrnn(p, "D", "E");
  },
  0x12: function (p: CPU) {
    ops.LDrrar(p, "D", "E", "A");
  },
  0x13: function (p: CPU) {
    ops.INCrr(p, "D", "E");
  },
  0x14: function (p: CPU) {
    ops.INCr(p, "D");
  },
  0x15: function (p: CPU) {
    ops.DECr(p, "D");
  },
  0x16: function (p: CPU) {
    ops.LDrn(p, "D");
  },
  0x17: function (p: CPU) {
    const c = p.r.F & 0x10 ? 1 : 0;
    const out = p.r.A & 0x80 ? 1 : 0;
    if (out) {
      p.r.F = 0x10;
    } else {
      p.r.F = 0;
    }
    p.wr("A", ((p.r.A << 1) + c) & 0xff);
    p.clock.c += 4;
  },
  0x18: function (p: CPU) {
    ops.JRn(p);
  },
  0x19: function (p: CPU) {
    ops.ADDrrrr(p, "H", "L", "D", "E");
  },
  0x1a: function (p: CPU) {
    ops.LDrrra(p, "A", "D", "E");
  },
  0x1b: function (p: CPU) {
    ops.DECrr(p, "D", "E");
  },
  0x1c: function (p: CPU) {
    ops.INCr(p, "E");
  },
  0x1d: function (p: CPU) {
    ops.DECr(p, "E");
  },
  0x1e: function (p: CPU) {
    ops.LDrn(p, "E");
  },
  0x1f: function (p: CPU) {
    const c = p.r.F & 0x10 ? 1 : 0;
    const out = p.r.A & 0x01;
    if (out) {
      p.r.F = 0x10;
    } else {
      p.r.F = 0;
    }
    p.wr("A", (p.r.A >> 1) | (c * 0x80));
    p.clock.c += 4;
  },

  0x20: function (p: CPU) {
    ops.JRccn(p, "NZ");
  },
  0x21: function (p: CPU) {
    ops.LDrrnn(p, "H", "L");
  },
  0x22: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "A");
    ops.INCrr(p, "H", "L");
    p.clock.c -= 8;
  },
  0x23: function (p: CPU) {
    ops.INCrr(p, "H", "L");
  },
  0x24: function (p: CPU) {
    ops.INCr(p, "H");
  },
  0x25: function (p: CPU) {
    ops.DECr(p, "H");
  },
  0x26: function (p: CPU) {
    ops.LDrn(p, "H");
  },
  0x27: function (p: CPU) {
    ops.DAA(p);
  },
  0x28: function (p: CPU) {
    ops.JRccn(p, "Z");
  },
  0x29: function (p: CPU) {
    ops.ADDrrrr(p, "H", "L", "H", "L");
  },
  0x2a: function (p: CPU) {
    ops.LDrrra(p, "A", "H", "L");
    ops.INCrr(p, "H", "L");
    p.clock.c -= 8;
  },
  0x2b: function (p: CPU) {
    ops.DECrr(p, "H", "L");
  },
  0x2c: function (p: CPU) {
    ops.INCr(p, "L");
  },
  0x2d: function (p: CPU) {
    ops.DECr(p, "L");
  },
  0x2e: function (p: CPU) {
    ops.LDrn(p, "L");
  },
  0x2f: function (p: CPU) {
    ops.CPL(p);
  },

  0x30: function (p: CPU) {
    ops.JRccn(p, "NC");
  },
  0x31: function (p: CPU) {
    ops.LDspnn(p);
  },
  0x32: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "A");
    ops.DECrr(p, "H", "L");
    p.clock.c -= 8;
  },
  0x33: function (p: CPU) {
    ops.INCsp(p);
  },
  0x34: function (p: CPU) {
    ops.INCrra(p, "H", "L");
  },
  0x35: function (p: CPU) {
    ops.DECrra(p, "H", "L");
  },
  0x36: function (p: CPU) {
    ops.LDrran(p, "H", "L");
  },
  0x37: function (p: CPU) {
    ops.SCF(p);
  },
  0x38: function (p: CPU) {
    ops.JRccn(p, "C");
  },
  0x39: function (p: CPU) {
    ops.ADDrrsp(p, "H", "L");
  },
  0x3a: function (p: CPU) {
    ops.LDrrra(p, "A", "H", "L");
    ops.DECrr(p, "H", "L");
    p.clock.c -= 8;
  },
  0x3b: function (p: CPU) {
    ops.DECsp(p);
  },
  0x3c: function (p: CPU) {
    ops.INCr(p, "A");
  },
  0x3d: function (p: CPU) {
    ops.DECr(p, "A");
  },
  0x3e: function (p: CPU) {
    ops.LDrn(p, "A");
  },
  0x3f: function (p: CPU) {
    ops.CCF(p);
  },

  0x40: function (p: CPU) {
    ops.LDrr(p, "B", "B");
  },
  0x41: function (p: CPU) {
    ops.LDrr(p, "B", "C");
  },
  0x42: function (p: CPU) {
    ops.LDrr(p, "B", "D");
  },
  0x43: function (p: CPU) {
    ops.LDrr(p, "B", "E");
  },
  0x44: function (p: CPU) {
    ops.LDrr(p, "B", "H");
  },
  0x45: function (p: CPU) {
    ops.LDrr(p, "B", "L");
  },
  0x46: function (p: CPU) {
    ops.LDrrra(p, "B", "H", "L");
  },
  0x47: function (p: CPU) {
    ops.LDrr(p, "B", "A");
  },
  0x48: function (p: CPU) {
    ops.LDrr(p, "C", "B");
  },
  0x49: function (p: CPU) {
    ops.LDrr(p, "C", "C");
  },
  0x4a: function (p: CPU) {
    ops.LDrr(p, "C", "D");
  },
  0x4b: function (p: CPU) {
    ops.LDrr(p, "C", "E");
  },
  0x4c: function (p: CPU) {
    ops.LDrr(p, "C", "H");
  },
  0x4d: function (p: CPU) {
    ops.LDrr(p, "C", "L");
  },
  0x4e: function (p: CPU) {
    ops.LDrrra(p, "C", "H", "L");
  },
  0x4f: function (p: CPU) {
    ops.LDrr(p, "C", "A");
  },

  0x50: function (p: CPU) {
    ops.LDrr(p, "D", "B");
  },
  0x51: function (p: CPU) {
    ops.LDrr(p, "D", "C");
  },
  0x52: function (p: CPU) {
    ops.LDrr(p, "D", "D");
  },
  0x53: function (p: CPU) {
    ops.LDrr(p, "D", "E");
  },
  0x54: function (p: CPU) {
    ops.LDrr(p, "D", "H");
  },
  0x55: function (p: CPU) {
    ops.LDrr(p, "D", "L");
  },
  0x56: function (p: CPU) {
    ops.LDrrra(p, "D", "H", "L");
  },
  0x57: function (p: CPU) {
    ops.LDrr(p, "D", "A");
  },
  0x58: function (p: CPU) {
    ops.LDrr(p, "E", "B");
  },
  0x59: function (p: CPU) {
    ops.LDrr(p, "E", "C");
  },
  0x5a: function (p: CPU) {
    ops.LDrr(p, "E", "D");
  },
  0x5b: function (p: CPU) {
    ops.LDrr(p, "E", "E");
  },
  0x5c: function (p: CPU) {
    ops.LDrr(p, "E", "H");
  },
  0x5d: function (p: CPU) {
    ops.LDrr(p, "E", "L");
  },
  0x5e: function (p: CPU) {
    ops.LDrrra(p, "E", "H", "L");
  },
  0x5f: function (p: CPU) {
    ops.LDrr(p, "E", "A");
  },

  0x60: function (p: CPU) {
    ops.LDrr(p, "H", "B");
  },
  0x61: function (p: CPU) {
    ops.LDrr(p, "H", "C");
  },
  0x62: function (p: CPU) {
    ops.LDrr(p, "H", "D");
  },
  0x63: function (p: CPU) {
    ops.LDrr(p, "H", "E");
  },
  0x64: function (p: CPU) {
    ops.LDrr(p, "H", "H");
  },
  0x65: function (p: CPU) {
    ops.LDrr(p, "H", "L");
  },
  0x66: function (p: CPU) {
    ops.LDrrra(p, "H", "H", "L");
  },
  0x67: function (p: CPU) {
    ops.LDrr(p, "H", "A");
  },
  0x68: function (p: CPU) {
    ops.LDrr(p, "L", "B");
  },
  0x69: function (p: CPU) {
    ops.LDrr(p, "L", "C");
  },
  0x6a: function (p: CPU) {
    ops.LDrr(p, "L", "D");
  },
  0x6b: function (p: CPU) {
    ops.LDrr(p, "L", "E");
  },
  0x6c: function (p: CPU) {
    ops.LDrr(p, "L", "H");
  },
  0x6d: function (p: CPU) {
    ops.LDrr(p, "L", "L");
  },
  0x6e: function (p: CPU) {
    ops.LDrrra(p, "L", "H", "L");
  },
  0x6f: function (p: CPU) {
    ops.LDrr(p, "L", "A");
  },

  0x70: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "B");
  },
  0x71: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "C");
  },
  0x72: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "D");
  },
  0x73: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "E");
  },
  0x74: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "H");
  },
  0x75: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "L");
  },
  0x76: function (p: CPU) {
    ops.HALT(p);
  },
  0x77: function (p: CPU) {
    ops.LDrrar(p, "H", "L", "A");
  },
  0x78: function (p: CPU) {
    ops.LDrr(p, "A", "B");
  },
  0x79: function (p: CPU) {
    ops.LDrr(p, "A", "C");
  },
  0x7a: function (p: CPU) {
    ops.LDrr(p, "A", "D");
  },
  0x7b: function (p: CPU) {
    ops.LDrr(p, "A", "E");
  },
  0x7c: function (p: CPU) {
    ops.LDrr(p, "A", "H");
  },
  0x7d: function (p: CPU) {
    ops.LDrr(p, "A", "L");
  },
  0x7e: function (p: CPU) {
    ops.LDrrra(p, "A", "H", "L");
  },
  0x7f: function (p: CPU) {
    ops.LDrr(p, "A", "A");
  },

  0x80: function (p: CPU) {
    ops.ADDrr(p, "A", "B");
  },
  0x81: function (p: CPU) {
    ops.ADDrr(p, "A", "C");
  },
  0x82: function (p: CPU) {
    ops.ADDrr(p, "A", "D");
  },
  0x83: function (p: CPU) {
    ops.ADDrr(p, "A", "E");
  },
  0x84: function (p: CPU) {
    ops.ADDrr(p, "A", "H");
  },
  0x85: function (p: CPU) {
    ops.ADDrr(p, "A", "L");
  },
  0x86: function (p: CPU) {
    ops.ADDrrra(p, "A", "H", "L");
  },
  0x87: function (p: CPU) {
    ops.ADDrr(p, "A", "A");
  },
  0x88: function (p: CPU) {
    ops.ADCrr(p, "A", "B");
  },
  0x89: function (p: CPU) {
    ops.ADCrr(p, "A", "C");
  },
  0x8a: function (p: CPU) {
    ops.ADCrr(p, "A", "D");
  },
  0x8b: function (p: CPU) {
    ops.ADCrr(p, "A", "E");
  },
  0x8c: function (p: CPU) {
    ops.ADCrr(p, "A", "H");
  },
  0x8d: function (p: CPU) {
    ops.ADCrr(p, "A", "L");
  },
  0x8e: function (p: CPU) {
    ops.ADCrrra(p, "A", "H", "L");
  },
  0x8f: function (p: CPU) {
    ops.ADCrr(p, "A", "A");
  },

  0x90: function (p: CPU) {
    ops.SUBr(p, "B");
  },
  0x91: function (p: CPU) {
    ops.SUBr(p, "C");
  },
  0x92: function (p: CPU) {
    ops.SUBr(p, "D");
  },
  0x93: function (p: CPU) {
    ops.SUBr(p, "E");
  },
  0x94: function (p: CPU) {
    ops.SUBr(p, "H");
  },
  0x95: function (p: CPU) {
    ops.SUBr(p, "L");
  },
  0x96: function (p: CPU) {
    ops.SUBrra(p, "H", "L");
  },
  0x97: function (p: CPU) {
    ops.SUBr(p, "A");
  },
  0x98: function (p: CPU) {
    ops.SBCr(p, "B");
  },
  0x99: function (p: CPU) {
    ops.SBCr(p, "C");
  },
  0x9a: function (p: CPU) {
    ops.SBCr(p, "D");
  },
  0x9b: function (p: CPU) {
    ops.SBCr(p, "E");
  },
  0x9c: function (p: CPU) {
    ops.SBCr(p, "H");
  },
  0x9d: function (p: CPU) {
    ops.SBCr(p, "L");
  },
  0x9e: function (p: CPU) {
    ops.SBCrra(p, "H", "L");
  },
  0x9f: function (p: CPU) {
    ops.SBCr(p, "A");
  },

  0xa0: function (p: CPU) {
    ops.ANDr(p, "B");
  },
  0xa1: function (p: CPU) {
    ops.ANDr(p, "C");
  },
  0xa2: function (p: CPU) {
    ops.ANDr(p, "D");
  },
  0xa3: function (p: CPU) {
    ops.ANDr(p, "E");
  },
  0xa4: function (p: CPU) {
    ops.ANDr(p, "H");
  },
  0xa5: function (p: CPU) {
    ops.ANDr(p, "L");
  },
  0xa6: function (p: CPU) {
    ops.ANDrra(p, "H", "L");
  },
  0xa7: function (p: CPU) {
    ops.ANDr(p, "A");
  },
  0xa8: function (p: CPU) {
    ops.XORr(p, "B");
  },
  0xa9: function (p: CPU) {
    ops.XORr(p, "C");
  },
  0xaa: function (p: CPU) {
    ops.XORr(p, "D");
  },
  0xab: function (p: CPU) {
    ops.XORr(p, "E");
  },
  0xac: function (p: CPU) {
    ops.XORr(p, "H");
  },
  0xad: function (p: CPU) {
    ops.XORr(p, "L");
  },
  0xae: function (p: CPU) {
    ops.XORrra(p, "H", "L");
  },
  0xaf: function (p: CPU) {
    ops.XORr(p, "A");
  },

  0xb0: function (p: CPU) {
    ops.ORr(p, "B");
  },
  0xb1: function (p: CPU) {
    ops.ORr(p, "C");
  },
  0xb2: function (p: CPU) {
    ops.ORr(p, "D");
  },
  0xb3: function (p: CPU) {
    ops.ORr(p, "E");
  },
  0xb4: function (p: CPU) {
    ops.ORr(p, "H");
  },
  0xb5: function (p: CPU) {
    ops.ORr(p, "L");
  },
  0xb6: function (p: CPU) {
    ops.ORrra(p, "H", "L");
  },
  0xb7: function (p: CPU) {
    ops.ORr(p, "A");
  },
  0xb8: function (p: CPU) {
    ops.CPr(p, "B");
  },
  0xb9: function (p: CPU) {
    ops.CPr(p, "C");
  },
  0xba: function (p: CPU) {
    ops.CPr(p, "D");
  },
  0xbb: function (p: CPU) {
    ops.CPr(p, "E");
  },
  0xbc: function (p: CPU) {
    ops.CPr(p, "H");
  },
  0xbd: function (p: CPU) {
    ops.CPr(p, "L");
  },
  0xbe: function (p: CPU) {
    ops.CPrra(p, "H", "L");
  },
  0xbf: function (p: CPU) {
    ops.CPr(p, "A");
  },

  0xc0: function (p: CPU) {
    ops.RETcc(p, "NZ");
  },
  0xc1: function (p: CPU) {
    ops.POPrr(p, "B", "C");
  },
  0xc2: function (p: CPU) {
    ops.JPccnn(p, "NZ");
  },
  0xc3: function (p: CPU) {
    ops.JPnn(p);
  },
  0xc4: function (p: CPU) {
    ops.CALLccnn(p, "NZ");
  },
  0xc5: function (p: CPU) {
    ops.PUSHrr(p, "B", "C");
  },
  0xc6: function (p: CPU) {
    ops.ADDrn(p, "A");
  },
  0xc7: function (p: CPU) {
    ops.RSTn(p, 0x00);
  },
  0xc8: function (p: CPU) {
    ops.RETcc(p, "Z");
  },
  0xc9: function (p: CPU) {
    ops.RET(p);
  },
  0xca: function (p: CPU) {
    ops.JPccnn(p, "Z");
  },
  0xcb: function (p: CPU) {
    ops.CB(p);
  },
  0xcc: function (p: CPU) {
    ops.CALLccnn(p, "Z");
  },
  0xcd: function (p: CPU) {
    ops.CALLnn(p);
  },
  0xce: function (p: CPU) {
    ops.ADCrn(p, "A");
  },
  0xcf: function (p: CPU) {
    ops.RSTn(p, 0x08);
  },

  0xd0: function (p: CPU) {
    ops.RETcc(p, "NC");
  },
  0xd1: function (p: CPU) {
    ops.POPrr(p, "D", "E");
  },
  0xd2: function (p: CPU) {
    ops.JPccnn(p, "NC");
  },
  //0xD3 empty
  0xd4: function (p: CPU) {
    ops.CALLccnn(p, "NC");
  },
  0xd5: function (p: CPU) {
    ops.PUSHrr(p, "D", "E");
  },
  0xd6: function (p: CPU) {
    ops.SUBn(p);
  },
  0xd7: function (p: CPU) {
    ops.RSTn(p, 0x10);
  },
  0xd8: function (p: CPU) {
    ops.RETcc(p, "C");
  },
  0xd9: function (p: CPU) {
    ops.RETI(p);
  },
  0xda: function (p: CPU) {
    ops.JPccnn(p, "C");
  },
  //0xDB empty
  0xdc: function (p: CPU) {
    ops.CALLccnn(p, "C");
  },
  //0xDD empty
  0xde: function (p: CPU) {
    ops.SBCn(p);
  },
  0xdf: function (p: CPU) {
    ops.RSTn(p, 0x18);
  },

  0xe0: function (p: CPU) {
    ops.LDHnar(p, "A");
  },
  0xe1: function (p: CPU) {
    ops.POPrr(p, "H", "L");
  },
  0xe2: function (p: CPU) {
    ops.LDrar(p, "C", "A");
  },
  //0xE3 empty
  //0xE4 empty
  0xe5: function (p: CPU) {
    ops.PUSHrr(p, "H", "L");
  },
  0xe6: function (p: CPU) {
    ops.ANDn(p);
  },
  0xe7: function (p: CPU) {
    ops.RSTn(p, 0x20);
  },
  0xe8: function (p: CPU) {
    ops.ADDspn(p);
  },
  0xe9: function (p: CPU) {
    ops.JPrr(p, "H", "L");
  },
  0xea: function (p: CPU) {
    ops.LDnnar(p, "A");
  },
  //0xEB empty
  //0xEC empty
  //0xED empty
  0xee: function (p: CPU) {
    ops.XORn(p);
  },
  0xef: function (p: CPU) {
    ops.RSTn(p, 0x28);
  },

  0xf0: function (p: CPU) {
    ops.LDHrna(p, "A");
  },
  0xf1: function (p: CPU) {
    ops.POPrr(p, "A", "F");
  },
  0xf2: function (p: CPU) {
    ops.LDrra(p, "A", "C");
  },
  0xf3: function (p: CPU) {
    ops.DI(p);
  },
  //0xF4 empty
  0xf5: function (p: CPU) {
    ops.PUSHrr(p, "A", "F");
  },
  0xf6: function (p: CPU) {
    ops.ORn(p);
  },
  0xf7: function (p: CPU) {
    ops.RSTn(p, 0x30);
  },
  0xf8: function (p: CPU) {
    ops.LDrrspn(p, "H", "L");
  },
  0xf9: function (p: CPU) {
    ops.LDsprr(p, "H", "L");
  },
  0xfa: function (p: CPU) {
    ops.LDrnna(p, "A");
  },
  0xfb: function (p: CPU) {
    ops.EI(p);
  },
  //0xFC empty
  //0xFD empty
  0xfe: function (p: CPU) {
    ops.CPn(p);
  },
  0xff: function (p: CPU) {
    ops.RSTn(p, 0x38);
  },
};

const cbmap = {
  0x00: function (p: CPU) {
    ops.RLCr(p, "B");
  },
  0x01: function (p: CPU) {
    ops.RLCr(p, "C");
  },
  0x02: function (p: CPU) {
    ops.RLCr(p, "D");
  },
  0x03: function (p: CPU) {
    ops.RLCr(p, "E");
  },
  0x04: function (p: CPU) {
    ops.RLCr(p, "H");
  },
  0x05: function (p: CPU) {
    ops.RLCr(p, "L");
  },
  0x06: function (p: CPU) {
    ops.RLCrra(p, "H", "L");
  },
  0x07: function (p: CPU) {
    ops.RLCr(p, "A");
  },
  0x08: function (p: CPU) {
    ops.RRCr(p, "B");
  },
  0x09: function (p: CPU) {
    ops.RRCr(p, "C");
  },
  0x0a: function (p: CPU) {
    ops.RRCr(p, "D");
  },
  0x0b: function (p: CPU) {
    ops.RRCr(p, "E");
  },
  0x0c: function (p: CPU) {
    ops.RRCr(p, "H");
  },
  0x0d: function (p: CPU) {
    ops.RRCr(p, "L");
  },
  0x0e: function (p: CPU) {
    ops.RRCrra(p, "H", "L");
  },
  0x0f: function (p: CPU) {
    ops.RRCr(p, "A");
  },

  0x10: function (p: CPU) {
    ops.RLr(p, "B");
  },
  0x11: function (p: CPU) {
    ops.RLr(p, "C");
  },
  0x12: function (p: CPU) {
    ops.RLr(p, "D");
  },
  0x13: function (p: CPU) {
    ops.RLr(p, "E");
  },
  0x14: function (p: CPU) {
    ops.RLr(p, "H");
  },
  0x15: function (p: CPU) {
    ops.RLr(p, "L");
  },
  0x16: function (p: CPU) {
    ops.RLrra(p, "H", "L");
  },
  0x17: function (p: CPU) {
    ops.RLr(p, "A");
  },
  0x18: function (p: CPU) {
    ops.RRr(p, "B");
  },
  0x19: function (p: CPU) {
    ops.RRr(p, "C");
  },
  0x1a: function (p: CPU) {
    ops.RRr(p, "D");
  },
  0x1b: function (p: CPU) {
    ops.RRr(p, "E");
  },
  0x1c: function (p: CPU) {
    ops.RRr(p, "H");
  },
  0x1d: function (p: CPU) {
    ops.RRr(p, "L");
  },
  0x1e: function (p: CPU) {
    ops.RRrra(p, "H", "L");
  },
  0x1f: function (p: CPU) {
    ops.RRr(p, "A");
  },

  0x20: function (p: CPU) {
    ops.SLAr(p, "B");
  },
  0x21: function (p: CPU) {
    ops.SLAr(p, "C");
  },
  0x22: function (p: CPU) {
    ops.SLAr(p, "D");
  },
  0x23: function (p: CPU) {
    ops.SLAr(p, "E");
  },
  0x24: function (p: CPU) {
    ops.SLAr(p, "H");
  },
  0x25: function (p: CPU) {
    ops.SLAr(p, "L");
  },
  0x26: function (p: CPU) {
    ops.SLArra(p, "H", "L");
  },
  0x27: function (p: CPU) {
    ops.SLAr(p, "A");
  },
  0x28: function (p: CPU) {
    ops.SRAr(p, "B");
  },
  0x29: function (p: CPU) {
    ops.SRAr(p, "C");
  },
  0x2a: function (p: CPU) {
    ops.SRAr(p, "D");
  },
  0x2b: function (p: CPU) {
    ops.SRAr(p, "E");
  },
  0x2c: function (p: CPU) {
    ops.SRAr(p, "H");
  },
  0x2d: function (p: CPU) {
    ops.SRAr(p, "L");
  },
  0x2e: function (p: CPU) {
    ops.SRArra(p, "H", "L");
  },
  0x2f: function (p: CPU) {
    ops.SRAr(p, "A");
  },

  0x30: function (p: CPU) {
    ops.SWAPr(p, "B");
  },
  0x31: function (p: CPU) {
    ops.SWAPr(p, "C");
  },
  0x32: function (p: CPU) {
    ops.SWAPr(p, "D");
  },
  0x33: function (p: CPU) {
    ops.SWAPr(p, "E");
  },
  0x34: function (p: CPU) {
    ops.SWAPr(p, "H");
  },
  0x35: function (p: CPU) {
    ops.SWAPr(p, "L");
  },
  0x36: function (p: CPU) {
    ops.SWAPrra(p, "H", "L");
  },
  0x37: function (p: CPU) {
    ops.SWAPr(p, "A");
  },
  0x38: function (p: CPU) {
    ops.SRLr(p, "B");
  },
  0x39: function (p: CPU) {
    ops.SRLr(p, "C");
  },
  0x3a: function (p: CPU) {
    ops.SRLr(p, "D");
  },
  0x3b: function (p: CPU) {
    ops.SRLr(p, "E");
  },
  0x3c: function (p: CPU) {
    ops.SRLr(p, "H");
  },
  0x3d: function (p: CPU) {
    ops.SRLr(p, "L");
  },
  0x3e: function (p: CPU) {
    ops.SRLrra(p, "H", "L");
  },
  0x3f: function (p: CPU) {
    ops.SRLr(p, "A");
  },

  0x40: function (p: CPU) {
    ops.BITir(p, 0, "B");
  },
  0x41: function (p: CPU) {
    ops.BITir(p, 0, "C");
  },
  0x42: function (p: CPU) {
    ops.BITir(p, 0, "D");
  },
  0x43: function (p: CPU) {
    ops.BITir(p, 0, "E");
  },
  0x44: function (p: CPU) {
    ops.BITir(p, 0, "H");
  },
  0x45: function (p: CPU) {
    ops.BITir(p, 0, "L");
  },
  0x46: function (p: CPU) {
    ops.BITirra(p, 0, "H", "L");
  },
  0x47: function (p: CPU) {
    ops.BITir(p, 0, "A");
  },
  0x48: function (p: CPU) {
    ops.BITir(p, 1, "B");
  },
  0x49: function (p: CPU) {
    ops.BITir(p, 1, "C");
  },
  0x4a: function (p: CPU) {
    ops.BITir(p, 1, "D");
  },
  0x4b: function (p: CPU) {
    ops.BITir(p, 1, "E");
  },
  0x4c: function (p: CPU) {
    ops.BITir(p, 1, "H");
  },
  0x4d: function (p: CPU) {
    ops.BITir(p, 1, "L");
  },
  0x4e: function (p: CPU) {
    ops.BITirra(p, 1, "H", "L");
  },
  0x4f: function (p: CPU) {
    ops.BITir(p, 1, "A");
  },

  0x50: function (p: CPU) {
    ops.BITir(p, 2, "B");
  },
  0x51: function (p: CPU) {
    ops.BITir(p, 2, "C");
  },
  0x52: function (p: CPU) {
    ops.BITir(p, 2, "D");
  },
  0x53: function (p: CPU) {
    ops.BITir(p, 2, "E");
  },
  0x54: function (p: CPU) {
    ops.BITir(p, 2, "H");
  },
  0x55: function (p: CPU) {
    ops.BITir(p, 2, "L");
  },
  0x56: function (p: CPU) {
    ops.BITirra(p, 2, "H", "L");
  },
  0x57: function (p: CPU) {
    ops.BITir(p, 2, "A");
  },
  0x58: function (p: CPU) {
    ops.BITir(p, 3, "B");
  },
  0x59: function (p: CPU) {
    ops.BITir(p, 3, "C");
  },
  0x5a: function (p: CPU) {
    ops.BITir(p, 3, "D");
  },
  0x5b: function (p: CPU) {
    ops.BITir(p, 3, "E");
  },
  0x5c: function (p: CPU) {
    ops.BITir(p, 3, "H");
  },
  0x5d: function (p: CPU) {
    ops.BITir(p, 3, "L");
  },
  0x5e: function (p: CPU) {
    ops.BITirra(p, 3, "H", "L");
  },
  0x5f: function (p: CPU) {
    ops.BITir(p, 3, "A");
  },

  0x60: function (p: CPU) {
    ops.BITir(p, 4, "B");
  },
  0x61: function (p: CPU) {
    ops.BITir(p, 4, "C");
  },
  0x62: function (p: CPU) {
    ops.BITir(p, 4, "D");
  },
  0x63: function (p: CPU) {
    ops.BITir(p, 4, "E");
  },
  0x64: function (p: CPU) {
    ops.BITir(p, 4, "H");
  },
  0x65: function (p: CPU) {
    ops.BITir(p, 4, "L");
  },
  0x66: function (p: CPU) {
    ops.BITirra(p, 4, "H", "L");
  },
  0x67: function (p: CPU) {
    ops.BITir(p, 4, "A");
  },
  0x68: function (p: CPU) {
    ops.BITir(p, 5, "B");
  },
  0x69: function (p: CPU) {
    ops.BITir(p, 5, "C");
  },
  0x6a: function (p: CPU) {
    ops.BITir(p, 5, "D");
  },
  0x6b: function (p: CPU) {
    ops.BITir(p, 5, "E");
  },
  0x6c: function (p: CPU) {
    ops.BITir(p, 5, "H");
  },
  0x6d: function (p: CPU) {
    ops.BITir(p, 5, "L");
  },
  0x6e: function (p: CPU) {
    ops.BITirra(p, 5, "H", "L");
  },
  0x6f: function (p: CPU) {
    ops.BITir(p, 5, "A");
  },

  0x70: function (p: CPU) {
    ops.BITir(p, 6, "B");
  },
  0x71: function (p: CPU) {
    ops.BITir(p, 6, "C");
  },
  0x72: function (p: CPU) {
    ops.BITir(p, 6, "D");
  },
  0x73: function (p: CPU) {
    ops.BITir(p, 6, "E");
  },
  0x74: function (p: CPU) {
    ops.BITir(p, 6, "H");
  },
  0x75: function (p: CPU) {
    ops.BITir(p, 6, "L");
  },
  0x76: function (p: CPU) {
    ops.BITirra(p, 6, "H", "L");
  },
  0x77: function (p: CPU) {
    ops.BITir(p, 6, "A");
  },
  0x78: function (p: CPU) {
    ops.BITir(p, 7, "B");
  },
  0x79: function (p: CPU) {
    ops.BITir(p, 7, "C");
  },
  0x7a: function (p: CPU) {
    ops.BITir(p, 7, "D");
  },
  0x7b: function (p: CPU) {
    ops.BITir(p, 7, "E");
  },
  0x7c: function (p: CPU) {
    ops.BITir(p, 7, "H");
  },
  0x7d: function (p: CPU) {
    ops.BITir(p, 7, "L");
  },
  0x7e: function (p: CPU) {
    ops.BITirra(p, 7, "H", "L");
  },
  0x7f: function (p: CPU) {
    ops.BITir(p, 7, "A");
  },

  0x80: function (p: CPU) {
    ops.RESir(p, 0, "B");
  },
  0x81: function (p: CPU) {
    ops.RESir(p, 0, "C");
  },
  0x82: function (p: CPU) {
    ops.RESir(p, 0, "D");
  },
  0x83: function (p: CPU) {
    ops.RESir(p, 0, "E");
  },
  0x84: function (p: CPU) {
    ops.RESir(p, 0, "H");
  },
  0x85: function (p: CPU) {
    ops.RESir(p, 0, "L");
  },
  0x86: function (p: CPU) {
    ops.RESirra(p, 0, "H", "L");
  },
  0x87: function (p: CPU) {
    ops.RESir(p, 0, "A");
  },
  0x88: function (p: CPU) {
    ops.RESir(p, 1, "B");
  },
  0x89: function (p: CPU) {
    ops.RESir(p, 1, "C");
  },
  0x8a: function (p: CPU) {
    ops.RESir(p, 1, "D");
  },
  0x8b: function (p: CPU) {
    ops.RESir(p, 1, "E");
  },
  0x8c: function (p: CPU) {
    ops.RESir(p, 1, "H");
  },
  0x8d: function (p: CPU) {
    ops.RESir(p, 1, "L");
  },
  0x8e: function (p: CPU) {
    ops.RESirra(p, 1, "H", "L");
  },
  0x8f: function (p: CPU) {
    ops.RESir(p, 1, "A");
  },

  0x90: function (p: CPU) {
    ops.RESir(p, 2, "B");
  },
  0x91: function (p: CPU) {
    ops.RESir(p, 2, "C");
  },
  0x92: function (p: CPU) {
    ops.RESir(p, 2, "D");
  },
  0x93: function (p: CPU) {
    ops.RESir(p, 2, "E");
  },
  0x94: function (p: CPU) {
    ops.RESir(p, 2, "H");
  },
  0x95: function (p: CPU) {
    ops.RESir(p, 2, "L");
  },
  0x96: function (p: CPU) {
    ops.RESirra(p, 2, "H", "L");
  },
  0x97: function (p: CPU) {
    ops.RESir(p, 2, "A");
  },
  0x98: function (p: CPU) {
    ops.RESir(p, 3, "B");
  },
  0x99: function (p: CPU) {
    ops.RESir(p, 3, "C");
  },
  0x9a: function (p: CPU) {
    ops.RESir(p, 3, "D");
  },
  0x9b: function (p: CPU) {
    ops.RESir(p, 3, "E");
  },
  0x9c: function (p: CPU) {
    ops.RESir(p, 3, "H");
  },
  0x9d: function (p: CPU) {
    ops.RESir(p, 3, "L");
  },
  0x9e: function (p: CPU) {
    ops.RESirra(p, 3, "H", "L");
  },
  0x9f: function (p: CPU) {
    ops.RESir(p, 3, "A");
  },

  0xa0: function (p: CPU) {
    ops.RESir(p, 4, "B");
  },
  0xa1: function (p: CPU) {
    ops.RESir(p, 4, "C");
  },
  0xa2: function (p: CPU) {
    ops.RESir(p, 4, "D");
  },
  0xa3: function (p: CPU) {
    ops.RESir(p, 4, "E");
  },
  0xa4: function (p: CPU) {
    ops.RESir(p, 4, "H");
  },
  0xa5: function (p: CPU) {
    ops.RESir(p, 4, "L");
  },
  0xa6: function (p: CPU) {
    ops.RESirra(p, 4, "H", "L");
  },
  0xa7: function (p: CPU) {
    ops.RESir(p, 4, "A");
  },
  0xa8: function (p: CPU) {
    ops.RESir(p, 5, "B");
  },
  0xa9: function (p: CPU) {
    ops.RESir(p, 5, "C");
  },
  0xaa: function (p: CPU) {
    ops.RESir(p, 5, "D");
  },
  0xab: function (p: CPU) {
    ops.RESir(p, 5, "E");
  },
  0xac: function (p: CPU) {
    ops.RESir(p, 5, "H");
  },
  0xad: function (p: CPU) {
    ops.RESir(p, 5, "L");
  },
  0xae: function (p: CPU) {
    ops.RESirra(p, 5, "H", "L");
  },
  0xaf: function (p: CPU) {
    ops.RESir(p, 5, "A");
  },

  0xb0: function (p: CPU) {
    ops.RESir(p, 6, "B");
  },
  0xb1: function (p: CPU) {
    ops.RESir(p, 6, "C");
  },
  0xb2: function (p: CPU) {
    ops.RESir(p, 6, "D");
  },
  0xb3: function (p: CPU) {
    ops.RESir(p, 6, "E");
  },
  0xb4: function (p: CPU) {
    ops.RESir(p, 6, "H");
  },
  0xb5: function (p: CPU) {
    ops.RESir(p, 6, "L");
  },
  0xb6: function (p: CPU) {
    ops.RESirra(p, 6, "H", "L");
  },
  0xb7: function (p: CPU) {
    ops.RESir(p, 6, "A");
  },
  0xb8: function (p: CPU) {
    ops.RESir(p, 7, "B");
  },
  0xb9: function (p: CPU) {
    ops.RESir(p, 7, "C");
  },
  0xba: function (p: CPU) {
    ops.RESir(p, 7, "D");
  },
  0xbb: function (p: CPU) {
    ops.RESir(p, 7, "E");
  },
  0xbc: function (p: CPU) {
    ops.RESir(p, 7, "H");
  },
  0xbd: function (p: CPU) {
    ops.RESir(p, 7, "L");
  },
  0xbe: function (p: CPU) {
    ops.RESirra(p, 7, "H", "L");
  },
  0xbf: function (p: CPU) {
    ops.RESir(p, 7, "A");
  },

  0xc0: function (p: CPU) {
    ops.SETir(p, 0, "B");
  },
  0xc1: function (p: CPU) {
    ops.SETir(p, 0, "C");
  },
  0xc2: function (p: CPU) {
    ops.SETir(p, 0, "D");
  },
  0xc3: function (p: CPU) {
    ops.SETir(p, 0, "E");
  },
  0xc4: function (p: CPU) {
    ops.SETir(p, 0, "H");
  },
  0xc5: function (p: CPU) {
    ops.SETir(p, 0, "L");
  },
  0xc6: function (p: CPU) {
    ops.SETirra(p, 0, "H", "L");
  },
  0xc7: function (p: CPU) {
    ops.SETir(p, 0, "A");
  },
  0xc8: function (p: CPU) {
    ops.SETir(p, 1, "B");
  },
  0xc9: function (p: CPU) {
    ops.SETir(p, 1, "C");
  },
  0xca: function (p: CPU) {
    ops.SETir(p, 1, "D");
  },
  0xcb: function (p: CPU) {
    ops.SETir(p, 1, "E");
  },
  0xcc: function (p: CPU) {
    ops.SETir(p, 1, "H");
  },
  0xcd: function (p: CPU) {
    ops.SETir(p, 1, "L");
  },
  0xce: function (p: CPU) {
    ops.SETirra(p, 1, "H", "L");
  },
  0xcf: function (p: CPU) {
    ops.SETir(p, 1, "A");
  },

  0xd0: function (p: CPU) {
    ops.SETir(p, 2, "B");
  },
  0xd1: function (p: CPU) {
    ops.SETir(p, 2, "C");
  },
  0xd2: function (p: CPU) {
    ops.SETir(p, 2, "D");
  },
  0xd3: function (p: CPU) {
    ops.SETir(p, 2, "E");
  },
  0xd4: function (p: CPU) {
    ops.SETir(p, 2, "H");
  },
  0xd5: function (p: CPU) {
    ops.SETir(p, 2, "L");
  },
  0xd6: function (p: CPU) {
    ops.SETirra(p, 2, "H", "L");
  },
  0xd7: function (p: CPU) {
    ops.SETir(p, 2, "A");
  },
  0xd8: function (p: CPU) {
    ops.SETir(p, 3, "B");
  },
  0xd9: function (p: CPU) {
    ops.SETir(p, 3, "C");
  },
  0xda: function (p: CPU) {
    ops.SETir(p, 3, "D");
  },
  0xdb: function (p: CPU) {
    ops.SETir(p, 3, "E");
  },
  0xdc: function (p: CPU) {
    ops.SETir(p, 3, "H");
  },
  0xdd: function (p: CPU) {
    ops.SETir(p, 3, "L");
  },
  0xde: function (p: CPU) {
    ops.SETirra(p, 3, "H", "L");
  },
  0xdf: function (p: CPU) {
    ops.SETir(p, 3, "A");
  },

  0xe0: function (p: CPU) {
    ops.SETir(p, 4, "B");
  },
  0xe1: function (p: CPU) {
    ops.SETir(p, 4, "C");
  },
  0xe2: function (p: CPU) {
    ops.SETir(p, 4, "D");
  },
  0xe3: function (p: CPU) {
    ops.SETir(p, 4, "E");
  },
  0xe4: function (p: CPU) {
    ops.SETir(p, 4, "H");
  },
  0xe5: function (p: CPU) {
    ops.SETir(p, 4, "L");
  },
  0xe6: function (p: CPU) {
    ops.SETirra(p, 4, "H", "L");
  },
  0xe7: function (p: CPU) {
    ops.SETir(p, 4, "A");
  },
  0xe8: function (p: CPU) {
    ops.SETir(p, 5, "B");
  },
  0xe9: function (p: CPU) {
    ops.SETir(p, 5, "C");
  },
  0xea: function (p: CPU) {
    ops.SETir(p, 5, "D");
  },
  0xeb: function (p: CPU) {
    ops.SETir(p, 5, "E");
  },
  0xec: function (p: CPU) {
    ops.SETir(p, 5, "H");
  },
  0xed: function (p: CPU) {
    ops.SETir(p, 5, "L");
  },
  0xee: function (p: CPU) {
    ops.SETirra(p, 5, "H", "L");
  },
  0xef: function (p: CPU) {
    ops.SETir(p, 5, "A");
  },

  0xf0: function (p: CPU) {
    ops.SETir(p, 6, "B");
  },
  0xf1: function (p: CPU) {
    ops.SETir(p, 6, "C");
  },
  0xf2: function (p: CPU) {
    ops.SETir(p, 6, "D");
  },
  0xf3: function (p: CPU) {
    ops.SETir(p, 6, "E");
  },
  0xf4: function (p: CPU) {
    ops.SETir(p, 6, "H");
  },
  0xf5: function (p: CPU) {
    ops.SETir(p, 6, "L");
  },
  0xf6: function (p: CPU) {
    ops.SETirra(p, 6, "H", "L");
  },
  0xf7: function (p: CPU) {
    ops.SETir(p, 6, "A");
  },
  0xf8: function (p: CPU) {
    ops.SETir(p, 7, "B");
  },
  0xf9: function (p: CPU) {
    ops.SETir(p, 7, "C");
  },
  0xfa: function (p: CPU) {
    ops.SETir(p, 7, "D");
  },
  0xfb: function (p: CPU) {
    ops.SETir(p, 7, "E");
  },
  0xfc: function (p: CPU) {
    ops.SETir(p, 7, "H");
  },
  0xfd: function (p: CPU) {
    ops.SETir(p, 7, "L");
  },
  0xfe: function (p: CPU) {
    ops.SETirra(p, 7, "H", "L");
  },
  0xff: function (p: CPU) {
    ops.SETir(p, 7, "A");
  },
};

export { map as opcodeMap, cbmap as opcodeCbmap };
