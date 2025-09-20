import CPU from "../cpu";
import Screen from "./screen";

// Game Boy GPU (Picture Processing Unit) implementation
class GPU {
  screen: Screen;
  cpu: CPU;
  
  // GPU modes
  static MODE = {
    HBLANK: 0,
    VBLANK: 1,
    OAM: 2,
    VRAM: 3
  };

  // Screen dimensions
  static SCREEN_WIDTH = 160;
  static SCREEN_HEIGHT = 144;
  static TOTAL_SCANLINES = 154;

  // Timing constants (in CPU cycles)
  static TIMING = {
    HBLANK: 204,    // Mode 0
    VBLANK: 456,    // Mode 1  
    OAM: 80,        // Mode 2
    VRAM: 172       // Mode 3
  };

  // Current state
  mode: number = 0;
  modeClock: number = 0;
  line: number = 0;

  // Background scroll registers
  scrollX: number = 0;
  scrollY: number = 0;
  windowX: number = 0;
  windowY: number = 0;

  // Palettes
  backgroundPalette: number[] = [255, 192, 96, 0];
  spritePalette0: number[] = [255, 192, 96, 0];
  spritePalette1: number[] = [255, 192, 96, 0];

  // LCD Control flags
  lcdEnabled: boolean = true;
  windowTileMap: boolean = false;
  windowEnabled: boolean = false;
  backgroundTileData: boolean = true;
  backgroundTileMap: boolean = false;
  spriteSize: boolean = false;
  spritesEnabled: boolean = false;
  backgroundEnabled: boolean = true;

  constructor(screen: Screen, cpu: CPU) {
    this.screen = screen;
    this.cpu = cpu;
    this.reset();
  }

  reset() {
    this.mode = GPU.MODE.OAM;
    this.modeClock = 0;
    this.line = 0;
    
    this.scrollX = 0;
    this.scrollY = 0;
    this.windowX = 0;
    this.windowY = 0;

    // Default palette (white, light gray, dark gray, black)
    this.backgroundPalette = [255, 192, 96, 0];
    this.spritePalette0 = [255, 192, 96, 0];
    this.spritePalette1 = [255, 192, 96, 0];

    this.lcdEnabled = true;
    this.windowTileMap = false;
    this.windowEnabled = false;
    this.backgroundTileData = true;
    this.backgroundTileMap = false;
    this.spriteSize = false;
    this.spritesEnabled = false;
    this.backgroundEnabled = true;
  }

  // Update GPU state and handle mode transitions
  update(cycles: number): boolean {
    this.modeClock += cycles;
    let vblank = false;

    switch (this.mode) {
      case GPU.MODE.OAM:
        if (this.modeClock >= GPU.TIMING.OAM) {
          this.modeClock = 0;
          this.mode = GPU.MODE.VRAM;
        }
        break;

      case GPU.MODE.VRAM:
        if (this.modeClock >= GPU.TIMING.VRAM) {
          this.modeClock = 0;
          this.mode = GPU.MODE.HBLANK;
          
          // Render the current scanline
          this.renderScanline();
        }
        break;

      case GPU.MODE.HBLANK:
        if (this.modeClock >= GPU.TIMING.HBLANK) {
          this.modeClock = 0;
          this.line++;

          if (this.line === 143) {
            // Entering VBlank
            this.mode = GPU.MODE.VBLANK;
            this.screen.render();
            this.cpu.requestInterrupt(CPU.INTERRUPTS.VBLANK);
            vblank = true;
          } else {
            this.mode = GPU.MODE.OAM;
          }
        }
        break;

      case GPU.MODE.VBLANK:
        if (this.modeClock >= GPU.TIMING.VBLANK) {
          this.modeClock = 0;
          this.line++;

          if (this.line > 153) {
            // VBlank finished, return to first line
            this.mode = GPU.MODE.OAM;
            this.line = 0;
          }
        }
        break;
    }

    // Update LCD status register
    this.updateLCDStatus();

    return vblank;
  }

  // Render a single scanline
  renderScanline() {
    if (!this.lcdEnabled) {
      return;
    }

    // Clear the scanline
    for (let x = 0; x < GPU.SCREEN_WIDTH; x++) {
      this.screen.setPixel(x, this.line, this.backgroundPalette[0]);
    }

    // Render background
    if (this.backgroundEnabled) {
      this.renderBackground();
    }

    // Render window
    if (this.windowEnabled && this.line >= this.windowY) {
      this.renderWindow();
    }

    // Render sprites
    if (this.spritesEnabled) {
      this.renderSprites();
    }
  }

  // Render background tiles for current scanline
  renderBackground() {
    const tileMapBase = this.backgroundTileMap ? 0x9c00 : 0x9800;
    const tileDataBase = this.backgroundTileData ? 0x8000 : 0x8800;
    
    const y = (this.line + this.scrollY) & 255;
    const tileY = Math.floor(y / 8);
    const pixelY = y % 8;

    for (let x = 0; x < GPU.SCREEN_WIDTH; x++) {
      const pixelX = (x + this.scrollX) & 255;
      const tileX = Math.floor(pixelX / 8);
      const subPixelX = pixelX % 8;

      // Get tile number from tile map
      const tileMapAddr = tileMapBase + (tileY * 32) + tileX;
      let tileNum = this.cpu.memory.rb(tileMapAddr);

      // Adjust tile number for signed addressing mode
      if (!this.backgroundTileData && tileNum < 128) {
        tileNum += 256;
      }

      // Get tile data
      const tileAddr = tileDataBase + (tileNum * 16) + (pixelY * 2);
      const lowByte = this.cpu.memory.rb(tileAddr);
      const highByte = this.cpu.memory.rb(tileAddr + 1);

      // Extract pixel value
      const bit = 7 - subPixelX;
      const colorId = ((highByte >> bit) & 1) << 1 | ((lowByte >> bit) & 1);
      const color = this.backgroundPalette[colorId];

      this.screen.setPixel(x, this.line, color);
    }
  }

  // Render window tiles for current scanline
  renderWindow() {
    if (this.windowX > 166 || this.windowY > 143) {
      return;
    }

    const tileMapBase = this.windowTileMap ? 0x9c00 : 0x9800;
    const tileDataBase = this.backgroundTileData ? 0x8000 : 0x8800;
    
    const y = this.line - this.windowY;
    const tileY = Math.floor(y / 8);
    const pixelY = y % 8;

    const startX = Math.max(0, this.windowX - 7);

    for (let x = startX; x < GPU.SCREEN_WIDTH; x++) {
      const windowPixelX = x - (this.windowX - 7);
      const tileX = Math.floor(windowPixelX / 8);
      const subPixelX = windowPixelX % 8;

      // Get tile number from tile map
      const tileMapAddr = tileMapBase + (tileY * 32) + tileX;
      let tileNum = this.cpu.memory.rb(tileMapAddr);

      // Adjust tile number for signed addressing mode
      if (!this.backgroundTileData && tileNum < 128) {
        tileNum += 256;
      }

      // Get tile data
      const tileAddr = tileDataBase + (tileNum * 16) + (pixelY * 2);
      const lowByte = this.cpu.memory.rb(tileAddr);
      const highByte = this.cpu.memory.rb(tileAddr + 1);

      // Extract pixel value
      const bit = 7 - subPixelX;
      const colorId = ((highByte >> bit) & 1) << 1 | ((lowByte >> bit) & 1);
      const color = this.backgroundPalette[colorId];

      this.screen.setPixel(x, this.line, color);
    }
  }

  // Render sprites for current scanline
  renderSprites() {
    const spriteHeight = this.spriteSize ? 16 : 8;
    const sprites: any[] = [];

    // Collect sprites that intersect with current scanline
    for (let i = 0; i < 40; i++) {
      const spriteAddr = 0xfe00 + (i * 4);
      const y = this.cpu.memory.rb(spriteAddr) - 16;
      const x = this.cpu.memory.rb(spriteAddr + 1) - 8;
      const tileNum = this.cpu.memory.rb(spriteAddr + 2);
      const attributes = this.cpu.memory.rb(spriteAddr + 3);

      // Check if sprite intersects with current scanline
      if (this.line >= y && this.line < y + spriteHeight) {
        sprites.push({
          x: x,
          y: y,
          tileNum: tileNum,
          attributes: attributes
        });
      }
    }

    // Sort sprites by X position (Game Boy renders from right to left)
    sprites.sort((a, b) => a.x - b.x);

    // Render up to 10 sprites per scanline (Game Boy limitation)
    for (let i = 0; i < Math.min(sprites.length, 10); i++) {
      this.renderSprite(sprites[i], spriteHeight);
    }
  }

  // Render a single sprite
  renderSprite(sprite: any, spriteHeight: number) {
    const palette = (sprite.attributes & 0x10) ? this.spritePalette1 : this.spritePalette0;
    const flipX = (sprite.attributes & 0x20) !== 0;
    const flipY = (sprite.attributes & 0x40) !== 0;
    const priority = (sprite.attributes & 0x80) === 0;

    let pixelY = this.line - sprite.y;
    if (flipY) {
      pixelY = spriteHeight - 1 - pixelY;
    }

    const tileAddr = 0x8000 + (sprite.tileNum * 16) + (pixelY * 2);
    const lowByte = this.cpu.memory.rb(tileAddr);
    const highByte = this.cpu.memory.rb(tileAddr + 1);

    for (let pixelX = 0; pixelX < 8; pixelX++) {
      const x = sprite.x + pixelX;
      
      if (x < 0 || x >= GPU.SCREEN_WIDTH) {
        continue;
      }

      let bit = flipX ? pixelX : 7 - pixelX;
      const colorId = ((highByte >> bit) & 1) << 1 | ((lowByte >> bit) & 1);

      // Color 0 is transparent for sprites
      if (colorId === 0) {
        continue;
      }

      // Check sprite priority
      if (!priority) {
        const bgColor = this.screen.getPixel(x, this.line);
        if (bgColor !== this.backgroundPalette[0]) {
          continue;
        }
      }

      const color = palette[colorId];
      this.screen.setPixel(x, this.line, color);
    }
  }

  // Update LCD status register based on current state
  updateLCDStatus() {
    let status = this.cpu.memory.rb(0xff41) & 0xf8; // Keep upper 5 bits
    
    // Set mode bits
    status |= this.mode;

    // Set LYC=LY flag
    const lyc = this.cpu.memory.rb(0xff45);
    if (this.line === lyc) {
      status |= 0x04;
      
      // Check if LYC=LY interrupt is enabled
      if (status & 0x40) {
        this.cpu.requestInterrupt(CPU.INTERRUPTS.LCDC);
      }
    }

    // Update LY register
    this.cpu.memory.wb(0xff44, this.line);
    this.cpu.memory.wb(0xff41, status);
  }

  // Handle writes to LCD control register
  writeLCDC(value: number) {
    const oldLcdEnabled = this.lcdEnabled;
    
    this.lcdEnabled = (value & 0x80) !== 0;
    this.windowTileMap = (value & 0x40) !== 0;
    this.windowEnabled = (value & 0x20) !== 0;
    this.backgroundTileData = (value & 0x10) !== 0;
    this.backgroundTileMap = (value & 0x08) !== 0;
    this.spriteSize = (value & 0x04) !== 0;
    this.spritesEnabled = (value & 0x02) !== 0;
    this.backgroundEnabled = (value & 0x01) !== 0;

    // If LCD was turned off, reset GPU state
    if (oldLcdEnabled && !this.lcdEnabled) {
      this.mode = GPU.MODE.HBLANK;
      this.modeClock = 0;
      this.line = 0;
      this.screen.clear();
    }
  }

  // Handle writes to palette registers
  writeBGP(value: number) {
    this.backgroundPalette[0] = this.getShade(value & 0x03);
    this.backgroundPalette[1] = this.getShade((value >> 2) & 0x03);
    this.backgroundPalette[2] = this.getShade((value >> 4) & 0x03);
    this.backgroundPalette[3] = this.getShade((value >> 6) & 0x03);
  }

  writeOBP0(value: number) {
    this.spritePalette0[0] = this.getShade(value & 0x03);
    this.spritePalette0[1] = this.getShade((value >> 2) & 0x03);
    this.spritePalette0[2] = this.getShade((value >> 4) & 0x03);
    this.spritePalette0[3] = this.getShade((value >> 6) & 0x03);
  }

  writeOBP1(value: number) {
    this.spritePalette1[0] = this.getShade(value & 0x03);
    this.spritePalette1[1] = this.getShade((value >> 2) & 0x03);
    this.spritePalette1[2] = this.getShade((value >> 4) & 0x03);
    this.spritePalette1[3] = this.getShade((value >> 6) & 0x03);
  }

  // Convert Game Boy shade (0-3) to RGB value
  private getShade(shade: number): number {
    switch (shade) {
      case 0: return 255; // White
      case 1: return 192; // Light gray
      case 2: return 96;  // Dark gray
      case 3: return 0;   // Black
      default: return 255;
    }
  }

  // Handle scroll register writes
  writeScrollY(value: number) {
    this.scrollY = value;
  }

  writeScrollX(value: number) {
    this.scrollX = value;
  }

  writeWindowY(value: number) {
    this.windowY = value;
  }

  writeWindowX(value: number) {
    this.windowX = value;
  }

  // Get current GPU mode
  getMode(): number {
    return this.mode;
  }

  // Get current scanline
  getCurrentLine(): number {
    return this.line;
  }
}

export default GPU;
