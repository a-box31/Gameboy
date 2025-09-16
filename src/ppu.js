/**
 * GameBoy Picture Processing Unit (PPU)
 * Handles 160x144 display rendering, sprites, and LCD modes
 */
class PPU {
    constructor(mmu) {
        this.mmu = mmu;
        
        // Display dimensions
        this.SCREEN_WIDTH = 160;
        this.SCREEN_HEIGHT = 144;
        
        // LCD timing constants
        this.MODE_DURATIONS = {
            H_BLANK: 204,     // Mode 0: H-Blank
            V_BLANK: 456,     // Mode 1: V-Blank
            OAM_SCAN: 80,     // Mode 2: OAM Scan
            DRAWING: 172      // Mode 3: Drawing
        };
        
        // State
        this.cycles = 0;
        this.currentLine = 0;
        this.mode = 2; // Start in OAM scan mode
        
        // Frame buffer (RGBA format)
        this.frameBuffer = new Uint8Array(this.SCREEN_WIDTH * this.SCREEN_HEIGHT * 4);
        
        // Color palettes (GameBoy green shades)
        this.colors = [
            [155, 188, 15, 255],   // Lightest green
            [139, 172, 15, 255],   // Light green
            [48, 98, 48, 255],     // Dark green
            [15, 56, 15, 255]      // Darkest green
        ];
        
        // Sprite buffer for current scanline
        this.sprites = [];
        
        // Background/Window buffers
        this.backgroundBuffer = new Uint8Array(this.SCREEN_WIDTH);
        this.windowBuffer = new Uint8Array(this.SCREEN_WIDTH);
        
        // Canvas context (will be set by main)
        this.canvas = null;
        this.ctx = null;
        
        this.frameComplete = false;
    }
    
    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.imageData = this.ctx.createImageData(this.SCREEN_WIDTH, this.SCREEN_HEIGHT);
    }
    
    step(cycles) {
        // Don't update if LCD is disabled
        if (!this.isLCDEnabled()) {
            return;
        }
        
        this.cycles += cycles;
        
        switch (this.mode) {
            case 2: // OAM Scan
                if (this.cycles >= this.MODE_DURATIONS.OAM_SCAN) {
                    this.cycles -= this.MODE_DURATIONS.OAM_SCAN;
                    this.mode = 3;
                    this.scanOAM();
                    this.setLCDMode(3);
                }
                break;
                
            case 3: // Drawing
                if (this.cycles >= this.MODE_DURATIONS.DRAWING) {
                    this.cycles -= this.MODE_DURATIONS.DRAWING;
                    this.mode = 0;
                    this.renderScanline();
                    this.setLCDMode(0);
                    
                    // Check for STAT interrupt
                    if (this.mmu.io[0x41] & 0x08) { // H-Blank interrupt enabled
                        this.mmu.IF |= 0x02; // STAT interrupt
                    }
                }
                break;
                
            case 0: // H-Blank
                if (this.cycles >= this.MODE_DURATIONS.H_BLANK) {
                    this.cycles -= this.MODE_DURATIONS.H_BLANK;
                    this.currentLine++;
                    this.mmu.io[0x44] = this.currentLine; // Update LY register
                    
                    this.checkLYC(); // Check LY=LYC coincidence
                    
                    if (this.currentLine === 144) {
                        // Enter V-Blank
                        this.mode = 1;
                        this.setLCDMode(1);
                        this.mmu.IF |= 0x01; // V-Blank interrupt
                        
                        // Check for STAT interrupt
                        if (this.mmu.io[0x41] & 0x10) { // V-Blank interrupt enabled
                            this.mmu.IF |= 0x02; // STAT interrupt
                        }
                        
                        this.presentFrame();
                        this.frameComplete = true;
                    } else {
                        // Next scanline
                        this.mode = 2;
                        this.setLCDMode(2);
                        
                        // Check for STAT interrupt
                        if (this.mmu.io[0x41] & 0x20) { // OAM interrupt enabled
                            this.mmu.IF |= 0x02; // STAT interrupt
                        }
                    }
                }
                break;
                
            case 1: // V-Blank
                if (this.cycles >= this.MODE_DURATIONS.V_BLANK) {
                    this.cycles -= this.MODE_DURATIONS.V_BLANK;
                    this.currentLine++;
                    this.mmu.io[0x44] = this.currentLine; // Update LY register
                    
                    this.checkLYC(); // Check LY=LYC coincidence
                    
                    if (this.currentLine === 154) {
                        // Return to OAM scan for line 0
                        this.currentLine = 0;
                        this.mmu.io[0x44] = 0;
                        this.mode = 2;
                        this.setLCDMode(2);
                        this.frameComplete = false;
                        
                        // Check for STAT interrupt
                        if (this.mmu.io[0x41] & 0x20) { // OAM interrupt enabled
                            this.mmu.IF |= 0x02; // STAT interrupt
                        }
                    }
                }
                break;
        }
    }
    
    isLCDEnabled() {
        return (this.mmu.io[0x40] & 0x80) !== 0;
    }
    
    setLCDMode(mode) {
        this.mmu.io[0x41] = (this.mmu.io[0x41] & 0xFC) | (mode & 0x03);
    }
    
    checkLYC() {
        const lyc = this.mmu.io[0x45];
        const coincidence = this.currentLine === lyc;
        
        if (coincidence) {
            this.mmu.io[0x41] |= 0x04; // Set coincidence flag
            
            // Check for LYC=LY interrupt
            if (this.mmu.io[0x41] & 0x40) {
                this.mmu.IF |= 0x02; // STAT interrupt
            }
        } else {
            this.mmu.io[0x41] &= ~0x04; // Clear coincidence flag
        }
    }
    
    scanOAM() {
        this.sprites = [];
        
        // Scan OAM for sprites on current line
        for (let i = 0; i < 40; i++) {
            const spriteY = this.mmu.oam[i * 4] - 16;
            const spriteHeight = (this.mmu.io[0x40] & 0x04) ? 16 : 8; // LCDC bit 2
            
            // Check if sprite is on current line
            if (this.currentLine >= spriteY && this.currentLine < spriteY + spriteHeight) {
                const sprite = {
                    x: this.mmu.oam[i * 4 + 1] - 8,
                    y: spriteY,
                    tile: this.mmu.oam[i * 4 + 2],
                    attributes: this.mmu.oam[i * 4 + 3],
                    oamIndex: i
                };
                
                // 8x16 sprites use tiles in pairs
                if (spriteHeight === 16) {
                    sprite.tile &= 0xFE; // Clear LSB for 8x16 sprites
                }
                
                this.sprites.push(sprite);
                
                // GameBoy only renders 10 sprites per line
                if (this.sprites.length >= 10) {
                    break;
                }
            }
        }
        
        // Sort sprites by X coordinate (priority)
        this.sprites.sort((a, b) => {
            if (a.x !== b.x) return a.x - b.x;
            return a.oamIndex - b.oamIndex; // OAM index as tiebreaker
        });
    }
    
    renderScanline() {
        const y = this.currentLine;
        const lcdc = this.mmu.io[0x40];
        
        // Clear scanline buffers
        this.backgroundBuffer.fill(0);
        this.windowBuffer.fill(0);
        
        // Render background
        if (lcdc & 0x01) { // BG enabled
            this.renderBackground(y);
        }
        
        // Render window
        if ((lcdc & 0x20) && this.mmu.io[0x4A] <= y) { // Window enabled and visible
            this.renderWindow(y);
        }
        
        // Render sprites
        if (lcdc & 0x02) { // Sprites enabled
            this.renderSprites(y);
        }
        
        // Compose final line
        this.composeScanline(y);
    }
    
    renderBackground(y) {
        const lcdc = this.mmu.io[0x40];
        const scrollX = this.mmu.io[0x43];
        const scrollY = this.mmu.io[0x42];
        
        // Background tile map (0x9800-0x9BFF or 0x9C00-0x9FFF)
        const tileMapBase = (lcdc & 0x08) ? 0x9C00 : 0x9800;
        
        // Background tile data (0x8000-0x8FFF or 0x8800-0x97FF)
        const tileDataBase = (lcdc & 0x10) ? 0x8000 : 0x8800;
        const unsignedTileData = (lcdc & 0x10) !== 0;
        
        const mapY = ((y + scrollY) & 0xFF) >> 3; // Which tile row
        const tileY = (y + scrollY) & 7; // Which row in the tile
        
        for (let x = 0; x < this.SCREEN_WIDTH; x++) {
            const mapX = ((x + scrollX) & 0xFF) >> 3; // Which tile column
            const tileX = (x + scrollX) & 7; // Which column in the tile
            
            // Get tile index from tile map
            const tileMapAddr = tileMapBase + (mapY * 32) + mapX;
            let tileIndex = this.mmu.read8(tileMapAddr);
            
            // Handle signed tile indices
            if (!unsignedTileData && tileIndex < 128) {
                tileIndex += 256;
            }
            
            // Get pixel from tile data
            const tileAddr = tileDataBase + (tileIndex * 16) + (tileY * 2);
            const byte1 = this.mmu.read8(tileAddr);
            const byte2 = this.mmu.read8(tileAddr + 1);
            
            const bit = 7 - tileX;
            const colorIndex = ((byte2 >> bit) & 1) << 1 | ((byte1 >> bit) & 1);
            
            this.backgroundBuffer[x] = colorIndex;
        }
    }
    
    renderWindow(y) {
        const lcdc = this.mmu.io[0x40];
        const windowX = this.mmu.io[0x4B] - 7;
        const windowY = this.mmu.io[0x4A];
        
        if (windowX >= this.SCREEN_WIDTH || y < windowY) {
            return;
        }
        
        // Window tile map (0x9800-0x9BFF or 0x9C00-0x9FFF)
        const tileMapBase = (lcdc & 0x40) ? 0x9C00 : 0x9800;
        
        // Window tile data (same as background)
        const tileDataBase = (lcdc & 0x10) ? 0x8000 : 0x8800;
        const unsignedTileData = (lcdc & 0x10) !== 0;
        
        const mapY = ((y - windowY) >> 3); // Which tile row
        const tileY = (y - windowY) & 7; // Which row in the tile
        
        for (let x = Math.max(0, windowX); x < this.SCREEN_WIDTH; x++) {
            const mapX = ((x - windowX) >> 3); // Which tile column
            const tileX = (x - windowX) & 7; // Which column in the tile
            
            // Get tile index from tile map
            const tileMapAddr = tileMapBase + (mapY * 32) + mapX;
            let tileIndex = this.mmu.read8(tileMapAddr);
            
            // Handle signed tile indices
            if (!unsignedTileData && tileIndex < 128) {
                tileIndex += 256;
            }
            
            // Get pixel from tile data
            const tileAddr = tileDataBase + (tileIndex * 16) + (tileY * 2);
            const byte1 = this.mmu.read8(tileAddr);
            const byte2 = this.mmu.read8(tileAddr + 1);
            
            const bit = 7 - tileX;
            const colorIndex = ((byte2 >> bit) & 1) << 1 | ((byte1 >> bit) & 1);
            
            this.windowBuffer[x] = colorIndex;
        }
    }
    
    renderSprites(y) {
        const spriteHeight = (this.mmu.io[0x40] & 0x04) ? 16 : 8;
        
        // Render sprites from right to left for priority
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const sprite = this.sprites[i];
            
            if (sprite.x < -7 || sprite.x >= this.SCREEN_WIDTH) {
                continue;
            }
            
            const spriteY = y - sprite.y;
            const flipY = (sprite.attributes & 0x40) !== 0;
            const flipX = (sprite.attributes & 0x20) !== 0;
            const palette = (sprite.attributes & 0x10) ? 0x49 : 0x48; // OBP1 or OBP0
            const priority = (sprite.attributes & 0x80) === 0; // 0 = above BG, 1 = behind BG
            
            let tileRow = flipY ? (spriteHeight - 1 - spriteY) : spriteY;
            
            // Get tile data address
            const tileAddr = 0x8000 + (sprite.tile * 16) + (tileRow * 2);
            const byte1 = this.mmu.read8(tileAddr);
            const byte2 = this.mmu.read8(tileAddr + 1);
            
            for (let px = 0; px < 8; px++) {
                const screenX = sprite.x + px;
                
                if (screenX < 0 || screenX >= this.SCREEN_WIDTH) {
                    continue;
                }
                
                const bit = flipX ? px : (7 - px);
                const colorIndex = ((byte2 >> bit) & 1) << 1 | ((byte1 >> bit) & 1);
                
                // Color 0 is transparent for sprites
                if (colorIndex === 0) {
                    continue;
                }
                
                // Check sprite priority
                if (!priority && this.backgroundBuffer[screenX] !== 0) {
                    continue; // Sprite is behind non-transparent background
                }
                
                // Write sprite pixel to frame buffer
                const paletteData = this.mmu.io[palette];
                const finalColor = (paletteData >> (colorIndex * 2)) & 0x03;
                this.writePixel(screenX, y, finalColor);
            }
        }
    }
    
    composeScanline(y) {
        const bgp = this.mmu.io[0x47]; // Background palette
        
        for (let x = 0; x < this.SCREEN_WIDTH; x++) {
            let colorIndex;
            
            // Use window if it's enabled and visible at this position
            if (this.windowBuffer[x] !== 0 || 
                ((this.mmu.io[0x40] & 0x20) && x >= (this.mmu.io[0x4B] - 7) && y >= this.mmu.io[0x4A])) {
                colorIndex = this.windowBuffer[x];
            } else {
                colorIndex = this.backgroundBuffer[x];
            }
            
            // Apply background palette
            const finalColor = (bgp >> (colorIndex * 2)) & 0x03;
            
            // Only write if not already written by sprite
            if (!this.isPixelWritten(x, y)) {
                this.writePixel(x, y, finalColor);
            }
        }
    }
    
    writePixel(x, y, colorIndex) {
        const offset = (y * this.SCREEN_WIDTH + x) * 4;
        const color = this.colors[colorIndex];
        
        this.frameBuffer[offset] = color[0];     // R
        this.frameBuffer[offset + 1] = color[1]; // G
        this.frameBuffer[offset + 2] = color[2]; // B
        this.frameBuffer[offset + 3] = color[3]; // A
    }
    
    isPixelWritten(x, y) {
        const offset = (y * this.SCREEN_WIDTH + x) * 4;
        // Check if pixel has been written (alpha != 0)
        return this.frameBuffer[offset + 3] !== 0;
    }
    
    presentFrame() {
        if (this.ctx && this.imageData) {
            // Copy frame buffer to image data
            for (let i = 0; i < this.frameBuffer.length; i++) {
                this.imageData.data[i] = this.frameBuffer[i];
            }
            
            // Draw to canvas
            this.ctx.putImageData(this.imageData, 0, 0);
        }
        
        // Clear frame buffer for next frame
        this.frameBuffer.fill(0);
    }
    
    reset() {
        this.cycles = 0;
        this.currentLine = 0;
        this.mode = 2;
        this.frameBuffer.fill(0);
        this.frameComplete = false;
        
        // Reset LCD registers
        this.mmu.io[0x44] = 0; // LY
        this.setLCDMode(2);
    }
    
    // Debug helper
    getState() {
        return {
            cycles: this.cycles,
            currentLine: this.currentLine,
            mode: this.mode,
            lcdEnabled: this.isLCDEnabled(),
            spriteCount: this.sprites.length
        };
    }
}