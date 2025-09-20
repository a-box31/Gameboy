// A RomFileReader is able to load a local file from an input element
//
// Expects to be provided a file input element,
// or will try to find one with the "file" DOM ID
type DataFunction = (data: Uint8Array) => void;

class RomFileReader implements RomReader {
  callback?: DataFunction;
  
  constructor(file: File) {
    if (file) {
      this.loadFromFile(file);
    }
  }

  // The callback argument will be called when a file is successfully
  // read, with the data as argument (Uint8Array)
  setCallback(onLoadCallback: DataFunction) {
    this.callback = onLoadCallback;
  }

  // Automatically called when the DOM input is provided with a file
  loadFromFile(file: File) {
    if (file === undefined) {
      return;
    }
    let fr = new FileReader();
    let cb = this.callback;

    fr.onload = function () {
      cb && cb(new Uint8Array(fr.result as ArrayBuffer));
    };
    fr.onerror = function (e) {
      const errorCode =
        e.target && e.target.error ? e.target.error.code : "Unknown";
      console.log("Error reading the file", errorCode);
    };
    fr.readAsArrayBuffer(file);
  }
}

export interface RomReader {
  setCallback(fn: Function): void;
}
export default RomFileReader;