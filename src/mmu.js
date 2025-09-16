/**
 * GameBoy Memory Management Unit (MMU)
 * Handles memory mapping, banking, and I/O registers
 */
class MMU {
    constructor() {
        // Memory regions
        this.bios = new Uint8Array(0x100);  // 0x0000-0x00FF (256 bytes)
        this.vram = new Uint8Array(0x2000); // 0x8000-0x9FFF (8KB)
        this.wram = new Uint8Array(0x2000); // 0xC000-0xDFFF (8KB)
        this.oam = new Uint8Array(0xA0);    // 0xFE00-0xFE9F (160 bytes - sprite data)
        this.io = new Uint8Array(0x80);     // 0xFF00-0xFF7F (128 bytes - I/O registers)
        this.hram = new Uint8Array(0x7F);   // 0xFF80-0xFFFE (127 bytes - high RAM)
        
        // Cartridge memory (will be set when cartridge is loaded)
        this.cartridge = null;
        
        // BIOS flag
        this.biosEnabled = true;
        
        // Initialize I/O registers
        this.initIO();
        
        // Load BIOS data
        this.loadBIOS();
    }
    
    loadBIOS() {
        // GameBoy BIOS (simplified version - real BIOS is copyrighted)
        // This is a minimal BIOS that sets up initial state
        const biosData = [
            0x31, 0xFE, 0xFF,       // LD SP,$FFFE
            0xAF,                   // XOR A
            0x21, 0xFF, 0x9F,       // LD HL,$9FFF
            0x32,                   // LD (HL-),A
            0xCB, 0x7C,             // BIT 7,H
            0x20, 0xFB,             // JR NZ,$-5
            0x21, 0x26, 0xFF,       // LD HL,$FF26
            0x0E, 0x11,             // LD C,$11
            0x3E, 0x80,             // LD A,$80
            0x32,                   // LD (HL-),A
            0xE2,                   // LD ($FF00+C),A
            0x0C,                   // INC C
            0x3E, 0xF3,             // LD A,$F3
            0xE2,                   // LD ($FF00+C),A
            0x32,                   // LD (HL-),A
            0x3E, 0x77,             // LD A,$77
            0x77,                   // LD (HL),A
            0x3E, 0xFC,             // LD A,$FC
            0xE0, 0x47,             // LD ($FF47),A
            0x11, 0x04, 0x01,       // LD DE,$0104
            0x21, 0x10, 0x80,       // LD HL,$8010
            0x1A,                   // LD A,(DE)
            0xCD, 0x95, 0x00,       // CALL $0095
            0xCD, 0x96, 0x00,       // CALL $0096
            0x13,                   // INC DE
            0x7B,                   // LD A,E
            0xFE, 0x34,             // CP $34
            0x20, 0xF3,             // JR NZ,$-13
            0x11, 0xD8, 0x00,       // LD DE,$00D8
            0x06, 0x08,             // LD B,$08
            0x1A,                   // LD A,(DE)
            0x13,                   // INC DE
            0x22,                   // LD (HL+),A
            0x23,                   // INC HL
            0x05,                   // DEC B
            0x20, 0xF9,             // JR NZ,$-7
            0x3E, 0x19,             // LD A,$19
            0xEA, 0x10, 0x99,       // LD ($9910),A
            0x21, 0x2F, 0x99,       // LD HL,$992F
            0x0E, 0x0C,             // LD C,$0C
            0x3D,                   // DEC A
            0x28, 0x08,             // JR Z,$+8
            0x32,                   // LD (HL-),A
            0x0D,                   // DEC C
            0x20, 0xF9,             // JR NZ,$-7
            0x2E, 0x0F,             // LD L,$0F
            0x18, 0xF3,             // JR $-13
            0xC3, 0x00, 0x01        // JP $0100
        ];
        
        for (let i = 0; i < biosData.length && i < this.bios.length; i++) {
            this.bios[i] = biosData[i];
        }
    }
    
    initIO() {
        // Initialize I/O registers to power-up values
        this.io[0x00] = 0xCF;  // P1 - Joypad
        this.io[0x02] = 0x7E;  // SB - Serial transfer data
        this.io[0x05] = 0x00;  // TIMA - Timer counter
        this.io[0x06] = 0x00;  // TMA - Timer modulo
        this.io[0x07] = 0xF8;  // TAC - Timer control
        this.io[0x0F] = 0xE1;  // IF - Interrupt flag
        this.io[0x10] = 0x80;  // NR10 - Channel 1 sweep
        this.io[0x11] = 0xBF;  // NR11 - Channel 1 length/wave
        this.io[0x12] = 0xF3;  // NR12 - Channel 1 envelope
        this.io[0x14] = 0xBF;  // NR14 - Channel 1 frequency hi
        this.io[0x16] = 0x3F;  // NR21 - Channel 2 length/wave
        this.io[0x17] = 0x00;  // NR22 - Channel 2 envelope
        this.io[0x19] = 0xBF;  // NR24 - Channel 2 frequency hi
        this.io[0x1A] = 0x7F;  // NR30 - Channel 3 on/off
        this.io[0x1B] = 0xFF;  // NR31 - Channel 3 length
        this.io[0x1C] = 0x9F;  // NR32 - Channel 3 output level
        this.io[0x1E] = 0xBF;  // NR34 - Channel 3 frequency hi
        this.io[0x20] = 0xFF;  // NR41 - Channel 4 length
        this.io[0x21] = 0x00;  // NR42 - Channel 4 envelope
        this.io[0x22] = 0x00;  // NR43 - Channel 4 polynomial counter
        this.io[0x23] = 0xBF;  // NR44 - Channel 4 counter/consecutive
        this.io[0x24] = 0x77;  // NR50 - Channel control / ON-OFF / Volume
        this.io[0x25] = 0xF3;  // NR51 - Selection of Sound output terminal
        this.io[0x26] = 0xF1;  // NR52 - Sound on/off
        this.io[0x40] = 0x91;  // LCDC - LCD Control
        this.io[0x41] = 0x85;  // STAT - LCDC Status
        this.io[0x42] = 0x00;  // SCY - Scroll Y
        this.io[0x43] = 0x00;  // SCX - Scroll X
        this.io[0x44] = 0x00;  // LY - LCDC Y-Coordinate
        this.io[0x45] = 0x00;  // LYC - LY Compare
        this.io[0x46] = 0x00;  // DMA - DMA Transfer and Start Address
        this.io[0x47] = 0xFC;  // BGP - BG Palette Data
        this.io[0x48] = 0xFF;  // OBP0 - Object Palette 0 Data
        this.io[0x49] = 0xFF;  // OBP1 - Object Palette 1 Data
        this.io[0x4A] = 0x00;  // WY - Window Y Position
        this.io[0x4B] = 0x00;  // WX - Window X Position
        this.io[0x4D] = 0xFF;  // KEY1 - CGB Mode Only - Prepare Speed Switch
        this.io[0x4F] = 0xFF;  // VBK - CGB Mode Only - VRAM Bank
        this.io[0x51] = 0xFF;  // HDMA1 - CGB Mode Only - New DMA Source, High
        this.io[0x52] = 0xFF;  // HDMA2 - CGB Mode Only - New DMA Source, Low
        this.io[0x53] = 0xFF;  // HDMA3 - CGB Mode Only - New DMA Destination, High
        this.io[0x54] = 0xFF;  // HDMA4 - CGB Mode Only - New DMA Destination, Low
        this.io[0x55] = 0xFF;  // HDMA5 - CGB Mode Only - New DMA Length/Mode/Start
        this.io[0x68] = 0xFF;  // BCPS - CGB Mode Only - Background Palette Index
        this.io[0x69] = 0xFF;  // BCPD - CGB Mode Only - Background Palette Data
        this.io[0x6A] = 0xFF;  // OCPS - CGB Mode Only - Sprite Palette Index
        this.io[0x6B] = 0xFF;  // OCPD - CGB Mode Only - Sprite Palette Data
        this.io[0x70] = 0xFF;  // SVBK - CGB Mode Only - WRAM Bank
        this.io[0x7F] = 0xFF;  // IE - Interrupt Enable
    }
    
    // Interrupt properties for easy access
    get IE() { return this.io[0x7F]; }
    set IE(value) { this.io[0x7F] = value; }
    
    get IF() { return this.io[0x0F]; }
    set IF(value) { this.io[0x0F] = value; }
    
    // Main memory read function
    read8(address) {
        address &= 0xFFFF;
        
        // BIOS (0x0000-0x00FF)
        if (address < 0x0100 && this.biosEnabled) {
            return this.bios[address];
        }
        
        // Cartridge ROM Bank 0 (0x0000-0x3FFF)
        if (address < 0x4000) {
            return this.cartridge ? this.cartridge.read(address) : 0xFF;
        }
        
        // Cartridge ROM Bank 1-N (0x4000-0x7FFF)
        if (address < 0x8000) {
            return this.cartridge ? this.cartridge.read(address) : 0xFF;
        }
        
        // VRAM (0x8000-0x9FFF)
        if (address < 0xA000) {
            return this.vram[address - 0x8000];
        }
        
        // Cartridge RAM (0xA000-0xBFFF)
        if (address < 0xC000) {
            return this.cartridge ? this.cartridge.read(address) : 0xFF;
        }
        
        // Work RAM Bank 0 (0xC000-0xCFFF)
        if (address < 0xD000) {
            return this.wram[address - 0xC000];
        }
        
        // Work RAM Bank 1 (0xD000-0xDFFF)
        if (address < 0xE000) {
            return this.wram[address - 0xC000];
        }
        
        // Echo RAM (0xE000-0xFDFF) - mirrors WRAM
        if (address < 0xFE00) {
            return this.wram[address - 0xE000];
        }
        
        // OAM (0xFE00-0xFE9F)
        if (address < 0xFEA0) {
            return this.oam[address - 0xFE00];
        }
        
        // Prohibited area (0xFEA0-0xFEFF)
        if (address < 0xFF00) {
            return 0xFF;
        }
        
        // I/O Registers (0xFF00-0xFF7F)
        if (address < 0xFF80) {
            return this.readIO(address - 0xFF00);
        }
        
        // High RAM (0xFF80-0xFFFE)
        if (address < 0xFFFF) {
            return this.hram[address - 0xFF80];
        }
        
        // Interrupt Enable Register (0xFFFF)
        if (address === 0xFFFF) {
            return this.io[0x7F];
        }
        
        return 0xFF;
    }
    
    // Main memory write function
    write8(address, value) {
        address &= 0xFFFF;
        value &= 0xFF;
        
        // ROM areas (0x0000-0x7FFF) - writes go to cartridge
        if (address < 0x8000) {
            if (this.cartridge) {
                this.cartridge.write(address, value);
            }
            // Disable BIOS when writing to 0xFF50
            if (address === 0xFF50 && value !== 0) {
                this.biosEnabled = false;
            }
            return;
        }
        
        // VRAM (0x8000-0x9FFF)
        if (address < 0xA000) {
            this.vram[address - 0x8000] = value;
            return;
        }
        
        // Cartridge RAM (0xA000-0xBFFF)
        if (address < 0xC000) {
            if (this.cartridge) {
                this.cartridge.write(address, value);
            }
            return;
        }
        
        // Work RAM Bank 0 (0xC000-0xCFFF)
        if (address < 0xD000) {
            this.wram[address - 0xC000] = value;
            return;
        }
        
        // Work RAM Bank 1 (0xD000-0xDFFF)
        if (address < 0xE000) {
            this.wram[address - 0xC000] = value;
            return;
        }
        
        // Echo RAM (0xE000-0xFDFF) - mirrors WRAM
        if (address < 0xFE00) {
            this.wram[address - 0xE000] = value;
            return;
        }
        
        // OAM (0xFE00-0xFE9F)
        if (address < 0xFEA0) {
            this.oam[address - 0xFE00] = value;
            return;
        }
        
        // Prohibited area (0xFEA0-0xFEFF)
        if (address < 0xFF00) {
            return;
        }
        
        // I/O Registers (0xFF00-0xFF7F)
        if (address < 0xFF80) {
            this.writeIO(address - 0xFF00, value);
            return;
        }
        
        // High RAM (0xFF80-0xFFFE)
        if (address < 0xFFFF) {
            this.hram[address - 0xFF80] = value;
            return;
        }
        
        // Interrupt Enable Register (0xFFFF)
        if (address === 0xFFFF) {
            this.io[0x7F] = value;
            return;
        }
    }
    
    // I/O register read with special behavior
    readIO(offset) {
        switch (offset) {
            case 0x00: // P1 - Joypad
                return this.getJoypadState();
            case 0x44: // LY - LCD Y coordinate (handled by PPU)
                return this.io[offset];
            case 0x41: // STAT - LCD status (handled by PPU)
                return this.io[offset];
            default:
                return this.io[offset];
        }
    }
    
    // I/O register write with special behavior
    writeIO(offset, value) {
        switch (offset) {
            case 0x00: // P1 - Joypad
                this.io[offset] = (this.io[offset] & 0x0F) | (value & 0x30);
                break;
            case 0x04: // DIV - Divider register (resets to 0 when written)
                this.io[offset] = 0;
                break;
            case 0x44: // LY - LCD Y coordinate (read-only, resets to 0 when written)
                this.io[offset] = 0;
                break;
            case 0x46: // DMA - DMA transfer
                this.performDMA(value);
                this.io[offset] = value;
                break;
            case 0x50: // Boot ROM disable
                if (value !== 0) {
                    this.biosEnabled = false;
                }
                break;
            default:
                this.io[offset] = value;
                break;
        }
    }
    
    // DMA transfer from ROM/RAM to OAM
    performDMA(sourceHigh) {
        const source = sourceHigh << 8;
        for (let i = 0; i < 0xA0; i++) {
            this.oam[i] = this.read8(source + i);
        }
    }
    
    // Joypad state (will be updated by input system)
    joypadState = {
        right: false, left: false, up: false, down: false,
        a: false, b: false, select: false, start: false
    };
    
    getJoypadState() {
        const p1 = this.io[0x00];
        let result = p1 & 0x30;
        
        if (!(p1 & 0x10)) { // Direction keys
            if (!this.joypadState.down) result |= 0x08;
            if (!this.joypadState.up) result |= 0x04;
            if (!this.joypadState.left) result |= 0x02;
            if (!this.joypadState.right) result |= 0x01;
        }
        
        if (!(p1 & 0x20)) { // Button keys
            if (!this.joypadState.start) result |= 0x08;
            if (!this.joypadState.select) result |= 0x04;
            if (!this.joypadState.b) result |= 0x02;
            if (!this.joypadState.a) result |= 0x01;
        }
        
        return result;
    }
    
    updateJoypad(state) {
        const oldState = this.getJoypadState();
        this.joypadState = { ...state };
        const newState = this.getJoypadState();
        
        // Generate joypad interrupt if any button was pressed
        if ((oldState & 0x0F) && !(newState & 0x0F)) {
            this.IF |= 0x10; // Set joypad interrupt flag
        }
    }
    
    // Load cartridge
    loadCartridge(cartridge) {
        this.cartridge = cartridge;
    }
    
    // Reset MMU
    reset() {
        this.vram.fill(0);
        this.wram.fill(0);
        this.oam.fill(0);
        this.hram.fill(0);
        this.biosEnabled = true;
        this.initIO();
    }
    
    // Debug helpers
    getMemoryRegion(start, length) {
        const data = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = this.read8(start + i);
        }
        return data;
    }
}