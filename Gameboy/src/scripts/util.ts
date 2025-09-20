import CPU from "./cpu";
import type { GameboyOptions } from "./gameboy";

type register = "A" | "F" | "B" | "C" | "D" | "E" | "H" | "L" | "pc" | "sp";


// Utility functions
const Util = {
  // Add to the first argument the properties of all other arguments
  extend: function (target: GameboyOptions, ...sources: Array<GameboyOptions> /*, source1, source2, etc. */) {
    for (const i in sources) {
      const source = sources[i];
      for (const key in source) {
        // Use Object.prototype.hasOwnProperty.call to avoid iterating over inherited properties
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
        }
      }
    }
    return target;
  },
  testFlag: function (p: CPU, cc: string) {
    let test: number = 1;
    let mask: number = 0x10;
    if (cc == "NZ" || cc == "NC") test = 0;
    if (cc == "NZ" || cc == "Z") mask = 0x80;
    return (test && p.r.F & mask) || (!test && !(p.r.F & mask));
  },
  getRegAddr: function (
    p: CPU,
    r1: register,
    r2: register
  ) {
    return Util.makeword(p.r[r1], p.r[r2]);
  },

  // make a 16 bits word from 2 bytes
  makeword: function (b1: number, b2: number) {
    return (b1 << 8) + b2;
  },

  // return the integer signed value of a given byte
  getSignedValue: function (v: number) {
    return v & 0x80 ? v - 256 : v;
  },

  // extract a bit from a byte
  readBit: function (byte: number, index: number) {
    return (byte >> index) & 1;
  },
};


export default Util;
