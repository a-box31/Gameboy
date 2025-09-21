// Screen device
class Screen {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  pixelSize: number;
  imageData?: ImageData;

  constructor(canvas: HTMLCanvasElement, pixelSize: number) {
    this.context = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.canvas = canvas;
    this.pixelSize = pixelSize || 1;
    this.initImageData();
  }

  // Palette colors (RGB)
  static colors = [
    [0xff, 0xff, 0xff], // white
    [0xaa, 0xaa, 0xaa], // light gray
    [0x55, 0x55, 0x55], // dark gray
    [0x00, 0x00, 0x00], // black
  ];

  static physics = {
    WIDTH: 160,
    HEIGHT: 144,
    FREQUENCY: 60,
  };

  setPixelSize(pixelSize: number) {
    this.pixelSize = pixelSize;
    this.initImageData();
  }

  initImageData() {
    this.canvas.width = Screen.physics.WIDTH * this.pixelSize;
    this.canvas.height = Screen.physics.HEIGHT * this.pixelSize;
    this.imageData = this.context.createImageData(
      this.canvas.width,
      this.canvas.height
    );
    for (let i = 0; i < this.imageData.data.length; i++) {
      this.imageData.data[i] = 255;
    }
  }

  clearScreen() {
    this.context.fillStyle = "#FFF";
    this.context.fillRect(
      0,
      0,
      Screen.physics.WIDTH * this.pixelSize,
      Screen.physics.HEIGHT * this.pixelSize
    );
  }

  fillImageData(buffer: Uint8Array) {
    for (let y = 0; y < Screen.physics.HEIGHT; y++) {
      for (let py = 0; py < this.pixelSize; py++) {
        const yOffset = (y * this.pixelSize + py) * this.canvas.width;
        for (let x = 0; x < Screen.physics.WIDTH; x++) {
          for (let px = 0; px < this.pixelSize; px++) {
            const offset = yOffset + (x * this.pixelSize + px);
            const v = Screen.colors[buffer[y * Screen.physics.WIDTH + x] | 0];
            // set RGB values
            if(this.imageData){
              this.imageData.data[offset * 4] = v[0];
              this.imageData.data[offset * 4 + 1] = v[1];
              this.imageData.data[offset * 4 + 2] = v[2];
            }
          }
        }
      }
    }
  }

  render(buffer: Uint8Array) {
    this.fillImageData(buffer);
    this.context.putImageData(this.imageData!, 0, 0);
  }
}

export default Screen;
