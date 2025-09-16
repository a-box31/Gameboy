/**
 * GameBoy Input System
 * Handles keyboard and gamepad input mapping to GameBoy buttons
 */
class Input {
    constructor(mmu) {
        this.mmu = mmu;
        
        // Current button states
        this.buttonStates = {
            up: false,
            down: false,
            left: false,
            right: false,
            a: false,
            b: false,
            start: false,
            select: false
        };
        
        // Key mappings (customizable)
        this.keyMap = {
            'ArrowUp': 'up',
            'KeyW': 'up',
            'ArrowDown': 'down',
            'KeyS': 'down',
            'ArrowLeft': 'left',
            'KeyA': 'left',
            'ArrowRight': 'right',
            'KeyD': 'right',
            'KeyZ': 'a',
            'KeyX': 'b',
            'Enter': 'start',
            'ShiftRight': 'select',
            'Space': 'select'
        };
        
        // Gamepad support
        this.gamepadIndex = -1;
        this.gamepadDeadzone = 0.3;
        
        // Visual feedback elements
        this.buttonElements = {};
        
        this.init();
    }
    
    init() {
        this.setupKeyboardInput();
        this.setupGamepadInput();
        this.setupButtonElements();
        this.setupTouchInput();
    }
    
    setupKeyboardInput() {
        document.addEventListener('keydown', (event) => {
            this.handleKeyEvent(event, true);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyEvent(event, false);
        });
    }
    
    handleKeyEvent(event, pressed) {
        const button = this.keyMap[event.code];
        if (button) {
            event.preventDefault();
            this.setButton(button, pressed);
        }
    }
    
    setupGamepadInput() {
        // Check for gamepad connection
        window.addEventListener('gamepadconnected', (event) => {
            console.log('Gamepad connected:', event.gamepad.id);
            this.gamepadIndex = event.gamepad.index;
        });
        
        window.addEventListener('gamepaddisconnected', (event) => {
            console.log('Gamepad disconnected:', event.gamepad.id);
            if (this.gamepadIndex === event.gamepad.index) {
                this.gamepadIndex = -1;
            }
        });
        
        // Poll gamepad state
        this.gamepadPollInterval = setInterval(() => {
            this.pollGamepad();
        }, 16); // ~60fps
    }
    
    pollGamepad() {
        if (this.gamepadIndex === -1) return;
        
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];
        
        if (!gamepad) {
            this.gamepadIndex = -1;
            return;
        }
        
        // D-pad / Left stick
        const leftX = gamepad.axes[0];
        const leftY = gamepad.axes[1];
        
        this.setButton('left', leftX < -this.gamepadDeadzone || gamepad.buttons[14]?.pressed);
        this.setButton('right', leftX > this.gamepadDeadzone || gamepad.buttons[15]?.pressed);
        this.setButton('up', leftY < -this.gamepadDeadzone || gamepad.buttons[12]?.pressed);
        this.setButton('down', leftY > this.gamepadDeadzone || gamepad.buttons[13]?.pressed);
        
        // Face buttons (Xbox layout: A=0, B=1, X=2, Y=3)
        this.setButton('a', gamepad.buttons[0]?.pressed || false); // A
        this.setButton('b', gamepad.buttons[1]?.pressed || false); // B
        
        // Start/Select
        this.setButton('start', gamepad.buttons[9]?.pressed || false); // Start/Menu
        this.setButton('select', gamepad.buttons[8]?.pressed || false); // Select/View
    }
    
    setupButtonElements() {
        // Get button elements for visual feedback
        this.buttonElements = {
            up: document.getElementById('up'),
            down: document.getElementById('down'),
            left: document.getElementById('left'),
            right: document.getElementById('right'),
            a: document.getElementById('a'),
            b: document.getElementById('b'),
            start: document.getElementById('start'),
            select: document.getElementById('select')
        };
        
        // Add click handlers for on-screen buttons
        Object.keys(this.buttonElements).forEach(button => {
            const element = this.buttonElements[button];
            if (element) {
                element.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                    this.setButton(button, true);
                });
                
                element.addEventListener('mouseup', (event) => {
                    event.preventDefault();
                    this.setButton(button, false);
                });
                
                element.addEventListener('mouseleave', (event) => {
                    this.setButton(button, false);
                });
            }
        });
    }
    
    setupTouchInput() {
        // Touch support for mobile devices
        Object.keys(this.buttonElements).forEach(button => {
            const element = this.buttonElements[button];
            if (element) {
                element.addEventListener('touchstart', (event) => {
                    event.preventDefault();
                    this.setButton(button, true);
                });
                
                element.addEventListener('touchend', (event) => {
                    event.preventDefault();
                    this.setButton(button, false);
                });
                
                element.addEventListener('touchcancel', (event) => {
                    event.preventDefault();
                    this.setButton(button, false);
                });
            }
        });
        
        // Prevent default touch behavior on the whole document
        document.addEventListener('touchstart', (event) => {
            if (event.target.classList.contains('dpad-btn') || 
                event.target.classList.contains('action-btn') || 
                event.target.classList.contains('system-btn')) {
                event.preventDefault();
            }
        }, { passive: false });
    }
    
    setButton(button, pressed) {
        if (this.buttonStates[button] !== pressed) {
            this.buttonStates[button] = pressed;
            
            // Update visual feedback
            const element = this.buttonElements[button];
            if (element) {
                if (pressed) {
                    element.classList.add('pressed');
                } else {
                    element.classList.remove('pressed');
                }
            }
            
            // Update MMU joypad state
            this.updateJoypadState();
        }
    }
    
    updateJoypadState() {
        // Convert button states to GameBoy format
        const joypadState = {
            right: this.buttonStates.right,
            left: this.buttonStates.left,
            up: this.buttonStates.up,
            down: this.buttonStates.down,
            a: this.buttonStates.a,
            b: this.buttonStates.b,
            select: this.buttonStates.select,
            start: this.buttonStates.start
        };
        
        this.mmu.updateJoypad(joypadState);
    }
    
    // Get current state for debugging
    getState() {
        return {
            keyboard: { ...this.buttonStates },
            gamepadConnected: this.gamepadIndex !== -1,
            gamepadIndex: this.gamepadIndex
        };
    }
    
    // Update key mappings
    setKeyMapping(key, button) {
        if (button === null) {
            delete this.keyMap[key];
        } else {
            this.keyMap[key] = button;
        }
    }
    
    // Get current key mappings
    getKeyMappings() {
        return { ...this.keyMap };
    }
    
    // Reset all button states
    reset() {
        Object.keys(this.buttonStates).forEach(button => {
            this.setButton(button, false);
        });
    }
    
    // Cleanup
    destroy() {
        if (this.gamepadPollInterval) {
            clearInterval(this.gamepadPollInterval);
        }
    }
}

/**
 * Input Configuration Manager
 * Allows users to customize key mappings
 */
class InputConfig {
    constructor(input) {
        this.input = input;
        this.configOpen = false;
        this.waitingForKey = null;
        
        this.createConfigUI();
    }
    
    createConfigUI() {
        // Create configuration modal (would be styled with CSS)
        const modal = document.createElement('div');
        modal.id = 'input-config-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Configure Controls</h3>
                <div class="key-bindings">
                    <div class="binding">
                        <label>Up:</label>
                        <button class="key-binding" data-button="up">Arrow Up</button>
                    </div>
                    <div class="binding">
                        <label>Down:</label>
                        <button class="key-binding" data-button="down">Arrow Down</button>
                    </div>
                    <div class="binding">
                        <label>Left:</label>
                        <button class="key-binding" data-button="left">Arrow Left</button>
                    </div>
                    <div class="binding">
                        <label>Right:</label>
                        <button class="key-binding" data-button="right">Arrow Right</button>
                    </div>
                    <div class="binding">
                        <label>A:</label>
                        <button class="key-binding" data-button="a">Z</button>
                    </div>
                    <div class="binding">
                        <label>B:</label>
                        <button class="key-binding" data-button="b">X</button>
                    </div>
                    <div class="binding">
                        <label>Start:</label>
                        <button class="key-binding" data-button="start">Enter</button>
                    </div>
                    <div class="binding">
                        <label>Select:</label>
                        <button class="key-binding" data-button="select">Shift</button>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button id="reset-defaults">Reset Defaults</button>
                    <button id="close-config">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.addEventListener('click', (event) => {
            if (event.target.classList.contains('key-binding')) {
                this.waitForKey(event.target.dataset.button, event.target);
            }
        });
        
        document.getElementById('reset-defaults')?.addEventListener('click', () => {
            this.resetToDefaults();
        });
        
        document.getElementById('close-config')?.addEventListener('click', () => {
            this.close();
        });
        
        // Listen for key presses during configuration
        document.addEventListener('keydown', (event) => {
            if (this.waitingForKey) {
                event.preventDefault();
                this.setKeyBinding(this.waitingForKey.button, event.code, this.waitingForKey.element);
                this.waitingForKey = null;
            }
        });
    }
    
    open() {
        this.configOpen = true;
        document.getElementById('input-config-modal').style.display = 'block';
        this.updateBindingDisplay();
    }
    
    close() {
        this.configOpen = false;
        this.waitingForKey = null;
        document.getElementById('input-config-modal').style.display = 'none';
    }
    
    waitForKey(button, element) {
        this.waitingForKey = { button, element };
        element.textContent = 'Press a key...';
        element.classList.add('waiting');
    }
    
    setKeyBinding(button, keyCode, element) {
        // Remove old binding for this key
        const oldKey = Object.keys(this.input.keyMap).find(key => this.input.keyMap[key] === button);
        if (oldKey) {
            delete this.input.keyMap[oldKey];
        }
        
        // Set new binding
        this.input.setKeyMapping(keyCode, button);
        
        // Update display
        element.textContent = this.keyCodeToDisplayName(keyCode);
        element.classList.remove('waiting');
        
        // Save to localStorage
        this.saveBindings();
    }
    
    keyCodeToDisplayName(keyCode) {
        const displayNames = {
            'ArrowUp': 'Arrow Up',
            'ArrowDown': 'Arrow Down',
            'ArrowLeft': 'Arrow Left',
            'ArrowRight': 'Arrow Right',
            'KeyW': 'W',
            'KeyA': 'A',
            'KeyS': 'S',
            'KeyD': 'D',
            'KeyZ': 'Z',
            'KeyX': 'X',
            'Enter': 'Enter',
            'Space': 'Space',
            'ShiftLeft': 'Left Shift',
            'ShiftRight': 'Right Shift'
        };
        
        return displayNames[keyCode] || keyCode;
    }
    
    updateBindingDisplay() {
        const bindings = document.querySelectorAll('.key-binding');
        bindings.forEach(binding => {
            const button = binding.dataset.button;
            const keyCode = Object.keys(this.input.keyMap).find(key => this.input.keyMap[key] === button);
            binding.textContent = keyCode ? this.keyCodeToDisplayName(keyCode) : 'Unbound';
        });
    }
    
    resetToDefaults() {
        const defaults = {
            'ArrowUp': 'up',
            'KeyW': 'up',
            'ArrowDown': 'down',
            'KeyS': 'down',
            'ArrowLeft': 'left',
            'KeyA': 'left',
            'ArrowRight': 'right',
            'KeyD': 'right',
            'KeyZ': 'a',
            'KeyX': 'b',
            'Enter': 'start',
            'ShiftRight': 'select'
        };
        
        this.input.keyMap = { ...defaults };
        this.updateBindingDisplay();
        this.saveBindings();
    }
    
    saveBindings() {
        localStorage.setItem('gameboy_key_bindings', JSON.stringify(this.input.keyMap));
    }
    
    loadBindings() {
        const saved = localStorage.getItem('gameboy_key_bindings');
        if (saved) {
            try {
                this.input.keyMap = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load key bindings from localStorage');
            }
        }
    }
}