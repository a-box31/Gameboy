/**
 * GameBoy Audio Processing Unit (APU)
 * Implements 4-channel audio system using Web Audio API
 */
class APU {
    constructor(mmu) {
        this.mmu = mmu;
        
        // Web Audio API setup
        this.audioContext = null;
        this.masterGain = null;
        this.enabled = false;
        
        // Channels
        this.channels = {
            square1: new SquareWaveChannel(1),
            square2: new SquareWaveChannel(2),
            wave: new WaveChannel(),
            noise: new NoiseChannel()
        };
        
        // Frame sequencer for envelope and sweep
        this.frameSequencerCycles = 0;
        this.frameSequencerStep = 0;
        
        // Master control
        this.masterVolume = 0.5;
        this.muted = false;
        
        this.initAudio();
    }
    
    async initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Initialize channels
            for (let channel of Object.values(this.channels)) {
                await channel.init(this.audioContext, this.masterGain);
            }
            
            this.enabled = true;
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    step(cycles) {
        if (!this.enabled) return;
        
        // Update frame sequencer (runs at 512 Hz)
        this.frameSequencerCycles += cycles;
        const frameSequencerPeriod = 8192; // CPU cycles per frame sequencer step
        
        while (this.frameSequencerCycles >= frameSequencerPeriod) {
            this.frameSequencerCycles -= frameSequencerPeriod;
            this.stepFrameSequencer();
        }
        
        // Update channels
        for (let channel of Object.values(this.channels)) {
            channel.step(cycles);
        }
        
        this.updateMixing();
    }
    
    stepFrameSequencer() {
        // Length counter (steps 0, 2, 4, 6)
        if (this.frameSequencerStep % 2 === 0) {
            for (let channel of Object.values(this.channels)) {
                channel.stepLength();
            }
        }
        
        // Volume envelope (steps 7, 15, ...)
        if (this.frameSequencerStep === 7) {
            for (let channel of Object.values(this.channels)) {
                channel.stepEnvelope();
            }
        }
        
        // Sweep (steps 2, 6)
        if (this.frameSequencerStep === 2 || this.frameSequencerStep === 6) {
            this.channels.square1.stepSweep();
        }
        
        this.frameSequencerStep = (this.frameSequencerStep + 1) & 7;
    }
    
    updateMixing() {
        const nr50 = this.mmu.io[0x24]; // Master volume and VIN
        const nr51 = this.mmu.io[0x25]; // Sound panning
        
        // Extract volume levels (0-7)
        const leftVolume = (nr50 >> 4) & 7;
        const rightVolume = nr50 & 7;
        
        // Update channel outputs based on panning
        this.channels.square1.setPanning(
            (nr51 & 0x10) !== 0, // Left
            (nr51 & 0x01) !== 0  // Right
        );
        
        this.channels.square2.setPanning(
            (nr51 & 0x20) !== 0, // Left
            (nr51 & 0x02) !== 0  // Right
        );
        
        this.channels.wave.setPanning(
            (nr51 & 0x40) !== 0, // Left
            (nr51 & 0x04) !== 0  // Right
        );
        
        this.channels.noise.setPanning(
            (nr51 & 0x80) !== 0, // Left
            (nr51 & 0x08) !== 0  // Right
        );
    }
    
    writeRegister(address, value) {
        const channel = Math.floor((address - 0x10) / 5);
        const register = (address - 0x10) % 5;
        
        switch (address) {
            // Channel 1 (Square wave with sweep)
            case 0x10: this.channels.square1.writeSweep(value); break;
            case 0x11: this.channels.square1.writeLengthDuty(value); break;
            case 0x12: this.channels.square1.writeEnvelope(value); break;
            case 0x13: this.channels.square1.writeFrequencyLow(value); break;
            case 0x14: this.channels.square1.writeFrequencyHigh(value); break;
            
            // Channel 2 (Square wave)
            case 0x16: this.channels.square2.writeLengthDuty(value); break;
            case 0x17: this.channels.square2.writeEnvelope(value); break;
            case 0x18: this.channels.square2.writeFrequencyLow(value); break;
            case 0x19: this.channels.square2.writeFrequencyHigh(value); break;
            
            // Channel 3 (Wave)
            case 0x1A: this.channels.wave.writePower(value); break;
            case 0x1B: this.channels.wave.writeLength(value); break;
            case 0x1C: this.channels.wave.writeVolume(value); break;
            case 0x1D: this.channels.wave.writeFrequencyLow(value); break;
            case 0x1E: this.channels.wave.writeFrequencyHigh(value); break;
            
            // Channel 4 (Noise)
            case 0x20: this.channels.noise.writeLength(value); break;
            case 0x21: this.channels.noise.writeEnvelope(value); break;
            case 0x22: this.channels.noise.writePolynomial(value); break;
            case 0x23: this.channels.noise.writeControl(value); break;
            
            // Master control
            case 0x24: // NR50 - Master volume
                break;
            case 0x25: // NR51 - Sound panning
                break;
            case 0x26: // NR52 - Master sound enable
                this.setMasterEnable((value & 0x80) !== 0);
                break;
            
            // Wave pattern RAM (0xFF30-0xFF3F)
            default:
                if (address >= 0x30 && address <= 0x3F) {
                    this.channels.wave.writeWavePattern(address - 0x30, value);
                }
                break;
        }
    }
    
    readRegister(address) {
        // Most audio registers are write-only, return 0xFF
        switch (address) {
            case 0x26: // NR52 - Master sound enable + channel status
                let status = this.muted ? 0x00 : 0x80;
                if (this.channels.square1.enabled) status |= 0x01;
                if (this.channels.square2.enabled) status |= 0x02;
                if (this.channels.wave.enabled) status |= 0x04;
                if (this.channels.noise.enabled) status |= 0x08;
                return status;
            
            default:
                if (address >= 0x30 && address <= 0x3F) {
                    return this.channels.wave.readWavePattern(address - 0x30);
                }
                return 0xFF;
        }
    }
    
    setMasterEnable(enabled) {
        if (!enabled) {
            // Disable all channels
            for (let channel of Object.values(this.channels)) {
                channel.disable();
            }
            
            // Clear most audio registers
            for (let i = 0x10; i <= 0x25; i++) {
                this.mmu.io[i] = 0;
            }
        }
        
        this.muted = !enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = enabled ? this.masterVolume : 0;
        }
    }
    
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    mute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }
    }
    
    reset() {
        this.frameSequencerCycles = 0;
        this.frameSequencerStep = 0;
        
        for (let channel of Object.values(this.channels)) {
            channel.reset();
        }
        
        this.setMasterEnable(true);
    }
}

/**
 * Square Wave Channel (Channels 1 & 2)
 */
class SquareWaveChannel {
    constructor(channelNumber) {
        this.channelNumber = channelNumber;
        this.enabled = false;
        
        // Registers
        this.sweepPeriod = 0;
        this.sweepDirection = 0;
        this.sweepShift = 0;
        this.lengthCounter = 0;
        this.dutyCycle = 0;
        this.envelopePeriod = 0;
        this.envelopeDirection = 0;
        this.envelopeVolume = 0;
        this.frequency = 0;
        this.trigger = false;
        this.lengthEnable = false;
        
        // Internal state
        this.sweepCounter = 0;
        this.envelopeCounter = 0;
        this.currentVolume = 0;
        this.sweepEnabled = false;
        
        // Web Audio nodes
        this.oscillator = null;
        this.gainNode = null;
        this.leftGain = null;
        this.rightGain = null;
    }
    
    async init(audioContext, destination) {
        this.audioContext = audioContext;
        
        // Create audio nodes
        this.oscillator = audioContext.createOscillator();
        this.gainNode = audioContext.createGain();
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        
        // Set up square wave
        this.oscillator.type = 'square';
        this.oscillator.frequency.value = 440;
        this.gainNode.gain.value = 0;
        
        // Connect nodes
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.leftGain);
        this.gainNode.connect(this.rightGain);
        this.leftGain.connect(destination);
        this.rightGain.connect(destination);
        
        this.oscillator.start();
    }
    
    writeSweep(value) {
        if (this.channelNumber !== 1) return; // Only channel 1 has sweep
        
        this.sweepPeriod = (value >> 4) & 7;
        this.sweepDirection = (value >> 3) & 1;
        this.sweepShift = value & 7;
    }
    
    writeLengthDuty(value) {
        this.dutyCycle = (value >> 6) & 3;
        this.lengthCounter = 64 - (value & 0x3F);
    }
    
    writeEnvelope(value) {
        this.envelopeVolume = (value >> 4) & 0xF;
        this.envelopeDirection = (value >> 3) & 1;
        this.envelopePeriod = value & 7;
        this.currentVolume = this.envelopeVolume;
    }
    
    writeFrequencyLow(value) {
        this.frequency = (this.frequency & 0x700) | value;
        this.updateFrequency();
    }
    
    writeFrequencyHigh(value) {
        this.frequency = (this.frequency & 0xFF) | ((value & 7) << 8);
        this.lengthEnable = (value & 0x40) !== 0;
        
        if (value & 0x80) { // Trigger
            this.trigger = true;
            this.restart();
        }
        
        this.updateFrequency();
    }
    
    restart() {
        this.enabled = true;
        
        // Reset length counter if it's 0
        if (this.lengthCounter === 0) {
            this.lengthCounter = 64;
        }
        
        // Reset envelope
        this.envelopeCounter = this.envelopePeriod;
        this.currentVolume = this.envelopeVolume;
        
        // Reset sweep (channel 1 only)
        if (this.channelNumber === 1) {
            this.sweepCounter = this.sweepPeriod;
            this.sweepEnabled = this.sweepPeriod !== 0 || this.sweepShift !== 0;
        }
        
        this.updateOutput();
    }
    
    updateFrequency() {
        if (this.oscillator) {
            const gbFreq = 131072 / (2048 - this.frequency);
            this.oscillator.frequency.value = gbFreq;
        }
    }
    
    updateOutput() {
        if (this.gainNode) {
            const volume = this.enabled ? (this.currentVolume / 15) * 0.1 : 0;
            this.gainNode.gain.value = volume;
        }
    }
    
    stepLength() {
        if (this.lengthEnable && this.lengthCounter > 0) {
            this.lengthCounter--;
            if (this.lengthCounter === 0) {
                this.enabled = false;
                this.updateOutput();
            }
        }
    }
    
    stepEnvelope() {
        if (this.envelopePeriod !== 0) {
            this.envelopeCounter--;
            if (this.envelopeCounter <= 0) {
                this.envelopeCounter = this.envelopePeriod;
                
                if (this.envelopeDirection === 1 && this.currentVolume < 15) {
                    this.currentVolume++;
                } else if (this.envelopeDirection === 0 && this.currentVolume > 0) {
                    this.currentVolume--;
                }
                
                this.updateOutput();
            }
        }
    }
    
    stepSweep() {
        if (this.channelNumber !== 1 || !this.sweepEnabled) return;
        
        this.sweepCounter--;
        if (this.sweepCounter <= 0) {
            this.sweepCounter = this.sweepPeriod;
            
            if (this.sweepPeriod !== 0) {
                const delta = this.frequency >> this.sweepShift;
                
                if (this.sweepDirection === 0) {
                    this.frequency += delta;
                } else {
                    this.frequency -= delta;
                }
                
                if (this.frequency > 2047) {
                    this.enabled = false;
                }
                
                this.updateFrequency();
                this.updateOutput();
            }
        }
    }
    
    setPanning(left, right) {
        if (this.leftGain) this.leftGain.gain.value = left ? 1 : 0;
        if (this.rightGain) this.rightGain.gain.value = right ? 1 : 0;
    }
    
    step(cycles) {
        // Channel-specific step logic if needed
    }
    
    disable() {
        this.enabled = false;
        this.updateOutput();
    }
    
    reset() {
        this.enabled = false;
        this.lengthCounter = 0;
        this.currentVolume = 0;
        this.frequency = 0;
        this.updateOutput();
    }
}

/**
 * Wave Channel (Channel 3)
 */
class WaveChannel {
    constructor() {
        this.enabled = false;
        this.powerOn = false;
        this.lengthCounter = 0;
        this.outputLevel = 0;
        this.frequency = 0;
        this.lengthEnable = false;
        this.wavePattern = new Uint8Array(32); // 32 4-bit samples
        
        // Web Audio nodes
        this.oscillator = null;
        this.gainNode = null;
        this.leftGain = null;
        this.rightGain = null;
        this.periodicWave = null;
    }
    
    async init(audioContext, destination) {
        this.audioContext = audioContext;
        
        // Create audio nodes
        this.oscillator = audioContext.createOscillator();
        this.gainNode = audioContext.createGain();
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        
        this.gainNode.gain.value = 0;
        
        // Connect nodes
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.leftGain);
        this.gainNode.connect(this.rightGain);
        this.leftGain.connect(destination);
        this.rightGain.connect(destination);
        
        this.createCustomWave();
        this.oscillator.start();
    }
    
    createCustomWave() {
        // Create custom wave from pattern
        const real = new Float32Array(32);
        const imag = new Float32Array(32);
        
        // Convert 4-bit samples to wave data
        for (let i = 0; i < 32; i++) {
            real[i] = (this.wavePattern[i] - 7.5) / 7.5; // Normalize to -1 to 1
        }
        
        this.periodicWave = this.audioContext.createPeriodicWave(real, imag);
        if (this.oscillator) {
            this.oscillator.setPeriodicWave(this.periodicWave);
        }
    }
    
    writePower(value) {
        this.powerOn = (value & 0x80) !== 0;
        if (!this.powerOn) {
            this.enabled = false;
            this.updateOutput();
        }
    }
    
    writeLength(value) {
        this.lengthCounter = 256 - value;
    }
    
    writeVolume(value) {
        this.outputLevel = (value >> 5) & 3;
        this.updateOutput();
    }
    
    writeFrequencyLow(value) {
        this.frequency = (this.frequency & 0x700) | value;
        this.updateFrequency();
    }
    
    writeFrequencyHigh(value) {
        this.frequency = (this.frequency & 0xFF) | ((value & 7) << 8);
        this.lengthEnable = (value & 0x40) !== 0;
        
        if (value & 0x80) { // Trigger
            this.restart();
        }
        
        this.updateFrequency();
    }
    
    writeWavePattern(offset, value) {
        // Each byte contains two 4-bit samples
        this.wavePattern[offset * 2] = (value >> 4) & 0xF;
        this.wavePattern[offset * 2 + 1] = value & 0xF;
        this.createCustomWave();
    }
    
    readWavePattern(offset) {
        return (this.wavePattern[offset * 2] << 4) | this.wavePattern[offset * 2 + 1];
    }
    
    restart() {
        if (!this.powerOn) return;
        
        this.enabled = true;
        
        if (this.lengthCounter === 0) {
            this.lengthCounter = 256;
        }
        
        this.updateOutput();
    }
    
    updateFrequency() {
        if (this.oscillator) {
            const gbFreq = 65536 / (2048 - this.frequency);
            this.oscillator.frequency.value = gbFreq;
        }
    }
    
    updateOutput() {
        if (this.gainNode) {
            let volume = 0;
            if (this.enabled && this.powerOn && this.outputLevel > 0) {
                volume = 0.1 / this.outputLevel; // Volume levels: 1/1, 1/2, 1/4, mute
            }
            this.gainNode.gain.value = volume;
        }
    }
    
    stepLength() {
        if (this.lengthEnable && this.lengthCounter > 0) {
            this.lengthCounter--;
            if (this.lengthCounter === 0) {
                this.enabled = false;
                this.updateOutput();
            }
        }
    }
    
    setPanning(left, right) {
        if (this.leftGain) this.leftGain.gain.value = left ? 1 : 0;
        if (this.rightGain) this.rightGain.gain.value = right ? 1 : 0;
    }
    
    step(cycles) {
        // Wave channel step logic if needed
    }
    
    stepEnvelope() {
        // Wave channel doesn't have envelope
    }
    
    disable() {
        this.enabled = false;
        this.updateOutput();
    }
    
    reset() {
        this.enabled = false;
        this.powerOn = false;
        this.lengthCounter = 0;
        this.frequency = 0;
        this.wavePattern.fill(0);
        this.updateOutput();
    }
}

/**
 * Noise Channel (Channel 4)
 */
class NoiseChannel {
    constructor() {
        this.enabled = false;
        this.lengthCounter = 0;
        this.envelopePeriod = 0;
        this.envelopeDirection = 0;
        this.envelopeVolume = 0;
        this.shiftRegister = 0x7FFF;
        this.clockShift = 0;
        this.widthMode = 0;
        this.divisorCode = 0;
        this.lengthEnable = false;
        
        // Internal state
        this.envelopeCounter = 0;
        this.currentVolume = 0;
        
        // Web Audio nodes
        this.bufferSource = null;
        this.gainNode = null;
        this.leftGain = null;
        this.rightGain = null;
        this.noiseBuffer = null;
    }
    
    async init(audioContext, destination) {
        this.audioContext = audioContext;
        
        // Create noise buffer
        this.createNoiseBuffer();
        
        // Create audio nodes
        this.gainNode = audioContext.createGain();
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        
        this.gainNode.gain.value = 0;
        
        // Connect nodes
        this.gainNode.connect(this.leftGain);
        this.gainNode.connect(this.rightGain);
        this.leftGain.connect(destination);
        this.rightGain.connect(destination);
    }
    
    createNoiseBuffer() {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate; // 1 second of noise
        
        this.noiseBuffer = this.audioContext.createBuffer(1, length, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        
        // Generate pseudo-random noise
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
    
    startNoise() {
        if (this.bufferSource) {
            this.bufferSource.stop();
        }
        
        this.bufferSource = this.audioContext.createBufferSource();
        this.bufferSource.buffer = this.noiseBuffer;
        this.bufferSource.loop = true;
        this.bufferSource.connect(this.gainNode);
        this.bufferSource.start();
    }
    
    writeLength(value) {
        this.lengthCounter = 64 - (value & 0x3F);
    }
    
    writeEnvelope(value) {
        this.envelopeVolume = (value >> 4) & 0xF;
        this.envelopeDirection = (value >> 3) & 1;
        this.envelopePeriod = value & 7;
        this.currentVolume = this.envelopeVolume;
    }
    
    writePolynomial(value) {
        this.clockShift = (value >> 4) & 0xF;
        this.widthMode = (value >> 3) & 1;
        this.divisorCode = value & 7;
    }
    
    writeControl(value) {
        this.lengthEnable = (value & 0x40) !== 0;
        
        if (value & 0x80) { // Trigger
            this.restart();
        }
    }
    
    restart() {
        this.enabled = true;
        
        if (this.lengthCounter === 0) {
            this.lengthCounter = 64;
        }
        
        this.envelopeCounter = this.envelopePeriod;
        this.currentVolume = this.envelopeVolume;
        this.shiftRegister = 0x7FFF;
        
        this.startNoise();
        this.updateOutput();
    }
    
    updateOutput() {
        if (this.gainNode) {
            const volume = this.enabled ? (this.currentVolume / 15) * 0.1 : 0;
            this.gainNode.gain.value = volume;
        }
    }
    
    stepLength() {
        if (this.lengthEnable && this.lengthCounter > 0) {
            this.lengthCounter--;
            if (this.lengthCounter === 0) {
                this.enabled = false;
                this.updateOutput();
            }
        }
    }
    
    stepEnvelope() {
        if (this.envelopePeriod !== 0) {
            this.envelopeCounter--;
            if (this.envelopeCounter <= 0) {
                this.envelopeCounter = this.envelopePeriod;
                
                if (this.envelopeDirection === 1 && this.currentVolume < 15) {
                    this.currentVolume++;
                } else if (this.envelopeDirection === 0 && this.currentVolume > 0) {
                    this.currentVolume--;
                }
                
                this.updateOutput();
            }
        }
    }
    
    setPanning(left, right) {
        if (this.leftGain) this.leftGain.gain.value = left ? 1 : 0;
        if (this.rightGain) this.rightGain.gain.value = right ? 1 : 0;
    }
    
    step(cycles) {
        // Noise channel step logic if needed
    }
    
    disable() {
        this.enabled = false;
        if (this.bufferSource) {
            this.bufferSource.stop();
            this.bufferSource = null;
        }
        this.updateOutput();
    }
    
    reset() {
        this.enabled = false;
        this.lengthCounter = 0;
        this.currentVolume = 0;
        this.shiftRegister = 0x7FFF;
        this.disable();
    }
}