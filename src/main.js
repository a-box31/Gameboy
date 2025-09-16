/**
 * Main application entry point
 * Initializes the GameBoy emulator and handles UI interactions
 */

let gameboy = null;
let inputConfig = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize GameBoy emulator
        gameboy = new GameBoy();
        await gameboy.init();
        
        // Initialize input configuration
        inputConfig = new InputConfig(gameboy.input);
        inputConfig.loadBindings();
        
        // Set up UI event handlers
        setupUIHandlers();
        
        // Update debug info initially
        updateDebugInfo();
        
        console.log('GameBoy emulator ready');
        
        // Show initial instructions
        showInstructions();
        
    } catch (error) {
        console.error('Failed to initialize emulator:', error);
        showError('Failed to initialize emulator. Please refresh the page and try again.');
    }
});

function setupUIHandlers() {
    // ROM loading
    const romInput = document.getElementById('rom-input');
    const loadBtn = document.getElementById('load-btn');
    
    if (romInput && loadBtn) {
        romInput.addEventListener('change', handleROMLoad);
        loadBtn.addEventListener('click', () => romInput.click());
    }
    
    // Emulator controls
    const playPauseBtn = document.getElementById('play-pause');
    const resetBtn = document.getElementById('reset');
    const saveStateBtn = document.getElementById('save-state');
    const loadStateBtn = document.getElementById('load-state');
    
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', toggleEmulation);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetEmulation);
    }
    
    if (saveStateBtn) {
        saveStateBtn.addEventListener('click', saveState);
    }
    
    if (loadStateBtn) {
        loadStateBtn.addEventListener('click', loadState);
    }
    
    // Audio controls
    const volumeSlider = document.getElementById('volume');
    const muteBtn = document.getElementById('mute');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            const volume = parseInt(event.target.value);
            gameboy.setVolume(volume);
        });
    }
    
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            gameboy.toggleMute();
            muteBtn.textContent = muteBtn.textContent === 'Mute' ? 'Unmute' : 'Mute';
        });
    }
    
    // Drag and drop support
    setupDragDrop();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
    
    // File menu (if exists)
    setupFileMenu();
}

function handleROMLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file extension
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['gb', 'gbc'].includes(extension)) {
        showError('Please select a valid GameBoy ROM file (.gb or .gbc)');
        return;
    }
    
    // Check file size (reasonable limits)
    if (file.size > 8 * 1024 * 1024) { // 8MB max
        showError('ROM file is too large (maximum 8MB)');
        return;
    }
    
    if (file.size < 32 * 1024) { // 32KB minimum
        showError('ROM file is too small (minimum 32KB)');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const arrayBuffer = e.target.result;
            
            if (gameboy.loadROM(arrayBuffer)) {
                showSuccess(`ROM loaded: ${file.name}`);
                
                // Enable emulator controls
                enableEmulatorControls();
                
                // Auto-start emulation
                setTimeout(() => {
                    gameboy.start();
                    updatePlayPauseButton();
                }, 500);
                
            } else {
                showError('Failed to load ROM. The file may be corrupted or invalid.');
            }
        } catch (error) {
            console.error('Error loading ROM:', error);
            showError('Failed to load ROM: ' + error.message);
        }
        
        // Clear file input
        event.target.value = '';
    };
    
    reader.onerror = () => {
        showError('Failed to read ROM file');
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}

function setupDragDrop() {
    const dropZone = document.body;
    
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (event) => {
        if (!dropZone.contains(event.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    });
    
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const romInput = document.getElementById('rom-input');
            if (romInput) {
                romInput.files = files;
                handleROMLoad({ target: romInput });
            }
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Only handle shortcuts when not configuring input
        if (inputConfig && inputConfig.configOpen) return;
        
        // Only handle shortcuts when emulator has focus (not in input fields)
        if (event.target.tagName === 'INPUT') return;
        
        switch (event.code) {
            case 'F1':
                event.preventDefault();
                showHelp();
                break;
                
            case 'F2':
                event.preventDefault();
                saveState();
                break;
                
            case 'F3':
                event.preventDefault();
                loadState();
                break;
                
            case 'F5':
                event.preventDefault();
                resetEmulation();
                break;
                
            case 'Space':
                // Only if not mapped to select
                if (!gameboy.input.keyMap['Space']) {
                    event.preventDefault();
                    toggleEmulation();
                }
                break;
                
            case 'KeyM':
                event.preventDefault();
                gameboy.toggleMute();
                break;
                
            case 'KeyC':
                if (event.ctrlKey) {
                    event.preventDefault();
                    inputConfig.open();
                }
                break;
        }
    });
}

function setupFileMenu() {
    // Create a simple file menu if needed
    const header = document.querySelector('header');
    if (header) {
        const fileMenu = document.createElement('div');
        fileMenu.className = 'file-menu';
        fileMenu.innerHTML = `
            <button id="file-menu-btn">File</button>
            <div id="file-menu-dropdown" class="dropdown hidden">
                <a href="#" id="load-rom">Load ROM</a>
                <a href="#" id="save-state-menu">Save State (F2)</a>
                <a href="#" id="load-state-menu">Load State (F3)</a>
                <hr>
                <a href="#" id="configure-input">Configure Input (Ctrl+C)</a>
                <hr>
                <a href="#" id="help-menu">Help (F1)</a>
            </div>
        `;
        header.appendChild(fileMenu);
        
        // File menu handlers
        document.getElementById('file-menu-btn')?.addEventListener('click', toggleFileMenu);
        document.getElementById('load-rom')?.addEventListener('click', () => document.getElementById('rom-input')?.click());
        document.getElementById('save-state-menu')?.addEventListener('click', saveState);
        document.getElementById('load-state-menu')?.addEventListener('click', loadState);
        document.getElementById('configure-input')?.addEventListener('click', () => inputConfig.open());
        document.getElementById('help-menu')?.addEventListener('click', showHelp);
        
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!fileMenu.contains(event.target)) {
                document.getElementById('file-menu-dropdown')?.classList.add('hidden');
            }
        });
    }
}

function toggleFileMenu() {
    const dropdown = document.getElementById('file-menu-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function toggleEmulation() {
    if (!gameboy) return;
    
    if (gameboy.running && !gameboy.paused) {
        gameboy.pause();
    } else if (gameboy.paused) {
        gameboy.pause(); // Resume
    } else {
        gameboy.start();
    }
    
    updatePlayPauseButton();
}

function resetEmulation() {
    if (!gameboy) return;
    
    if (confirm('Are you sure you want to reset the emulation? Any unsaved progress will be lost.')) {
        gameboy.reset();
        updatePlayPauseButton();
        showInfo('Emulation reset');
    }
}

function saveState() {
    if (!gameboy || !gameboy.cartridge.title) {
        showError('No ROM loaded');
        return;
    }
    
    try {
        gameboy.saveState(0);
        showSuccess('State saved');
    } catch (error) {
        console.error('Save state error:', error);
        showError('Failed to save state');
    }
}

function loadState() {
    if (!gameboy || !gameboy.cartridge.title) {
        showError('No ROM loaded');
        return;
    }
    
    try {
        if (gameboy.loadState(0)) {
            showSuccess('State loaded');
        } else {
            showError('No save state found');
        }
    } catch (error) {
        console.error('Load state error:', error);
        showError('Failed to load state');
    }
}

function updatePlayPauseButton() {
    const button = document.getElementById('play-pause');
    if (!button || !gameboy) return;
    
    if (gameboy.running && !gameboy.paused) {
        button.textContent = 'Pause';
    } else {
        button.textContent = 'Play';
    }
}

function enableEmulatorControls() {
    const controls = ['play-pause', 'reset', 'save-state', 'load-state'];
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = false;
        }
    });
}

function updateDebugInfo() {
    if (!gameboy) return;
    
    try {
        const info = gameboy.getSystemInfo();
        
        // Update CPU status
        const cpuStatus = document.getElementById('cpu-status');
        if (cpuStatus) {
            let status = 'Stopped';
            if (info.running) {
                status = info.paused ? 'Paused' : 'Running';
            }
            cpuStatus.textContent = status;
        }
        
        // Update registers
        const pcValue = document.getElementById('pc-value');
        const spValue = document.getElementById('sp-value');
        const fpsValue = document.getElementById('fps-value');
        
        if (pcValue && info.cpu) {
            pcValue.textContent = `0x${info.cpu.PC.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        
        if (spValue && info.cpu) {
            spValue.textContent = `0x${info.cpu.SP.toString(16).toUpperCase().padStart(4, '0')}`;
        }
        
        if (fpsValue) {
            fpsValue.textContent = info.fps.toString();
        }
        
    } catch (error) {
        console.error('Error updating debug info:', error);
    }
    
    // Schedule next update
    setTimeout(updateDebugInfo, 1000);
}

// UI notification functions
function showError(message) {
    console.error(message);
    showNotification(message, 'error');
}

function showSuccess(message) {
    console.log(message);
    showNotification(message, 'success');
}

function showInfo(message) {
    console.log(message);
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        borderRadius: '5px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '10000',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // Set background color based on type
    switch (type) {
        case 'error':
            notification.style.backgroundColor = '#e74c3c';
            break;
        case 'success':
            notification.style.backgroundColor = '#27ae60';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#3498db';
            break;
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function showInstructions() {
    const instructions = `
Welcome to the GameBoy Emulator!

To get started:
1. Click "Load ROM" to select a GameBoy (.gb) or GameBoy Color (.gbc) ROM file
2. Or drag and drop a ROM file anywhere on this page
3. Use the on-screen controls or keyboard to play

Keyboard Controls:
- Arrow keys or WASD: D-pad
- Z: A button
- X: B button
- Enter: Start
- Shift: Select

Keyboard Shortcuts:
- F1: Help
- F2: Save State
- F3: Load State
- F5: Reset
- Space: Play/Pause (if not mapped to Select)
- M: Mute/Unmute
- Ctrl+C: Configure Controls

Features:
- Full GameBoy CPU emulation
- Accurate graphics and sound
- Save states
- Battery backup saves
- Customizable controls
- Debug information

Enjoy your retro gaming experience!
    `;
    
    showNotification(instructions.trim(), 'info');
}

function showHelp() {
    showInstructions();
}

// Handle page visibility changes to pause/resume emulation
document.addEventListener('visibilitychange', () => {
    if (!gameboy) return;
    
    if (document.hidden) {
        // Page is hidden, pause emulation
        if (gameboy.running && !gameboy.paused) {
            gameboy.pause();
            gameboy._wasPausedByVisibility = true;
        }
    } else {
        // Page is visible, resume if it was auto-paused
        if (gameboy._wasPausedByVisibility && gameboy.paused) {
            gameboy.pause(); // Resume
            gameboy._wasPausedByVisibility = false;
        }
    }
});

// Handle before unload to save battery data
window.addEventListener('beforeunload', () => {
    if (gameboy && gameboy.cartridge) {
        gameboy.cartridge.saveToBattery();
    }
});

// Export for debugging
window.gameboy = gameboy;