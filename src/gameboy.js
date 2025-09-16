/**
 * Main GameBoy Emulator Class
 * Coordinates CPU, PPU, APU, MMU, and timing
 */
class GameBoy {
    constructor() {
        // Core components
        this.mmu = new MMU();
        this.cpu = new CPU(this.mmu);
        this.ppu = new PPU(this.mmu);
        this.apu = new APU(this.mmu);
        this.input = new Input(this.mmu);
        this.cartridge = new Cartridge();
        
        // Emulation state
        this.running = false;
        this.paused = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        
        // Timing
        this.targetFPS = 59.7275; // GameBoy's actual refresh rate
        this.cyclesPerFrame = 70224; // CPU cycles per frame
        this.frameTime = 1000 / this.targetFPS; // ~16.74ms per frame
        
        // Animation frame request
        this.animationId = null;
        
        // Debug information
        this.debugMode = false;
        this.breakpoints = new Set();
        
        // Save states
        this.saveStates = {};
        
        this.init();
    }
    
    async init() {
        // Initialize audio
        await this.apu.initAudio();
        
        // Set up canvas
        const canvas = document.getElementById('screen');
        if (canvas) {
            this.ppu.setCanvas(canvas);
        }
        
        // Connect MMU to cartridge
        this.mmu.loadCartridge(this.cartridge);
        
        console.log('GameBoy emulator initialized');
    }
    
    loadROM(arrayBuffer) {
        try {
            this.stop();
            
            // Load cartridge
            this.cartridge.loadROM(arrayBuffer);
            
            // Reset all components
            this.reset();
            
            console.log('ROM loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load ROM:', error);
            return false;
        }
    }
    
    start() {
        if (this.running) return;
        
        this.running = true;
        this.paused = false;
        this.lastFrameTime = performance.now();
        
        this.gameLoop();
        console.log('Emulation started');
    }
    
    stop() {
        this.running = false;
        this.paused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        console.log('Emulation stopped');
    }
    
    pause() {
        this.paused = !this.paused;
        
        if (!this.paused && this.running) {
            this.lastFrameTime = performance.now();
            this.gameLoop();
        }
        
        console.log(this.paused ? 'Emulation paused' : 'Emulation resumed');
    }
    
    reset() {
        const wasRunning = this.running;
        this.stop();
        
        // Reset all components
        this.cpu.reset();
        this.ppu.reset();
        this.apu.reset();
        this.mmu.reset();
        this.cartridge.reset();
        
        this.frameCount = 0;
        this.fps = 0;
        
        if (wasRunning) {
            setTimeout(() => this.start(), 100);
        }
        
        console.log('System reset');
    }
    
    gameLoop() {
        if (!this.running || this.paused) {
            return;
        }
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Run frame
        this.runFrame();
        
        // Calculate FPS
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1000 / deltaTime);
            this.updateDebugInfo();
        }
        
        // Schedule next frame
        this.lastFrameTime = currentTime;
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    runFrame() {
        let cycles = 0;
        
        // Run until frame is complete
        while (cycles < this.cyclesPerFrame) {
            // Check for breakpoints in debug mode
            if (this.debugMode && this.breakpoints.has(this.cpu.PC)) {
                this.pause();
                console.log(`Breakpoint hit at PC: 0x${this.cpu.PC.toString(16).toUpperCase().padStart(4, '0')}`);
                break;
            }
            
            // Step CPU
            const cpuCycles = this.cpu.step();
            cycles += cpuCycles;
            
            // Step PPU (runs at same rate as CPU)
            this.ppu.step(cpuCycles);
            
            // Step APU
            this.apu.step(cpuCycles);
            
            // Handle I/O register updates
            this.updateIO();
            
            // Check for frame completion
            if (this.ppu.frameComplete) {
                break;
            }
        }
        
        // Auto-save battery RAM periodically
        if (this.frameCount % (60 * 10) === 0) { // Every 10 seconds
            this.cartridge.saveToBattery();
        }
    }
    
    updateIO() {
        // Handle timer updates
        this.updateTimer();
        
        // Update audio registers
        this.updateAudioRegisters();
    }
    
    updateTimer() {
        // Timer implementation (simplified)
        const tac = this.mmu.io[0x07]; // Timer control
        
        if (tac & 0x04) { // Timer enabled
            const clockSelect = tac & 0x03;
            const frequencies = [4096, 262144, 65536, 16384]; // Hz
            const cyclesPerTick = 4194304 / frequencies[clockSelect];
            
            // This is a simplified timer - real implementation would track cycles more precisely
            if (this.cpu.totalCycles % Math.floor(cyclesPerTick) === 0) {
                let tima = this.mmu.io[0x05]; // Timer counter
                tima++;
                
                if (tima > 0xFF) {
                    tima = this.mmu.io[0x06]; // Timer modulo
                    this.mmu.IF |= 0x04; // Timer interrupt
                }
                
                this.mmu.io[0x05] = tima;
            }
        }
        
        // Update divider register (runs at 16384 Hz)
        if (this.cpu.totalCycles % 256 === 0) {
            this.mmu.io[0x04] = (this.mmu.io[0x04] + 1) & 0xFF;
        }
    }
    
    updateAudioRegisters() {
        // Forward audio register writes to APU
        // This would typically be handled by MMU write handlers
    }
    
    updateDebugInfo() {
        // Update debug display
        const cpuStatus = document.getElementById('cpu-status');
        const pcValue = document.getElementById('pc-value');
        const spValue = document.getElementById('sp-value');
        const fpsValue = document.getElementById('fps-value');
        
        if (cpuStatus) {
            cpuStatus.textContent = this.running ? (this.paused ? 'Paused' : 'Running') : 'Stopped';
        }
        
        if (pcValue) {
            pcValue.textContent = `0x${this.cpu.PC.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        
        if (spValue) {
            spValue.textContent = `0x${this.cpu.SP.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        
        if (fpsValue) {
            fpsValue.textContent = this.fps.toString();
        }
    }
    
    // Save state functionality
    saveState(slot = 0) {
        const state = {
            cpu: this.cpu.getState(),
            ppu: this.ppu.getState(),
            mmu: {
                vram: Array.from(this.mmu.vram),
                wram: Array.from(this.mmu.wram),
                oam: Array.from(this.mmu.oam),
                hram: Array.from(this.mmu.hram),
                io: Array.from(this.mmu.io)
            },
            cartridge: {
                ram: this.cartridge.ram ? Array.from(this.cartridge.ram) : null,
                romBank: this.cartridge.romBank,
                ramBank: this.cartridge.ramBank,
                ramEnabled: this.cartridge.ramEnabled,
                bankingMode: this.cartridge.bankingMode
            },
            timestamp: Date.now()
        };
        
        this.saveStates[slot] = state;
        
        // Save to localStorage
        const saveKey = `gameboy_savestate_${this.cartridge.title || 'unknown'}_${slot}`;
        localStorage.setItem(saveKey, JSON.stringify(state));
        
        console.log(`State saved to slot ${slot}`);
        return true;
    }
    
    loadState(slot = 0) {
        let state = this.saveStates[slot];
        
        // Try loading from localStorage if not in memory
        if (!state) {
            const saveKey = `gameboy_savestate_${this.cartridge.title || 'unknown'}_${slot}`;
            const savedData = localStorage.getItem(saveKey);
            
            if (savedData) {
                try {
                    state = JSON.parse(savedData);
                    this.saveStates[slot] = state;
                } catch (e) {
                    console.error('Failed to parse save state:', e);
                    return false;
                }
            }
        }
        
        if (!state) {
            console.warn(`No save state found in slot ${slot}`);
            return false;
        }
        
        try {
            // Restore CPU state
            Object.assign(this.cpu.registers, state.cpu.registers);
            this.cpu.PC = state.cpu.PC;
            this.cpu.SP = state.cpu.SP;
            this.cpu.IME = state.cpu.IME;
            this.cpu.halted = state.cpu.halted;
            this.cpu.stopped = state.cpu.stopped;
            this.cpu.cycles = state.cpu.cycles;
            
            // Restore PPU state
            this.ppu.cycles = state.ppu.cycles;
            this.ppu.currentLine = state.ppu.currentLine;
            this.ppu.mode = state.ppu.mode;
            
            // Restore MMU state
            this.mmu.vram.set(state.mmu.vram);
            this.mmu.wram.set(state.mmu.wram);
            this.mmu.oam.set(state.mmu.oam);
            this.mmu.hram.set(state.mmu.hram);
            this.mmu.io.set(state.mmu.io);
            
            // Restore cartridge state
            if (state.cartridge.ram && this.cartridge.ram) {
                this.cartridge.ram.set(state.cartridge.ram);
            }
            this.cartridge.romBank = state.cartridge.romBank;
            this.cartridge.ramBank = state.cartridge.ramBank;
            this.cartridge.ramEnabled = state.cartridge.ramEnabled;
            this.cartridge.bankingMode = state.cartridge.bankingMode;
            
            console.log(`State loaded from slot ${slot}`);
            return true;
        } catch (e) {
            console.error('Failed to load save state:', e);
            return false;
        }
    }
    
    // Debug functionality
    addBreakpoint(address) {
        this.breakpoints.add(address);
        console.log(`Breakpoint added at 0x${address.toString(16).toUpperCase().padStart(4, '0')}`);
    }
    
    removeBreakpoint(address) {
        this.breakpoints.delete(address);
        console.log(`Breakpoint removed from 0x${address.toString(16).toUpperCase().padStart(4, '0')}`);
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    }
    
    step() {
        if (!this.paused) return;
        
        const cycles = this.cpu.step();
        this.ppu.step(cycles);
        this.apu.step(cycles);
        this.updateIO();
        this.updateDebugInfo();
    }
    
    // Audio controls
    setVolume(volume) {
        this.apu.setVolume(volume / 100);
    }
    
    toggleMute() {
        this.apu.mute();
    }
    
    // Get system information
    getSystemInfo() {
        return {
            running: this.running,
            paused: this.paused,
            fps: this.fps,
            frameCount: this.frameCount,
            cartridge: this.cartridge.getInfo(),
            cpu: this.cpu.getState(),
            ppu: this.ppu.getState(),
            input: this.input.getState()
        };
    }
    
    // Cleanup
    destroy() {
        this.stop();
        this.input.destroy();
        
        // Clear save states from memory
        this.saveStates = {};
    }
}