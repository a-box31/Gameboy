import Util from "./util";
import { opcodeCbmap } from "./opcodes";
import CPU from "./cpu";

// List of CPU operations
// Most operations have been factorized here to limit code redundancy
//
// How to read operations:
// Uppercase letters qualify the kind of operation (LD = LOAD, INC = INCREMENT, etc.)
// Lowercase letters are used to hint parameters :
// r = register, n = 1 memory byte, sp = sp register,
// a = suffix for memory address, i = bit index
// Example : LDrrar = LOAD operation with two-registers memory address
// as first parameter and one register value as second
//
// Underscore-prefixed functions are here to delegate the logic between similar operations,
// they should not be called from outside
//
// It's up to each operation to update the CPU clock
const ops = {
  LDrrnn: function (p: CPU, r1: string, r2: string) {
    p.wr(r2, p.memory.rb(p.r.pc));
    p.wr(r1, p.memory.rb(p.r.pc + 1));
    p.r.pc += 2;
    p.clock.c += 12;
  },
  LDrrar: function (p: CPU, r1: string, r2: string, r3: string) {
    ops._LDav(p, Util.getRegAddr(p, r1, r2), p.r[r3]);
    p.clock.c += 8;
  },
  LDrrra: function (p: CPU, r1: string, r2: string, r3: string) {
    p.wr(r1, p.memory.rb(Util.getRegAddr(p, r2, r3)));
    p.clock.c += 8;
  },
  LDrn: function (p: CPU, r1: string) {
    p.wr(r1, p.memory.rb(p.r.pc++));
    p.clock.c += 8;
  },
  LDrr: function (p: CPU, r1: string, r2: string) {
    p.wr(r1, p.r[r2]);
    p.clock.c += 4;
  },
  LDrar: function (p: CPU, r1: string, r2: string) {
    p.memory.wb(p.r[r1] + 0xff00, p.r[r2]);
    p.clock.c += 8;
  },
  LDrra: function (p: CPU, r1: string, r2: string) {
    p.wr(r1, p.memory.rb(p.r[r2] + 0xff00));
    p.clock.c += 8;
  },
  LDspnn: function (p: CPU) {
    p.wr("sp", (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc));
    p.r.pc += 2;
    p.clock.c += 12;
  },
  LDsprr: function (p: CPU, r1: string, r2: string) {
    p.wr("sp", Util.getRegAddr(p, r1, r2));
    p.clock.c += 8;
  },
  LDnnar: function (p: CPU, r1: string) {
    let addr = (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc);
    p.memory.wb(addr, p.r[r1]);
    p.r.pc += 2;
    p.clock.c += 16;
  },
  LDrnna: function (p: CPU, r1: string) {
    let addr = (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc);
    p.wr(r1, p.memory.rb(addr));
    p.r.pc += 2;
    p.clock.c += 16;
  },
  LDrrspn: function (p: CPU, r1: string, r2: string) {
    let rel = p.memory.rb(p.r.pc++);
    rel = Util.getSignedValue(rel);
    let val = p.r.sp + rel;
    let c = (p.r.sp & 0xff) + (rel & 0xff) > 0xff;
    let h = (p.r.sp & 0xf) + (rel & 0xf) > 0xf;
    val &= 0xffff;
    let f = 0;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.wr("F", f);
    p.wr(r1, val >> 8);
    p.wr(r2, val & 0xff);
    p.clock.c += 12;
  },
  LDnnsp: function (p: CPU) {
    let addr = p.memory.rb(p.r.pc++) + (p.memory.rb(p.r.pc++) << 8);
    ops._LDav(p, addr, p.r.sp & 0xff);
    ops._LDav(p, addr + 1, p.r.sp >> 8);
    p.clock.c += 20;
  },
  LDrran: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    ops._LDav(p, addr, p.memory.rb(p.r.pc++));
    p.clock.c += 12;
  },
  _LDav: function (p: CPU, addr: number, val: number) {
    p.memory.wb(addr, val);
  },
  LDHnar: function (p: CPU, r1: string) {
    p.memory.wb(0xff00 + p.memory.rb(p.r.pc++), p.r[r1]);
    p.clock.c += 12;
  },
  LDHrna: function (p: CPU, r1: string) {
    p.wr(r1, p.memory.rb(0xff00 + p.memory.rb(p.r.pc++)));
    p.clock.c += 12;
  },
  INCrr: function (p: CPU, r1: string, r2: string) {
    p.wr(r2, (p.r[r2] + 1) & 0xff);
    if (p.r[r2] == 0) p.wr(r1, (p.r[r1] + 1) & 0xff);
    p.clock.c += 8;
  },
  INCrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let val = (p.memory.rb(addr) + 1) & 0xff;
    let z = val == 0;
    let h = (p.memory.rb(addr) & 0xf) + 1 > 0xf;
    p.memory.wb(addr, val);
    p.r.F &= 0x10;
    if (h) p.r.F |= 0x20;
    if (z) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  INCsp: function (p: CPU) {
    p.wr("sp", p.r.sp + 1);
    p.r.sp &= 0xffff;
    p.clock.c += 8;
  },
  INCr: function (p: CPU, r1: string) {
    let h = ((p.r[r1] & 0xf) + 1) & 0x10;
    p.wr(r1, (p.r[r1] + 1) & 0xff);
    let z = p.r[r1] == 0;
    p.r.F &= 0x10;
    if (h) p.r.F |= 0x20;
    if (z) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  DECrr: function (p: CPU, r1: string, r2: string) {
    p.wr(r2, (p.r[r2] - 1) & 0xff);
    if (p.r[r2] == 0xff) p.wr(r1, (p.r[r1] - 1) & 0xff);
    p.clock.c += 8;
  },
  DECsp: function (p: CPU) {
    p.wr("sp", p.r.sp - 1);
    p.r.sp &= 0xffff;
    p.clock.c += 8;
  },
  DECr: function (p: CPU, r1: string) {
    let h = (p.r[r1] & 0xf) < 1;
    p.wr(r1, (p.r[r1] - 1) & 0xff);
    let z = p.r[r1] == 0;
    p.r.F &= 0x10;
    p.r.F |= 0x40;
    if (h) p.r.F |= 0x20;
    if (z) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  DECrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let val = (p.memory.rb(addr) - 1) & 0xff;
    let z = val == 0;
    let h = (p.memory.rb(addr) & 0xf) < 1;
    p.memory.wb(addr, val);
    p.r.F &= 0x10;
    p.r.F |= 0x40;
    if (h) p.r.F |= 0x20;
    if (z) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  ADDrr: function (p: CPU, r1: string, r2: string) {
    let n = p.r[r2];
    ops._ADDrn(p, r1, n);
    p.clock.c += 4;
  },
  ADDrn: function (p: CPU, r1: string) {
    let n = p.memory.rb(p.r.pc++);
    ops._ADDrn(p, r1, n);
    p.clock.c += 8;
  },
  _ADDrn: function (p: CPU, r1: string, n: number) {
    let h = ((p.r[r1] & 0xf) + (n & 0xf)) & 0x10;
    p.wr(r1, p.r[r1] + n);
    let c = p.r[r1] & 0x100;
    p.r[r1] &= 0xff;
    let f = 0;
    if (p.r[r1] == 0) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.wr("F", f);
  },
  ADDrrrr: function (p: CPU, r1: string, r2: string, r3: string, r4: string) {
    ops._ADDrrn(p, r1, r2, (p.r[r3] << 8) + p.r[r4]);
    p.clock.c += 8;
  },
  ADDrrsp: function (p: CPU, r1: string, r2: string) {
    ops._ADDrrn(p, r1, r2, p.r.sp);
    p.clock.c += 8;
  },
  ADDspn: function (p: CPU) {
    let v = p.memory.rb(p.r.pc++);
    v = Util.getSignedValue(v);
    let c = (p.r.sp & 0xff) + (v & 0xff) > 0xff;
    let h = (p.r.sp & 0xf) + (v & 0xf) > 0xf;
    let f = 0;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.wr("F", f);
    p.wr("sp", (p.r.sp + v) & 0xffff);
    p.clock.c += 16;
  },
  _ADDrrn: function (p: CPU, r1: string, r2: string, n: number) {
    let v1 = (p.r[r1] << 8) + p.r[r2];
    let v2 = n;
    let res = v1 + v2;
    let c = res & 0x10000;
    let h = ((v1 & 0xfff) + (v2 & 0xfff)) & 0x1000;
    let z = p.r.F & 0x80;
    res &= 0xffff;
    p.r[r2] = res & 0xff;
    res = res >> 8;
    p.r[r1] = res & 0xff;
    let f = 0;
    if (z) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.r.F = f;
  },
  ADCrr: function (p: CPU, r1: string, r2: string) {
    let n = p.r[r2];
    ops._ADCrn(p, r1, n);
    p.clock.c += 4;
  },
  ADCrn: function (p: CPU, r1: string) {
    let n = p.memory.rb(p.r.pc++);
    ops._ADCrn(p, r1, n);
    p.clock.c += 8;
  },
  _ADCrn: function (p: CPU, r1: string, n: number) {
    let c = p.r.F & 0x10 ? 1 : 0;
    let h = ((p.r[r1] & 0xf) + (n & 0xf) + c) & 0x10;
    p.wr(r1, p.r[r1] + n + c);
    c = p.r[r1] & 0x100;
    p.r[r1] &= 0xff;
    let f = 0;
    if (p.r[r1] == 0) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.r.F = f;
  },
  ADCrrra: function (p: CPU, r1: string, r2: string, r3: string) {
    let n = p.memory.rb(Util.getRegAddr(p, r2, r3));
    ops._ADCrn(p, r1, n);
    p.clock.c += 8;
  },
  ADDrrra: function (p: CPU, r1: string, r2: string, r3: string) {
    let v = p.memory.rb(Util.getRegAddr(p, r2, r3));
    let h = ((p.r[r1] & 0xf) + (v & 0xf)) & 0x10;
    p.wr(r1, p.r[r1] + v);
    let c = p.r[r1] & 0x100;
    p.r[r1] &= 0xff;
    let f = 0;
    if (p.r[r1] == 0) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.wr("F", f);
    p.clock.c += 8;
  },
  SUBr: function (p: CPU, r1: string) {
    let n = p.r[r1];
    ops._SUBn(p, n);
    p.clock.c += 4;
  },
  SUBn: function (p: CPU) {
    let n = p.memory.rb(p.r.pc++);
    ops._SUBn(p, n);
    p.clock.c += 8;
  },
  SUBrra: function (p: CPU, r1: string, r2: string) {
    let n = p.memory.rb(Util.getRegAddr(p, r1, r2));
    ops._SUBn(p, n);
    p.clock.c += 8;
  },
  _SUBn: function (p: CPU, n: number) {
    let c = p.r.A < n;
    let h = (p.r.A & 0xf) < (n & 0xf);
    p.wr("A", p.r.A - n);
    p.r.A &= 0xff;
    let z = p.r.A == 0;
    let f = 0x40;
    if (z) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.wr("F", f);
  },
  SBCn: function (p: CPU) {
    let n = p.memory.rb(p.r.pc++);
    ops._SBCn(p, n);
    p.clock.c += 8;
  },
  SBCr: function (p: CPU, r1: string) {
    let n = p.r[r1];
    ops._SBCn(p, n);
    p.clock.c += 4;
  },
  SBCrra: function (p: CPU, r1: string, r2: string) {
    let v = p.memory.rb((p.r[r1] << 8) + p.r[r2]);
    ops._SBCn(p, v);
    p.clock.c += 8;
  },
  _SBCn: function (p: CPU, n: number) {
    let carry = p.r.F & 0x10 ? 1 : 0;
    let c = p.r.A < n + carry;
    let h = (p.r.A & 0xf) < (n & 0xf) + carry;
    p.wr("A", p.r.A - n - carry);
    p.r.A &= 0xff;
    let z = p.r.A == 0;
    let f = 0x40;
    if (z) f |= 0x80;
    if (h) f |= 0x20;
    if (c) f |= 0x10;
    p.r.F = f;
  },
  ORr: function (p: CPU, r1: string) {
    p.r.A |= p.r[r1];
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 4;
  },
  ORn: function (p: CPU) {
    p.r.A |= p.memory.rb(p.r.pc++);
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 8;
  },
  ORrra: function (p: CPU, r1: string, r2: string) {
    p.r.A |= p.memory.rb((p.r[r1] << 8) + p.r[r2]);
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 8;
  },
  ANDr: function (p: CPU, r1: string) {
    p.r.A &= p.r[r1];
    p.r.F = p.r.A == 0 ? 0xa0 : 0x20;
    p.clock.c += 4;
  },
  ANDn: function (p: CPU) {
    p.r.A &= p.memory.rb(p.r.pc++);
    p.r.F = p.r.A == 0 ? 0xa0 : 0x20;
    p.clock.c += 8;
  },
  ANDrra: function (p: CPU, r1: string, r2: string) {
    p.r.A &= p.memory.rb(Util.getRegAddr(p, r1, r2));
    p.r.F = p.r.A == 0 ? 0xa0 : 0x20;
    p.clock.c += 8;
  },
  XORr: function (p: CPU, r1: string) {
    p.r.A ^= p.r[r1];
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 4;
  },
  XORn: function (p: CPU) {
    p.r.A ^= p.memory.rb(p.r.pc++);
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 8;
  },
  XORrra: function (p: CPU, r1: string, r2: string) {
    p.r.A ^= p.memory.rb((p.r[r1] << 8) + p.r[r2]);
    p.r.F = p.r.A == 0 ? 0x80 : 0x00;
    p.clock.c += 8;
  },
  CPr: function (p: CPU, r1: string) {
    let n = p.r[r1];
    ops._CPn(p, n);
    p.clock.c += 4;
  },
  CPn: function (p: CPU) {
    let n = p.memory.rb(p.r.pc++);
    ops._CPn(p, n);
    p.clock.c += 8;
  },
  CPrra: function (p: CPU, r1: string, r2: string) {
    let n = p.memory.rb(Util.getRegAddr(p, r1, r2));
    ops._CPn(p, n);
    p.clock.c += 8;
  },
  _CPn: function (p: CPU, n: number) {
    let c = p.r.A < n;
    let z = p.r.A == n;
    let h = (p.r.A & 0xf) < (n & 0xf);
    let f = 0x40;
    if (z) f += 0x80;
    if (h) f += 0x20;
    if (c) f += 0x10;
    p.r.F = f;
  },
  RRCr: function (p: CPU, r1: string) {
    p.r.F = 0;
    let out = p.r[r1] & 0x01;
    if (out) p.r.F |= 0x10;
    p.r[r1] = (p.r[r1] >> 1) | (out * 0x80);
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  RRCrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    p.r.F = 0;
    let out = p.memory.rb(addr) & 0x01;
    if (out) p.r.F |= 0x10;
    p.memory.wb(addr, (p.memory.rb(addr) >> 1) | (out * 0x80));
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  RLCr: function (p: CPU, r1: string) {
    p.r.F = 0;
    let out = p.r[r1] & 0x80 ? 1 : 0;
    if (out) p.r.F |= 0x10;
    p.r[r1] = ((p.r[r1] << 1) + out) & 0xff;
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  RLCrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    p.r.F = 0;
    let out = p.memory.rb(addr) & 0x80 ? 1 : 0;
    if (out) p.r.F |= 0x10;
    p.memory.wb(addr, ((p.memory.rb(addr) << 1) + out) & 0xff);
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  RLr: function (p: CPU, r1: string) {
    let c = p.r.F & 0x10 ? 1 : 0;
    p.r.F = 0;
    let out = p.r[r1] & 0x80;
    out ? (p.r.F |= 0x10) : (p.r.F &= 0xef);
    p.r[r1] = ((p.r[r1] << 1) + c) & 0xff;
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  RLrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let c = p.r.F & 0x10 ? 1 : 0;
    p.r.F = 0;
    let out = p.memory.rb(addr) & 0x80;
    out ? (p.r.F |= 0x10) : (p.r.F &= 0xef);
    p.memory.wb(addr, ((p.memory.rb(addr) << 1) + c) & 0xff);
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  RRr: function (p: CPU, r1: string) {
    let c = p.r.F & 0x10 ? 1 : 0;
    p.r.F = 0;
    let out = p.r[r1] & 0x01;
    out ? (p.r.F |= 0x10) : (p.r.F &= 0xef);
    p.r[r1] = (p.r[r1] >> 1) | (c * 0x80);
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  RRrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let c = p.r.F & 0x10 ? 1 : 0;
    p.r.F = 0;
    let out = p.memory.rb(addr) & 0x01;
    out ? (p.r.F |= 0x10) : (p.r.F &= 0xef);
    p.memory.wb(addr, (p.memory.rb(addr) >> 1) | (c * 0x80));
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  SRAr: function (p: CPU, r1: string) {
    p.r.F = 0;
    if (p.r[r1] & 0x01) p.r.F |= 0x10;
    let msb = p.r[r1] & 0x80;
    p.r[r1] = (p.r[r1] >> 1) | msb;
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  SRArra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    p.r.F = 0;
    if (p.memory.rb(addr) & 0x01) p.r.F |= 0x10;
    let msb = p.memory.rb(addr) & 0x80;
    p.memory.wb(addr, (p.memory.rb(addr) >> 1) | msb);
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  SLAr: function (p: CPU, r1: string) {
    p.r.F = 0;
    if (p.r[r1] & 0x80) p.r.F |= 0x10;
    p.r[r1] = (p.r[r1] << 1) & 0xff;
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  SLArra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    p.r.F = 0;
    if (p.memory.rb(addr) & 0x80) p.r.F |= 0x10;
    p.memory.wb(addr, (p.memory.rb(addr) << 1) & 0xff);
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  SRLr: function (p: CPU, r1: string) {
    p.r.F = 0;
    if (p.r[r1] & 0x01) p.r.F |= 0x10;
    p.r[r1] = p.r[r1] >> 1;
    if (p.r[r1] == 0) p.r.F |= 0x80;
    p.clock.c += 4;
  },
  SRLrra: function (p: CPU, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    p.r.F = 0;
    if (p.memory.rb(addr) & 0x01) p.r.F |= 0x10;
    p.memory.wb(addr, p.memory.rb(addr) >> 1);
    if (p.memory.rb(addr) == 0) p.r.F |= 0x80;
    p.clock.c += 12;
  },
  BITir: function (p: CPU, i: number, r1: string) {
    let mask = 1 << i;
    let z = p.r[r1] & mask ? 0 : 1;
    let f = p.r.F & 0x10;
    f |= 0x20;
    if (z) f |= 0x80;
    p.r.F = f;
    p.clock.c += 4;
  },
  BITirra: function (p: CPU, i: number, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let mask = 1 << i;
    let z = p.memory.rb(addr) & mask ? 0 : 1;
    let f = p.r.F & 0x10;
    f |= 0x20;
    if (z) f |= 0x80;
    p.r.F = f;
    p.clock.c += 8;
  },
  SETir: function (p: CPU, i: number, r1: string) {
    let mask = 1 << i;
    p.r[r1] |= mask;
    p.clock.c += 4;
  },
  SETirra: function (p: CPU, i: number, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let mask = 1 << i;
    p.memory.wb(addr, p.memory.rb(addr) | mask);
    p.clock.c += 12;
  },
  RESir: function (p: CPU, i: number, r1: string) {
    let mask = 0xff - (1 << i);
    p.r[r1] &= mask;
    p.clock.c += 4;
  },
  RESirra: function (p: CPU, i: number, r1: string, r2: string) {
    let addr = Util.getRegAddr(p, r1, r2);
    let mask = 0xff - (1 << i);
    p.memory.wb(addr, p.memory.rb(addr) & mask);
    p.clock.c += 12;
  },
  SWAPr: function (p: CPU, r1: string) {
    p.r[r1] = ops._SWAPn(p, p.r[r1]);
    p.clock.c += 4;
  },
  SWAPrra: function (p: CPU, r1: string, r2: string) {
    let addr = (p.r[r1] << 8) + p.r[r2];
    p.memory.wb(addr, ops._SWAPn(p, p.memory.rb(addr)));
    p.clock.c += 12;
  },
  _SWAPn: function (p: CPU, n: number) {
    p.r.F = n == 0 ? 0x80 : 0;
    return ((n & 0xf0) >> 4) | ((n & 0x0f) << 4);
  },
  JPnn: function (p: CPU) {
    p.wr("pc", (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc));
    p.clock.c += 16;
  },
  JRccn: function (p: CPU, cc: string) {
    if (Util.testFlag(p, cc)) {
      let v = p.memory.rb(p.r.pc++);
      v = Util.getSignedValue(v);
      p.r.pc += v;
      p.clock.c += 4;
    } else {
      p.r.pc++;
    }
    p.clock.c += 8;
  },
  JPccnn: function (p: CPU, cc: string) {
    if (Util.testFlag(p, cc)) {
      p.wr("pc", (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc));
      p.clock.c += 4;
    } else {
      p.r.pc += 2;
    }
    p.clock.c += 12;
  },
  JPrr: function (p: CPU, r1: string, r2: string) {
    p.r.pc = (p.r[r1] << 8) + p.r[r2];
    p.clock.c += 4;
  },
  JRn: function (p: CPU) {
    let v = p.memory.rb(p.r.pc++);
    v = Util.getSignedValue(v);
    p.r.pc += v;
    p.clock.c += 12;
  },
  PUSHrr: function (p: CPU, r1: string, r2: string) {
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, p.r[r1]);
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, p.r[r2]);
    p.clock.c += 16;
  },
  POPrr: function (p: CPU, r1: string, r2: string) {
    p.wr(r2, p.memory.rb(p.r.sp));
    p.wr("sp", p.r.sp + 1);
    p.wr(r1, p.memory.rb(p.r.sp));
    p.wr("sp", p.r.sp + 1);
    p.clock.c += 12;
  },
  RSTn: function (p: CPU, n: number) {
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, p.r.pc >> 8);
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, p.r.pc & 0xff);
    p.r.pc = n;
    p.clock.c += 16;
  },
  RET: function (p: CPU) {
    p.r.pc = p.memory.rb(p.r.sp);
    p.wr("sp", p.r.sp + 1);
    p.r.pc += p.memory.rb(p.r.sp) << 8;
    p.wr("sp", p.r.sp + 1);
    p.clock.c += 16;
  },
  RETcc: function (p: CPU, cc: string) {
    if (Util.testFlag(p, cc)) {
      p.r.pc = p.memory.rb(p.r.sp);
      p.wr("sp", p.r.sp + 1);
      p.r.pc += p.memory.rb(p.r.sp) << 8;
      p.wr("sp", p.r.sp + 1);
      p.clock.c += 12;
    }
    p.clock.c += 8;
  },
  CALLnn: function (p: CPU) {
    ops._CALLnn(p);
    p.clock.c += 24;
  },
  CALLccnn: function (p: CPU, cc: string) {
    if (Util.testFlag(p, cc)) {
      ops._CALLnn(p);
      p.clock.c += 12;
    } else {
      p.r.pc += 2;
    }
    p.clock.c += 12;
  },
  _CALLnn: function (p: CPU) {
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, ((p.r.pc + 2) & 0xff00) >> 8);
    p.wr("sp", p.r.sp - 1);
    p.memory.wb(p.r.sp, (p.r.pc + 2) & 0x00ff);
    let j = p.memory.rb(p.r.pc) + (p.memory.rb(p.r.pc + 1) << 8);
    p.r.pc = j;
  },
  CPL: function (p: CPU) {
    p.wr("A", ~p.r.A & 0xff);
    (p.r.F |= 0x60), (p.clock.c += 4);
  },
  CCF: function (p: CPU) {
    p.r.F &= 0x9f;
    p.r.F & 0x10 ? (p.r.F &= 0xe0) : (p.r.F |= 0x10);
    p.clock.c += 4;
  },
  SCF: function (p: CPU) {
    p.r.F &= 0x9f;
    p.r.F |= 0x10;
    p.clock.c += 4;
  },
  DAA: function (p: CPU) {
    let sub = p.r.F & 0x40 ? 1 : 0;
    let h = p.r.F & 0x20 ? 1 : 0;
    let c = p.r.F & 0x10 ? 1 : 0;
    if (sub) {
      if (h) {
        p.r.A = (p.r.A - 0x6) & 0xff;
      }
      if (c) {
        p.r.A -= 0x60;
      }
    } else {
      if ((p.r.A & 0xf) > 9 || h) {
        p.r.A += 0x6;
      }
      if (p.r.A > 0x9f || c) {
        p.r.A += 0x60;
      }
    }
    if (p.r.A & 0x100) c = 1;

    p.r.A &= 0xff;
    p.r.F &= 0x40;
    if (p.r.A == 0) p.r.F |= 0x80;
    if (c) p.r.F |= 0x10;
    p.clock.c += 4;
  },
  HALT: function (p: CPU) {
    p.halt();
    p.clock.c += 4;
  },
  DI: function (p: CPU) {
    p.disableInterrupts();
    p.clock.c += 4;
  },
  EI: function (p: CPU) {
    p.enableInterrupts();
    p.clock.c += 4;
  },
  RETI: function (p: CPU) {
    p.enableInterrupts();
    ops.RET(p);
  },
  CB: function (p: CPU) {
    let opcode = p.memory.rb(p.r.pc++);
    opcodeCbmap[opcode](p);
    p.clock.c += 4;
  },
};

export { ops as cpuOps };
