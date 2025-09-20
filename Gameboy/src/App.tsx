import React, {useState, useEffect, useRef} from 'react'
import RomFileReader from './scripts/rom/file_reader'
import { Gameboy } from './scripts/gameboy'

import './App.scss'

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [reader, setReader] = useState<RomFileReader | null>(null);
  const [gameboy, setGameboy] = useState<Gameboy | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (file) {
      setReader(new RomFileReader(file));
      console.log('File selected:', file);
    }
  }, [file]);

  // const handleROMUpload = () => {
  //   if (file) {
  //     console.log('File selected:', file);
  //   } else {
  //     console.log('No file selected');
  //   }
  // };

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
          <canvas ref={canvasRef} id="screen" width="160" height="144"></canvas>
        </div>
      </div>
    </>
  )
}

export default App
