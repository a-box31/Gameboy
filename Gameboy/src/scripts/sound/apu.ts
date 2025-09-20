import Channel1 from "./channel1";
import Channel3 from "./channel3";
import Channel4 from "./channel4";
import Memory from "../memory";

// Audio Processing unit
// Listens the write accesses to the audio-reserved memory addresses
// and dispatches the data to the sound channels
class APU {
  memory: Memory;
  enabled = false;
  channel1;
  channel2;
  channel3;
  channel4;

  constructor(memory: Memory) {
    this.memory = memory;
    this.enabled = false;

    const audioContext = new AudioContext();

    this.channel1 = new Channel1(this, 1, audioContext);
    this.channel2 = new Channel1(this, 2, audioContext);
    this.channel3 = new Channel3(this, 3, audioContext);
    this.channel4 = new Channel4(this, 4, audioContext);
  }

  connect() {
    this.channel1.enable();
    this.channel2.enable();
    this.channel3.enable();
  }

  disconnect() {
    this.channel1.disable();
    this.channel2.disable();
    this.channel3.disable();
  }

  // Updates the states of each channel given the elapsed time
  // (in instructions) since last update
  update(clockElapsed: number): void {
    if (this.enabled == false) return;

    this.channel1.update(clockElapsed);
    this.channel2.update(clockElapsed);
    this.channel3.update(clockElapsed);
    this.channel4.update(clockElapsed);
  }

  setSoundFlag(channel: number, value: number): void {
    const mask: number = 0xff - (1 << (channel - 1));
    value = value << (channel - 1);
    let byteValue: number = this.memory.rb(APU.registers.NR52);
    byteValue &= mask;
    byteValue |= value;
    this.memory[APU.registers.NR52] = byteValue;
  }

  // Manage writes to audio registers
  // Will update the channels depending on the address
  manageWrite(addr: number, value: number) {
    if (this.enabled == false && addr < APU.registers.NR52) {
      return;
    }
    this.memory[addr] = value;

    switch (addr) {
      // Channel 1 addresses
      case 0xff10:
        this.channel1.clockSweep = 0;
        this.channel1.sweepTime = (value & 0x70) >> 4;
        this.channel1.sweepSign = value & 0x08 ? -1 : 1;
        this.channel1.sweepShifts = value & 0x07;
        this.channel1.sweepCount = this.channel1.sweepShifts;
        break;
      case 0xff11:
        // todo : bits 6-7
        this.channel1.setLength(value & 0x3f);
        break;
      case 0xff12: {
        this.channel1.envelopeSign = value & 0x08 ? 1 : -1;
        const envelopeVolume = (value & 0xf0) >> 4;
        this.channel1.setEnvelopeVolume(envelopeVolume);
        this.channel1.envelopeStep = value & 0x07;
        this.channel1.updateDAC(value);
        break;
      }
      case 0xff13: {
        let frequency = this.channel1.getFrequency();
        frequency &= 0xf00;
        frequency |= value;
        this.channel1.setFrequency(frequency);
        break;
      }
      case 0xff14: {
        let frequency = this.channel1.getFrequency();
        frequency &= 0xff;
        frequency |= (value & 7) << 8;
        this.channel1.setFrequency(frequency);
        this.channel1.lengthCheck = value & 0x40 ? true : false;
        if (value & 0x80) this.channel1.play();
        break;
      }

      // Channel 2 addresses
      case 0xff16:
        // todo : bits 6-7
        this.channel2.setLength(value & 0x3f);
        break;
      case 0xff17: {
        this.channel2.envelopeSign = value & 0x08 ? 1 : -1;
        const envelopeVolume = (value & 0xf0) >> 4;
        this.channel2.setEnvelopeVolume(envelopeVolume);
        this.channel2.envelopeStep = value & 0x07;
        this.channel2.updateDAC(value);
        break;
      }

      case 0xff18: {
        let frequency = this.channel2.getFrequency();
        frequency &= 0xf00;
        frequency |= value;
        this.channel2.setFrequency(frequency);
        break;
      }

      case 0xff19: {
        let frequency = this.channel2.getFrequency();
        frequency &= 0xff;
        frequency |= (value & 7) << 8;
        this.channel2.setFrequency(frequency);
        this.channel2.lengthCheck = value & 0x40 ? true : false;
        if (value & 0x80) {
          this.channel2.play();
        }
        break;
      }

      // Channel 3 addresses
      case 0xff1a:
        // todo
        this.channel3.updateDAC(value);
        break;
      case 0xff1b:
        this.channel3.setLength(value);
        break;
      case 0xff1c:
        // todo
        break;
      case 0xff1d: {
        let frequency = this.channel3.getFrequency();
        frequency &= 0xf00;
        frequency |= value;
        this.channel3.setFrequency(frequency);
        break;
      }
      case 0xff1e: {
        let frequency = this.channel3.getFrequency();
        frequency &= 0xff;
        frequency |= (value & 7) << 8;
        this.channel3.setFrequency(frequency);
        this.channel3.lengthCheck = value & 0x40 ? true : false;
        if (value & 0x80) {
          this.channel3.play();
        }
        break;
      }

      // Channel 4 addresses
      case 0xff20:
        this.channel4.setLength(value & 0x3f);
        break;
      case 0xff21:
        // todo
        this.channel4.updateDAC(value);
        break;
      case 0xff22:
        // todo
        break;
      case 0xff23:
        this.channel4.lengthCheck = value & 0x40 ? true : false;
        if (value & 0x80) {
          this.channel4.play();
        }
        break;

      // channel 3 wave bytes
      case 0xff30:
      case 0xff31:
      case 0xff32:
      case 0xff33:
      case 0xff34:
      case 0xff35:
      case 0xff36:
      case 0xff37:
      case 0xff38:
      case 0xff39:
      case 0xff3a:
      case 0xff3b:
      case 0xff3c:
      case 0xff3d:
      case 0xff3e:
      case 0xff3f: {
        const index = addr - 0xff30;
        this.channel3.setWaveBufferByte(index, value);
        break;
      }

      // general audio switch
      case 0xff26:
        value &= 0xf0;
        this.memory[addr] = value;
        this.enabled = (value & 0x80) == 0 ? false : true;
        if (!this.enabled) {
          for (let i = 0xff10; i < 0xff27; i++) this.memory[i] = 0;
          // todo stop sound
        }
        break;
    }
  }

  static registers = {
    NR10: 0xff10,
    NR11: 0xff11,
    NR12: 0xff12,
    NR13: 0xff13,
    NR14: 0xff14,

    NR21: 0xff16,
    NR22: 0xff17,
    NR23: 0xff18,
    NR24: 0xff19,

    NR30: 0xff1a,
    NR31: 0xff1b,
    NR32: 0xff1c,
    NR33: 0xff1d,
    NR34: 0xff1e,

    NR41: 0xff20,
    NR42: 0xff21,
    NR43: 0xff22,
    NR44: 0xff23,

    NR50: 0xff24,
    NR51: 0xff25,
    NR52: 0xff26,
  };
}

export default APU;
