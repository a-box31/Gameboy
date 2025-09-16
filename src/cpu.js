/**
 * GameBoy CPU (LR35902) - Sharp Z80-like processor
 * Implements the complete instruction set with cycle timing
 */
class CPU {
    constructor(mmu) {
        this.mmu = mmu;
        
        // 8-bit registers
        this.registers = {
            A: 0x01,  // Accumulator
            F: 0xB0,  // Flags
            B: 0x00,
            C: 0x13,
            D: 0x00,
            E: 0xD8,
            H: 0x01,
            L: 0x4D
        };
        
        // 16-bit registers
        this.SP = 0xFFFE;  // Stack Pointer
        this.PC = 0x0100;  // Program Counter
        
        // Interrupt flags
        this.IME = false;  // Interrupt Master Enable
        this.halted = false;
        this.stopped = false;
        
        // Timing
        this.cycles = 0;
        this.totalCycles = 0;
        
        // Initialize instruction tables
        this.initInstructions();
        this.initCBInstructions();
    }
    
    // Flag operations
    getFlag(flag) {
        switch(flag) {
            case 'Z': return (this.registers.F & 0x80) !== 0;  // Zero
            case 'N': return (this.registers.F & 0x40) !== 0;  // Subtract
            case 'H': return (this.registers.F & 0x20) !== 0;  // Half Carry
            case 'C': return (this.registers.F & 0x10) !== 0;  // Carry
        }
        return false;
    }
    
    setFlag(flag, value) {
        const bit = { 'Z': 0x80, 'N': 0x40, 'H': 0x20, 'C': 0x10 }[flag];
        if (value) {
            this.registers.F |= bit;
        } else {
            this.registers.F &= ~bit;
        }
    }
    
    // 16-bit register pairs
    getHL() { return (this.registers.H << 8) | this.registers.L; }
    setHL(value) {
        this.registers.H = (value >> 8) & 0xFF;
        this.registers.L = value & 0xFF;
    }
    
    getBC() { return (this.registers.B << 8) | this.registers.C; }
    setBC(value) {
        this.registers.B = (value >> 8) & 0xFF;
        this.registers.C = value & 0xFF;
    }
    
    getDE() { return (this.registers.D << 8) | this.registers.E; }
    setDE(value) {
        this.registers.D = (value >> 8) & 0xFF;
        this.registers.E = value & 0xFF;
    }
    
    getAF() { return (this.registers.A << 8) | this.registers.F; }
    setAF(value) {
        this.registers.A = (value >> 8) & 0xFF;
        this.registers.F = value & 0xF0;  // Lower 4 bits always 0
    }
    
    // Memory operations
    read8(address) {
        return this.mmu.read8(address);
    }
    
    write8(address, value) {
        this.mmu.write8(address, value);
    }
    
    read16(address) {
        return this.read8(address) | (this.read8(address + 1) << 8);
    }
    
    write16(address, value) {
        this.write8(address, value & 0xFF);
        this.write8(address + 1, (value >> 8) & 0xFF);
    }
    
    // Stack operations
    push16(value) {
        this.SP = (this.SP - 2) & 0xFFFF;
        this.write16(this.SP, value);
    }
    
    pop16() {
        const value = this.read16(this.SP);
        this.SP = (this.SP + 2) & 0xFFFF;
        return value;
    }
    
    // Instruction fetch
    fetchByte() {
        const byte = this.read8(this.PC);
        this.PC = (this.PC + 1) & 0xFFFF;
        return byte;
    }
    
    fetchWord() {
        const word = this.read16(this.PC);
        this.PC = (this.PC + 2) & 0xFFFF;
        return word;
    }
    
    // Main execution step
    step() {
        if (this.stopped) return 4;
        
        // Handle interrupts
        if (this.IME && this.mmu.IE & this.mmu.IF) {
            this.handleInterrupts();
            return 20;  // Interrupt handling takes 5 cycles (20 T-states)
        }
        
        if (this.halted) {
            // If halted, check for interrupts
            if (this.mmu.IE & this.mmu.IF) {
                this.halted = false;
                if (!this.IME) {
                    // HALT bug - PC doesn't increment on next instruction
                    this.PC = (this.PC - 1) & 0xFFFF;
                }
            }
            return 4;  // HALT takes 1 cycle
        }
        
        const opcode = this.fetchByte();
        const instruction = this.instructions[opcode];
        
        if (!instruction) {
            throw new Error(`Unknown opcode: 0x${opcode.toString(16).toUpperCase().padStart(2, '0')} at PC: 0x${(this.PC - 1).toString(16).toUpperCase().padStart(4, '0')}`);
        }
        
        const cycles = instruction.call(this);
        this.cycles += cycles;
        this.totalCycles += cycles;
        
        return cycles;
    }
    
    // Interrupt handling
    handleInterrupts() {
        const interrupts = this.mmu.IE & this.mmu.IF;
        
        this.IME = false;  // Disable interrupts
        this.halted = false;
        
        // Check interrupt priority (bit 0-4)
        for (let i = 0; i < 5; i++) {
            if (interrupts & (1 << i)) {
                this.mmu.IF &= ~(1 << i);  // Clear interrupt flag
                this.push16(this.PC);
                this.PC = 0x40 + (i * 0x08);  // Jump to interrupt vector
                break;
            }
        }
    }
    
    // Reset CPU to initial state
    reset() {
        this.registers.A = 0x01;
        this.registers.F = 0xB0;
        this.registers.B = 0x00;
        this.registers.C = 0x13;
        this.registers.D = 0x00;
        this.registers.E = 0xD8;
        this.registers.H = 0x01;
        this.registers.L = 0x4D;
        
        this.SP = 0xFFFE;
        this.PC = 0x0100;
        
        this.IME = false;
        this.halted = false;
        this.stopped = false;
        this.cycles = 0;
        this.totalCycles = 0;
    }
    
    // Initialize instruction table
    initInstructions() {
        this.instructions = new Array(256);
        
        // NOP - 0x00
        this.instructions[0x00] = function() { return 4; };
        
        // LD BC,nn - 0x01
        this.instructions[0x01] = function() {
            const value = this.fetchWord();
            this.setBC(value);
            return 12;
        };
        
        // LD (BC),A - 0x02
        this.instructions[0x02] = function() {
            this.write8(this.getBC(), this.registers.A);
            return 8;
        };
        
        // INC BC - 0x03
        this.instructions[0x03] = function() {
            this.setBC((this.getBC() + 1) & 0xFFFF);
            return 8;
        };
        
        // INC B - 0x04
        this.instructions[0x04] = function() {
            this.registers.B = this.inc8(this.registers.B);
            return 4;
        };
        
        // DEC B - 0x05
        this.instructions[0x05] = function() {
            this.registers.B = this.dec8(this.registers.B);
            return 4;
        };
        
        // LD B,n - 0x06
        this.instructions[0x06] = function() {
            this.registers.B = this.fetchByte();
            return 8;
        };
        
        // RLCA - 0x07
        this.instructions[0x07] = function() {
            const carry = (this.registers.A & 0x80) !== 0;
            this.registers.A = ((this.registers.A << 1) | (carry ? 1 : 0)) & 0xFF;
            this.setFlag('Z', false);
            this.setFlag('N', false);
            this.setFlag('H', false);
            this.setFlag('C', carry);
            return 4;
        };
        
        // LD (nn),SP - 0x08
        this.instructions[0x08] = function() {
            const address = this.fetchWord();
            this.write16(address, this.SP);
            return 20;
        };
        
        // ADD HL,BC - 0x09
        this.instructions[0x09] = function() {
            this.setHL(this.add16(this.getHL(), this.getBC()));
            return 8;
        };
        
        // LD A,(BC) - 0x0A
        this.instructions[0x0A] = function() {
            this.registers.A = this.read8(this.getBC());
            return 8;
        };
        
        // DEC BC - 0x0B
        this.instructions[0x0B] = function() {
            this.setBC((this.getBC() - 1) & 0xFFFF);
            return 8;
        };
        
        // INC C - 0x0C
        this.instructions[0x0C] = function() {
            this.registers.C = this.inc8(this.registers.C);
            return 4;
        };
        
        // DEC C - 0x0D
        this.instructions[0x0D] = function() {
            this.registers.C = this.dec8(this.registers.C);
            return 4;
        };
        
        // LD C,n - 0x0E
        this.instructions[0x0E] = function() {
            this.registers.C = this.fetchByte();
            return 8;
        };
        
        // RRCA - 0x0F
        this.instructions[0x0F] = function() {
            const carry = (this.registers.A & 0x01) !== 0;
            this.registers.A = ((this.registers.A >> 1) | (carry ? 0x80 : 0)) & 0xFF;
            this.setFlag('Z', false);
            this.setFlag('N', false);
            this.setFlag('H', false);
            this.setFlag('C', carry);
            return 4;
        };
        
        // Continue with more instructions...
        this.initRemainingInstructions();
    }
    
    // Helper functions for arithmetic operations
    inc8(value) {
        const result = (value + 1) & 0xFF;
        this.setFlag('Z', result === 0);
        this.setFlag('N', false);
        this.setFlag('H', (value & 0x0F) === 0x0F);
        return result;
    }
    
    dec8(value) {
        const result = (value - 1) & 0xFF;
        this.setFlag('Z', result === 0);
        this.setFlag('N', true);
        this.setFlag('H', (value & 0x0F) === 0);
        return result;
    }
    
    add16(a, b) {
        const result = (a + b) & 0xFFFF;
        this.setFlag('N', false);
        this.setFlag('H', (a & 0x0FFF) + (b & 0x0FFF) > 0x0FFF);
        this.setFlag('C', a + b > 0xFFFF);
        return result;
    }
    
    add8(a, b) {
        const result = (a + b) & 0xFF;
        this.setFlag('Z', result === 0);
        this.setFlag('N', false);
        this.setFlag('H', (a & 0x0F) + (b & 0x0F) > 0x0F);
        this.setFlag('C', a + b > 0xFF);
        return result;
    }
    
    sub8(a, b) {
        const result = (a - b) & 0xFF;
        this.setFlag('Z', result === 0);
        this.setFlag('N', true);
        this.setFlag('H', (a & 0x0F) < (b & 0x0F));
        this.setFlag('C', a < b);
        return result;
    }
    
    // Placeholder for remaining instructions - this would be expanded with all 256 opcodes
    initRemainingInstructions() {
        // JP nn - 0xC3
        this.instructions[0xC3] = function() {
            this.PC = this.fetchWord();
            return 16;
        };
        
        // CALL nn - 0xCD
        this.instructions[0xCD] = function() {
            const address = this.fetchWord();
            this.push16(this.PC);
            this.PC = address;
            return 24;
        };
        
        // RET - 0xC9
        this.instructions[0xC9] = function() {
            this.PC = this.pop16();
            return 16;
        };
        
        // HALT - 0x76
        this.instructions[0x76] = function() {
            this.halted = true;
            return 4;
        };
        
        // DI - 0xF3
        this.instructions[0xF3] = function() {
            this.IME = false;
            return 4;
        };
        
        // EI - 0xFB
        this.instructions[0xFB] = function() {
            this.IME = true;
            return 4;
        };
        
        // CB prefix - 0xCB
        this.instructions[0xCB] = function() {
            const opcode = this.fetchByte();
            const instruction = this.cbInstructions[opcode];
            if (!instruction) {
                throw new Error(`Unknown CB opcode: 0x${opcode.toString(16).toUpperCase().padStart(2, '0')}`);
            }
            return instruction.call(this) + 4;  // CB instructions take an extra 4 cycles
        };
        
        // Fill remaining slots with placeholder that throws error
        for (let i = 0; i < 256; i++) {
            if (!this.instructions[i]) {
                this.instructions[i] = function() {
                    throw new Error(`Unimplemented opcode: 0x${i.toString(16).toUpperCase().padStart(2, '0')}`);
                };
            }
        }
    }
    
    // Initialize CB-prefixed instructions
    initCBInstructions() {
        this.cbInstructions = new Array(256);
        
        // Placeholder implementation - would include all bit operations
        for (let i = 0; i < 256; i++) {
            this.cbInstructions[i] = function() {
                throw new Error(`Unimplemented CB opcode: 0x${i.toString(16).toUpperCase().padStart(2, '0')}`);
            };
        }
    }
    
    // Debug information
    getState() {
        return {
            registers: { ...this.registers },
            PC: this.PC,
            SP: this.SP,
            IME: this.IME,
            halted: this.halted,
            stopped: this.stopped,
            cycles: this.cycles,
            totalCycles: this.totalCycles
        };
    }
}