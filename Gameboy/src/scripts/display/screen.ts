// Game Boy Screen implementation
class Screen {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  imageData: ImageData;
  pixelData: Uint8ClampedArray;
  pixelSize: number;

  // Screen dimensions
  static WIDTH = 160;
  static HEIGHT = 144;
  
  // Physics constants
  static physics = {
    FREQUENCY: 60 // 60 FPS
  };

  constructor(canvas: HTMLCanvasElement, pixelSize: number = 1) {
    this.canvas = canvas;
    this.pixelSize = pixelSize;
    
    // Set canvas size
    this.canvas.width = Screen.WIDTH * pixelSize;
    this.canvas.height = Screen.HEIGHT * pixelSize;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.context = context;

    // Disable image smoothing for pixel-perfect rendering
    this.context.imageSmoothingEnabled = false;

    // Create image data for direct pixel manipulation
    this.imageData = this.context.createImageData(Screen.WIDTH, Screen.HEIGHT);
    this.pixelData = this.imageData.data;

    // Initialize with white background
    this.clear();
  }

  // Clear the screen to white
  clear() {
    for (let i = 0; i < this.pixelData.length; i += 4) {
      this.pixelData[i] = 255;     // Red
      this.pixelData[i + 1] = 255; // Green
      this.pixelData[i + 2] = 255; // Blue
      this.pixelData[i + 3] = 255; // Alpha
    }
  }

  // Set a pixel at the given coordinates
  setPixel(x: number, y: number, shade: number) {
    if (x < 0 || x >= Screen.WIDTH || y < 0 || y >= Screen.HEIGHT) {
      return;
    }

    const index = (y * Screen.WIDTH + x) * 4;
    
    // Convert Game Boy shade to RGB
    const color = this.shadeToRGB(shade);
    
    this.pixelData[index] = color.r;     // Red
    this.pixelData[index + 1] = color.g; // Green
    this.pixelData[index + 2] = color.b; // Blue
    this.pixelData[index + 3] = 255;     // Alpha (fully opaque)
  }

  // Get a pixel value at the given coordinates
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= Screen.WIDTH || y < 0 || y >= Screen.HEIGHT) {
      return 255; // Return white for out-of-bounds
    }

    const index = (y * Screen.WIDTH + x) * 4;
    const r = this.pixelData[index];
    
    // Convert RGB back to Game Boy shade
    return this.rgbToShade(r);
  }

  // Render the current frame to the canvas
  render() {
    // Create a temporary canvas for the actual Game Boy resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Screen.WIDTH;
    tempCanvas.height = Screen.HEIGHT;
    const tempContext = tempCanvas.getContext('2d');
    
    if (!tempContext) {
      return;
    }

    // Put the image data to the temporary canvas
    tempContext.putImageData(this.imageData, 0, 0);

    // Clear the main canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Scale and draw to the main canvas
    this.context.drawImage(
      tempCanvas,
      0, 0, Screen.WIDTH, Screen.HEIGHT,
      0, 0, this.canvas.width, this.canvas.height
    );
  }

  // Convert Game Boy shade (0-255) to RGB color
  private shadeToRGB(shade: number): { r: number, g: number, b: number } {
    // Game Boy has 4 shades of green
    const greenShades = [
      { r: 224, g: 248, b: 208 }, // Lightest green (white)
      { r: 136, g: 192, b: 112 }, // Light green
      { r: 52, g: 104, b: 86 },   // Dark green
      { r: 8, g: 24, b: 32 }      // Darkest green (black)
    ];

    // Map the shade value to one of the 4 Game Boy colors
    let colorIndex: number;
    if (shade >= 192) {
      colorIndex = 0; // Lightest
    } else if (shade >= 128) {
      colorIndex = 1; // Light
    } else if (shade >= 64) {
      colorIndex = 2; // Dark
    } else {
      colorIndex = 3; // Darkest
    }

    return greenShades[colorIndex];
  }

  // Convert RGB back to Game Boy shade value
  private rgbToShade(r: number): number {
    // Approximate conversion back to shade
    if (r >= 192) return 255;
    if (r >= 128) return 192;
    if (r >= 64) return 96;
    return 0;
  }

  // Set the pixel size for scaling
  setPixelSize(size: number) {
    this.pixelSize = size;
    this.canvas.width = Screen.WIDTH * size;
    this.canvas.height = Screen.HEIGHT * size;
    
    // Disable image smoothing for pixel-perfect rendering
    this.context.imageSmoothingEnabled = false;
  }

  // Get canvas dimensions
  getCanvasWidth(): number {
    return this.canvas.width;
  }

  getCanvasHeight(): number {
    return this.canvas.height;
  }

  // Get screen dimensions
  getScreenWidth(): number {
    return Screen.WIDTH;
  }

  getScreenHeight(): number {
    return Screen.HEIGHT;
  }

  // Fill a rectangular area with a specific shade
  fillRect(x: number, y: number, width: number, height: number, shade: number) {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.setPixel(x + dx, y + dy, shade);
      }
    }
  }

  // Draw a horizontal line
  drawHorizontalLine(x: number, y: number, length: number, shade: number) {
    for (let i = 0; i < length; i++) {
      this.setPixel(x + i, y, shade);
    }
  }

  // Draw a vertical line
  drawVerticalLine(x: number, y: number, length: number, shade: number) {
    for (let i = 0; i < length; i++) {
      this.setPixel(x, y + i, shade);
    }
  }

  // Take a screenshot of the current screen
  takeScreenshot(): string {
    // Create a temporary canvas with the current frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Screen.WIDTH;
    tempCanvas.height = Screen.HEIGHT;
    const tempContext = tempCanvas.getContext('2d');
    
    if (!tempContext) {
      return '';
    }

    tempContext.putImageData(this.imageData, 0, 0);
    return tempCanvas.toDataURL('image/png');
  }

  // Reset the screen
  reset() {
    this.clear();
    this.render();
  }
}

export default Screen;
