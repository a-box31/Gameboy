/**
 * GameBoy Cartridge System
 * Handles ROM loading, Memory Bank Controllers (MBCs), and save data
 */
class Cartridge {
    constructor() {
        this.rom = null;
        this.ram = null;
        this.romSize = 0;
        this.ramSize = 0;
        this.romBankCount = 0;
        this.ramBankCount = 0;
        
        // Header information
        this.title = '';
        this.cartridgeType = 0;
        this.romSizeCode = 0;
        this.ramSizeCode = 0;
        this.destinationCode = 0;
        this.licenseeCode = 0;
        this.versionNumber = 0;
        this.headerChecksum = 0;
        this.globalChecksum = 0;
        
        // MBC state
        this.mbc = null;
        this.romBank = 1;
        this.ramBank = 0;
        this.ramEnabled = false;
        this.bankingMode = 0; // 0 = ROM banking, 1 = RAM banking
        
        // Save data
        this.hasBattery = false;
        this.saveData = null;
    }
    
    loadROM(arrayBuffer) {
        this.rom = new Uint8Array(arrayBuffer);
        this.romSize = this.rom.length;
        
        if (this.romSize < 0x8000) {
            throw new Error('ROM too small (minimum 32KB required)');
        }
        
        this.parseHeader();
        this.initializeRAM();
        this.setupMBC();
        this.loadSaveData();
        
        return true;
    }
    
    parseHeader() {
        // Extract header information (0x0100-0x014F)
        
        // Title (0x0134-0x0143)
        let titleBytes = [];
        for (let i = 0x134; i < 0x144; i++) {
            if (this.rom[i] === 0) break;
            titleBytes.push(this.rom[i]);
        }
        this.title = String.fromCharCode(...titleBytes);
        
        // Cartridge type (0x0147)
        this.cartridgeType = this.rom[0x147];
        
        // ROM size (0x0148)
        this.romSizeCode = this.rom[0x148];
        this.romBankCount = 2 << this.romSizeCode; // 32KB * (2^n)
        
        // RAM size (0x0149)
        this.ramSizeCode = this.rom[0x149];
        this.ramBankCount = this.getRamBankCount();
        this.ramSize = this.ramBankCount * 0x2000; // 8KB per bank
        
        // Other header fields
        this.destinationCode = this.rom[0x14A];
        this.licenseeCode = this.rom[0x14B];
        this.versionNumber = this.rom[0x14C];
        this.headerChecksum = this.rom[0x14D];
        this.globalChecksum = (this.rom[0x14E] << 8) | this.rom[0x14F];
        
        // Check for battery backup
        this.hasBattery = this.cartridgeHasBattery();
        
        console.log(`Loaded ROM: ${this.title}`);
        console.log(`Type: 0x${this.cartridgeType.toString(16)}, ROM: ${this.romBankCount} banks, RAM: ${this.ramBankCount} banks`);
    }
    
    getRamBankCount() {
        switch (this.ramSizeCode) {
            case 0: return 0;    // No RAM
            case 1: return 1;    // 2KB (unusable with MBC)
            case 2: return 1;    // 8KB (1 bank)
            case 3: return 4;    // 32KB (4 banks)
            case 4: return 16;   // 128KB (16 banks)
            case 5: return 8;    // 64KB (8 banks)
            default: return 0;
        }
    }
    
    cartridgeHasBattery() {
        return [0x03, 0x06, 0x09, 0x0D, 0x0F, 0x10, 0x13, 0x1B, 0x1E, 0x22, 0xFF].includes(this.cartridgeType);
    }
    
    initializeRAM() {
        if (this.ramSize > 0) {
            this.ram = new Uint8Array(this.ramSize);
            this.ram.fill(0xFF); // Initialize with 0xFF (common for GameBoy RAM)
        }
    }
    
    setupMBC() {
        switch (this.cartridgeType) {
            case 0x00: // ROM ONLY
                this.mbc = new NoMBC(this);
                break;
                
            case 0x01: // MBC1
            case 0x02: // MBC1+RAM
            case 0x03: // MBC1+RAM+BATTERY
                this.mbc = new MBC1(this);
                break;
                
            case 0x05: // MBC2
            case 0x06: // MBC2+BATTERY
                this.mbc = new MBC2(this);
                break;
                
            case 0x0F: // MBC3+TIMER+BATTERY
            case 0x10: // MBC3+TIMER+RAM+BATTERY
            case 0x11: // MBC3
            case 0x12: // MBC3+RAM
            case 0x13: // MBC3+RAM+BATTERY
                this.mbc = new MBC3(this);
                break;
                
            case 0x19: // MBC5
            case 0x1A: // MBC5+RAM
            case 0x1B: // MBC5+RAM+BATTERY
            case 0x1C: // MBC5+RUMBLE
            case 0x1D: // MBC5+RUMBLE+RAM
            case 0x1E: // MBC5+RUMBLE+RAM+BATTERY
                this.mbc = new MBC5(this);
                break;
                
            default:
                console.warn(`Unsupported cartridge type: 0x${this.cartridgeType.toString(16)}`);
                this.mbc = new NoMBC(this);
                break;
        }
    }
    
    read(address) {
        return this.mbc ? this.mbc.read(address) : 0xFF;
    }
    
    write(address, value) {
        if (this.mbc) {
            this.mbc.write(address, value);
        }
    }
    
    getSaveData() {
        if (this.hasBattery && this.ram) {
            return this.ram.slice();
        }
        return null;
    }
    
    loadSaveData() {
        if (this.hasBattery && this.title) {
            const saveKey = `gameboy_save_${this.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const savedData = localStorage.getItem(saveKey);
            
            if (savedData) {
                try {
                    const data = JSON.parse(savedData);
                    if (this.ram && data.length === this.ram.length) {
                        this.ram.set(data);
                        console.log('Loaded save data');
                    }
                } catch (e) {
                    console.warn('Failed to load save data:', e);
                }
            }
        }
    }
    
    saveToBattery() {
        if (this.hasBattery && this.ram && this.title) {
            const saveKey = `gameboy_save_${this.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const data = Array.from(this.ram);
            localStorage.setItem(saveKey, JSON.stringify(data));
            console.log('Save data written to battery backup');
        }
    }
    
    reset() {
        this.romBank = 1;
        this.ramBank = 0;
        this.ramEnabled = false;
        this.bankingMode = 0;
        
        if (this.mbc) {
            this.mbc.reset();
        }
    }
    
    getInfo() {
        return {
            title: this.title,
            cartridgeType: this.cartridgeType,
            romSize: this.romSize,
            ramSize: this.ramSize,
            romBanks: this.romBankCount,
            ramBanks: this.ramBankCount,
            hasBattery: this.hasBattery,
            currentRomBank: this.romBank,
            currentRamBank: this.ramBank,
            ramEnabled: this.ramEnabled
        };
    }
}

/**
 * Base Memory Bank Controller class
 */
class BaseMBC {
    constructor(cartridge) {
        this.cartridge = cartridge;
    }
    
    read(address) {
        // Default implementation
        if (address < 0x8000) {
            return this.cartridge.rom[address] || 0xFF;
        }
        
        if (address >= 0xA000 && address < 0xC000) {
            return 0xFF; // No RAM
        }
        
        return 0xFF;
    }
    
    write(address, value) {
        // Default implementation - do nothing
    }
    
    reset() {
        // Default implementation
    }
}

/**
 * No MBC - Simple ROM only cartridge
 */
class NoMBC extends BaseMBC {
    read(address) {
        if (address < 0x8000) {
            return this.cartridge.rom[address] || 0xFF;
        }
        return 0xFF;
    }
    
    write(address, value) {
        // ROM only cartridges don't respond to writes
    }
}

/**
 * MBC1 - Memory Bank Controller 1
 */
class MBC1 extends BaseMBC {
    constructor(cartridge) {
        super(cartridge);
        this.ramEnabled = false;
        this.romBank = 1;
        this.ramBank = 0;
        this.bankingMode = 0; // 0 = ROM banking, 1 = RAM banking
    }
    
    read(address) {
        if (address < 0x4000) {
            // ROM Bank 0 (or banks 0x00, 0x20, 0x40, 0x60 in mode 1)
            let bank = 0;
            if (this.bankingMode === 1 && this.cartridge.romBankCount > 32) {
                bank = (this.ramBank << 5);
            }
            return this.cartridge.rom[address + (bank * 0x4000)] || 0xFF;
        }
        
        if (address < 0x8000) {
            // ROM Bank 1-127
            let bank = this.romBank;
            if (this.bankingMode === 1 && this.cartridge.romBankCount > 32) {
                bank |= (this.ramBank << 5);
            }
            const romAddress = address - 0x4000 + (bank * 0x4000);
            return this.cartridge.rom[romAddress] || 0xFF;
        }
        
        if (address >= 0xA000 && address < 0xC000) {
            // RAM Bank 0-3
            if (!this.ramEnabled || !this.cartridge.ram) {
                return 0xFF;
            }
            
            let bank = 0;
            if (this.bankingMode === 1) {
                bank = this.ramBank;
            }
            
            const ramAddress = address - 0xA000 + (bank * 0x2000);
            return this.cartridge.ram[ramAddress] || 0xFF;
        }
        
        return 0xFF;
    }
    
    write(address, value) {
        if (address < 0x2000) {
            // RAM Enable (0x0000-0x1FFF)
            this.ramEnabled = (value & 0x0F) === 0x0A;
        } else if (address < 0x4000) {
            // ROM Bank Number (0x2000-0x3FFF)
            this.romBank = (value & 0x1F);
            if (this.romBank === 0) {
                this.romBank = 1; // Bank 0 maps to bank 1
            }
        } else if (address < 0x6000) {
            // RAM Bank Number / Upper ROM Bank (0x4000-0x5FFF)
            this.ramBank = value & 0x03;
        } else if (address < 0x8000) {
            // Banking Mode Select (0x6000-0x7FFF)
            this.bankingMode = value & 0x01;
        } else if (address >= 0xA000 && address < 0xC000) {
            // RAM Write (0xA000-0xBFFF)
            if (this.ramEnabled && this.cartridge.ram) {
                let bank = 0;
                if (this.bankingMode === 1) {
                    bank = this.ramBank;
                }
                
                const ramAddress = address - 0xA000 + (bank * 0x2000);
                if (ramAddress < this.cartridge.ram.length) {
                    this.cartridge.ram[ramAddress] = value;
                }
            }
        }
    }
    
    reset() {
        this.ramEnabled = false;
        this.romBank = 1;
        this.ramBank = 0;
        this.bankingMode = 0;
    }
}

/**
 * MBC2 - Memory Bank Controller 2
 */
class MBC2 extends BaseMBC {
    constructor(cartridge) {
        super(cartridge);
        this.ramEnabled = false;
        this.romBank = 1;
        // MBC2 has built-in 512x4bit RAM
        this.internalRam = new Uint8Array(0x200);
        this.internalRam.fill(0x0F);
    }
    
    read(address) {
        if (address < 0x4000) {
            // ROM Bank 0
            return this.cartridge.rom[address] || 0xFF;
        }
        
        if (address < 0x8000) {
            // ROM Bank 1-15
            const romAddress = address - 0x4000 + (this.romBank * 0x4000);
            return this.cartridge.rom[romAddress] || 0xFF;
        }
        
        if (address >= 0xA000 && address < 0xA200) {
            // Internal RAM (512 x 4-bit)
            if (!this.ramEnabled) {
                return 0xFF;
            }
            return this.internalRam[address - 0xA000] | 0xF0; // Upper 4 bits always set
        }
        
        return 0xFF;
    }
    
    write(address, value) {
        if (address < 0x4000) {
            if (address & 0x0100) {
                // ROM Bank Number (when bit 8 of address is set)
                this.romBank = (value & 0x0F);
                if (this.romBank === 0) {
                    this.romBank = 1;
                }
            } else {
                // RAM Enable (when bit 8 of address is clear)
                this.ramEnabled = (value & 0x0F) === 0x0A;
            }
        } else if (address >= 0xA000 && address < 0xA200) {
            // Internal RAM write
            if (this.ramEnabled) {
                this.internalRam[address - 0xA000] = value & 0x0F;
            }
        }
    }
    
    reset() {
        this.ramEnabled = false;
        this.romBank = 1;
    }
}

/**
 * MBC3 - Memory Bank Controller 3 (with optional RTC)
 */
class MBC3 extends BaseMBC {
    constructor(cartridge) {
        super(cartridge);
        this.ramEnabled = false;
        this.romBank = 1;
        this.ramRtcBank = 0;
        
        // RTC (Real Time Clock) registers
        this.rtc = {
            seconds: 0,
            minutes: 0,
            hours: 0,
            daysLow: 0,
            daysHigh: 0,
            halt: false,
            dayCarry: false
        };
        
        this.rtcLatch = 0;
        this.rtcLatched = { ...this.rtc };
    }
    
    read(address) {
        if (address < 0x4000) {
            // ROM Bank 0
            return this.cartridge.rom[address] || 0xFF;
        }
        
        if (address < 0x8000) {
            // ROM Bank 1-127
            const romAddress = address - 0x4000 + (this.romBank * 0x4000);
            return this.cartridge.rom[romAddress] || 0xFF;
        }
        
        if (address >= 0xA000 && address < 0xC000) {
            if (!this.ramEnabled) {
                return 0xFF;
            }
            
            if (this.ramRtcBank <= 3) {
                // RAM Bank 0-3
                if (!this.cartridge.ram) return 0xFF;
                const ramAddress = address - 0xA000 + (this.ramRtcBank * 0x2000);
                return this.cartridge.ram[ramAddress] || 0xFF;
            } else {
                // RTC Register
                return this.readRTC();
            }
        }
        
        return 0xFF;
    }
    
    write(address, value) {
        if (address < 0x2000) {
            // RAM/RTC Enable
            this.ramEnabled = (value & 0x0F) === 0x0A;
        } else if (address < 0x4000) {
            // ROM Bank Number
            this.romBank = value & 0x7F;
            if (this.romBank === 0) {
                this.romBank = 1;
            }
        } else if (address < 0x6000) {
            // RAM Bank / RTC Register Select
            this.ramRtcBank = value;
        } else if (address < 0x8000) {
            // Latch Clock Data
            if (this.rtcLatch === 0 && value === 1) {
                this.latchRTC();
            }
            this.rtcLatch = value;
        } else if (address >= 0xA000 && address < 0xC000) {
            if (!this.ramEnabled) return;
            
            if (this.ramRtcBank <= 3) {
                // RAM Write
                if (!this.cartridge.ram) return;
                const ramAddress = address - 0xA000 + (this.ramRtcBank * 0x2000);
                if (ramAddress < this.cartridge.ram.length) {
                    this.cartridge.ram[ramAddress] = value;
                }
            } else {
                // RTC Write
                this.writeRTC(value);
            }
        }
    }
    
    readRTC() {
        switch (this.ramRtcBank) {
            case 0x08: return this.rtcLatched.seconds;
            case 0x09: return this.rtcLatched.minutes;
            case 0x0A: return this.rtcLatched.hours;
            case 0x0B: return this.rtcLatched.daysLow;
            case 0x0C: return this.rtcLatched.daysHigh | (this.rtcLatched.halt ? 0x40 : 0) | (this.rtcLatched.dayCarry ? 0x80 : 0);
            default: return 0xFF;
        }
    }
    
    writeRTC(value) {
        switch (this.ramRtcBank) {
            case 0x08: this.rtc.seconds = value & 0x3F; break;
            case 0x09: this.rtc.minutes = value & 0x3F; break;
            case 0x0A: this.rtc.hours = value & 0x1F; break;
            case 0x0B: this.rtc.daysLow = value; break;
            case 0x0C:
                this.rtc.daysHigh = value & 0x01;
                this.rtc.halt = (value & 0x40) !== 0;
                this.rtc.dayCarry = (value & 0x80) !== 0;
                break;
        }
    }
    
    latchRTC() {
        this.rtcLatched = { ...this.rtc };
    }
    
    reset() {
        this.ramEnabled = false;
        this.romBank = 1;
        this.ramRtcBank = 0;
        this.rtcLatch = 0;
    }
}

/**
 * MBC5 - Memory Bank Controller 5
 */
class MBC5 extends BaseMBC {
    constructor(cartridge) {
        super(cartridge);
        this.ramEnabled = false;
        this.romBankLow = 1;
        this.romBankHigh = 0;
        this.ramBank = 0;
    }
    
    get romBank() {
        return this.romBankLow | (this.romBankHigh << 8);
    }
    
    read(address) {
        if (address < 0x4000) {
            // ROM Bank 0
            return this.cartridge.rom[address] || 0xFF;
        }
        
        if (address < 0x8000) {
            // ROM Bank 1-511
            const romAddress = address - 0x4000 + (this.romBank * 0x4000);
            return this.cartridge.rom[romAddress] || 0xFF;
        }
        
        if (address >= 0xA000 && address < 0xC000) {
            // RAM Bank 0-15
            if (!this.ramEnabled || !this.cartridge.ram) {
                return 0xFF;
            }
            
            const ramAddress = address - 0xA000 + (this.ramBank * 0x2000);
            return this.cartridge.ram[ramAddress] || 0xFF;
        }
        
        return 0xFF;
    }
    
    write(address, value) {
        if (address < 0x2000) {
            // RAM Enable
            this.ramEnabled = (value & 0x0F) === 0x0A;
        } else if (address < 0x3000) {
            // ROM Bank Number Low 8 bits
            this.romBankLow = value;
        } else if (address < 0x4000) {
            // ROM Bank Number High bit
            this.romBankHigh = value & 0x01;
        } else if (address < 0x6000) {
            // RAM Bank Number
            this.ramBank = value & 0x0F;
        } else if (address >= 0xA000 && address < 0xC000) {
            // RAM Write
            if (this.ramEnabled && this.cartridge.ram) {
                const ramAddress = address - 0xA000 + (this.ramBank * 0x2000);
                if (ramAddress < this.cartridge.ram.length) {
                    this.cartridge.ram[ramAddress] = value;
                }
            }
        }
    }
    
    reset() {
        this.ramEnabled = false;
        this.romBankLow = 1;
        this.romBankHigh = 0;
        this.ramBank = 0;
    }
}