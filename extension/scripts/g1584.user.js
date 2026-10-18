(function() {

  try {

    // 1. Cleanup previous instances to prevent duplicates
    const existingDog = document.getElementById('office-buddy-container');
    if (existingDog) {
      existingDog.remove();
    }

    // 2. Configuration & State
    const CONFIG = {
      scale: 8, // 核心修改：从4改为8（放大两倍）
      speed: 3, // Walking speed
      idleTimeout: 800, // Time before sitting (ms)
      colors: {
        tan: '#D2B48C', // Legs/Face
        black: '#2F2F2F', // Back/Ears
        collar: '#FF0000',
        white: '#FFFFFF',
        eye: '#000000',
        tongue: '#FF69B4',
        bg: 'transparent'
      }
    };

    let state = {
      isWalking: false,
      direction: 1, // 1 = right, -1 = left
      x: 50,
      y: 0, // Will be calculated based on window height
      typingCount: 0,
      lastTypingTime: 0,
      frameCount: 0
    };

    // 3. Create DOM Elements
    const container = document.createElement('div');
    container.id = 'office-buddy-container';
    Object.assign(container.style, {
      position: 'fixed',
      zIndex: '2147483647', // Max z-index
      pointerEvents: 'none', // Let clicks pass through
      left: '0px',
      top: '0px',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Speech Bubble for counter
    const bubble = document.createElement('div');
    Object.assign(bubble.style, {
      position: 'absolute',
      backgroundColor: 'white',
      border: '2px solid #333',
      borderRadius: '8px',
      padding: '6px 12px',
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333',
      whiteSpace: 'nowrap',
      boxShadow: '2px 2px 0px rgba(0,0,0,0.2)',
      display: 'none', 
      transition: 'opacity 0.2s, transform 0.2s',
      transform: 'translateY(0)',
      opacity: '0',
      fontSize: '18px' // 适配放大：气泡文字稍放大，更协调
    });

    container.appendChild(canvas);
    container.appendChild(bubble);
    document.body.appendChild(container);

    // 4. Sprite Definitions (16x16 grids)
    // 0:Empty, 1:Tan, 2:Black, 3:Collar, 4:Eye, 5:Tongue
    const sprites = {
      sit: [
        "0000000000000000",
        "0000002002000000", // Ears
        "0000002222000000", // Head top
        "0000002112400000", // Eyes
        "0000001111000000", // Snout
        "0000003333000000", // Collar
        "0000022222000000", // Back starts
        "0000222211000000", // Body
        "0002222111000000", 
        "0002221111000000",
        "0002211111100000", // Sitting haunches
        "0001111111110000",
        "0001100000110000", // Paws
        "0000000000000000",
        "0000000000000000",
        "0000000000000000"
      ],
      walk1: [ // Legs spread
        "0000000000000000",
        "0000000000200200", 
        "0000000000222200", 
        "0000000000211240", 
        "0000000000111150", // Tongue out happy
        "0000002222333300", 
        "0000022222221100", 
        "0000022222111100",
        "0000001111111100",
        "0000001001010010", // Legs
        "0000001001010010",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000"
      ],
      walk2: [ // Legs crossed/moving
        "0000000000000000",
        "0000000000200200", 
        "0000000000222200", 
        "0000000000211240", 
        "0000000000111150", 
        "0000002222333300", 
        "0000022222221100", 
        "0000022222111100",
        "0000001111111100",
        "0000000110001100", // Legs
        "0000000110001100",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000",
        "0000000000000000"
      ]
    };

    // 5. Event Listeners
    function handleInput() {
      state.lastTypingTime = Date.now();
      state.typingCount++;
      
      if (!state.isWalking) {
        state.isWalking = true;
        // Randomly choose a new direction when starting to walk
        state.direction = Math.random() > 0.5 ? 1 : -1;
      }
      
      // Update Bubble
      bubble.innerText = `Typed: ${state.typingCount}`;
      bubble.style.display = 'block';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(-10px)';
      
      // Reset bubble fade timer
      if (state.bubbleTimer) clearTimeout(state.bubbleTimer);
      state.bubbleTimer = setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateY(0)';
      }, 2000);
    }

    document.addEventListener('keydown', handleInput);
    document.addEventListener('click', () => {
        // Optional: Click to call dog over? 
        // For now, just keep input focus logic
    });

    // 6. Render Loop
    function drawPixel(x, y, colorCode) {
      let color = null;
      switch(colorCode) {
        case '1': color = CONFIG.colors.tan; break;
        case '2': color = CONFIG.colors.black; break;
        case '3': color = CONFIG.colors.collar; break;
        case '4': color = CONFIG.colors.eye; break;
        case '5': color = CONFIG.colors.tongue; break;
      }
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * CONFIG.scale), 
          Math.floor(y * CONFIG.scale), 
          CONFIG.scale, 
          CONFIG.scale
        );
      }
    }

    function animate() {
      if (!document.getElementById('office-buddy-container')) return; // Stop if removed
      // Resize logic
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      
      // Logic
      if (state.isWalking) {
        state.x += CONFIG.speed * state.direction;
        
        // 适配放大：调整边界值（原64 → 128，因为scale从4→8，16*8=128）
        if (state.x > window.innerWidth - 128) {
            state.direction = -1;
            state.x = window.innerWidth - 128;
        }
        if (state.x < 0) {
            state.direction = 1;
            state.x = 0;
        }
        
        // Check for idle
        if (now - state.lastTypingTime > CONFIG.idleTimeout) {
          state.isWalking = false;
        }
      }

      // Select Sprite
      let currentSprite = sprites.sit;
      if (state.isWalking) {
        // Animate legs every 150ms
        const walkFrame = Math.floor(now / 150) % 2;
        currentSprite = walkFrame === 0 ? sprites.walk1 : sprites.walk2;
      }

      // Rendering
      ctx.save();
      
      const spriteWidth = 16 * CONFIG.scale;
      const spriteHeight = 16 * CONFIG.scale;
      // 适配放大：底部内边距从10→20，更协调
      const drawY = window.innerHeight - spriteHeight - 20; 

      // Position Bubble above dog
      bubble.style.left = (state.x + (spriteWidth / 2) - (bubble.offsetWidth / 2)) + 'px';
      // 适配放大：气泡位置上移更多（从40→60）
      bubble.style.top = (drawY - 60) + 'px';

      // Handle Direction Flip
      if (state.direction === -1) {
        // Move context to center of sprite, scale -1, move back
        ctx.translate(state.x + spriteWidth, drawY);
        ctx.scale(-1, 1);
        ctx.translate(0, 0); // Already at origin relative to translate
        
        // Draw loop
        currentSprite.forEach((row, r) => {
          row.split('').forEach((pixel, c) => {
            drawPixel(c, r, pixel);
          });
        });
      } else {
        ctx.translate(state.x, drawY);
        currentSprite.forEach((row, r) => {
          row.split('').forEach((pixel, c) => {
            drawPixel(c, r, pixel);
          });
        });
      }
      
      ctx.restore();
      
      requestAnimationFrame(animate);
    }

    // Start
    animate();

    return {
      success: true,
      message: "Office Buddy Activated! Start typing to wake him up."
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }

})();