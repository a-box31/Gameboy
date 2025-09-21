import React, {useState, useEffect, useRef} from 'react'
import RomFileReader from './scripts/rom/file_reader'
import { Gameboy, type GameboyOptions } from './scripts/gameboy'

import './App.scss'
import Keyboard from './scripts/input/keyboard';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [readers, setReaders] = useState<RomFileReader[]>([]);
  const [gameboy, setGameboy] = useState<Gameboy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (file) {
      setReaders([new RomFileReader(file)]);
    }
  }, [file]);

  useEffect(() => {
    if (canvasRef.current) {
      // Create the Gameboy instance
      const gb = new Gameboy(canvasRef.current as HTMLCanvasElement, {
        pad: { class: Keyboard, mapping: null },
        zoom: 1,
        romReaders: readers,
        statusContainerId: "status",
        gameNameContainerId: "game-name",
        errorContainerId: "error"
      } as GameboyOptions);
      setGameboy(gb);
    }
  }, [readers]);

  return (
    <>
      <div>
        <h1>Welcome to the Gameboy Emulator</h1>
        <h2>Start by loading a ROM</h2>
        <form>
          <label htmlFor="file">Choose a file:</label>
          <input
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                setFile(files[0]);
              } else {
                setFile(null);
              }
            }}
            type="file"
            id="file"
            name="file"
          />
          {/* <button onClick={ handleROMUpload} >Upload</button> */}
        </form>
        <div id="emulator">
          <div id="game-name-container"></div>
          <div id="status-container"></div>
          <canvas ref={canvasRef} id="screen" width="160" height="144"></canvas>
          <div id="error-container"></div>
        </div>
      </div>
    </>
  )
}

export default App
