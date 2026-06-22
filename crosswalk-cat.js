// ==========================================
// crosswalk-cat.js
// GAME 2: CROSSWALK DODGE MINI-GAME (UPGRADED)
// ==========================================

// 👥 EXTENDABLE CHARACTER SELECTION LIST
// You can easily add a 5th or 6th character by following the pattern below!
const CAT_CHARACTERS = [
    { id: "classic", name: "Classic Cat", emoji: "🐱", speedBonus: 0 },
    { id: "calico",  name: "Calico",      emoji: "🐈", speedBonus: 2 },
    { id: "tiger",   name: "Tiger",       emoji: "🐯", speedBonus: 4 },
    { id: "black",   name: "Lucky Black", emoji: "🐈‍⬛", speedBonus: 1 },
    // To add more characters in the future, just uncomment/edit these lines:
    // { id: "lion",    name: "Lion Cub",    emoji: "🦁", speedBonus: 5 },
    // { id: "fox",     name: "Sneaky Fox",  emoji: "🦊", speedBonus: 3 }
];

let selectedCharacter = CAT_CHARACTERS[0]; // Default character

function initCrosswalkGame() {
    const containerId = isPracticeMode ? "practiceCrosswalkCanvasContainer" : "crosswalkCanvasContainer";
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    // Create UI wrapper for Character Selection + Canvas
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "320px";
    wrapper.style.margin = "0 auto";
    container.appendChild(wrapper);

    // Create Canvas Element
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 360;
    wrapper.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    
    // Create HTML Overlay for Character Selection Screen
    const charScreen = document.createElement("div");
    charScreen.id = "catCharScreen";
    charScreen.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(30,30,40,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:sans-serif; border-radius:8px; z-index:10;";
    
    let title = document.createElement("h3");
    title.innerText = "CHOOSE YOUR CHARACTER";
    title.style.margin = "0 0 15px 0";
    charScreen.appendChild(title);
    
    let grid = document.createElement("div");
    grid.style.cssText = "display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; width:80%; margin-bottom:20px;";
    
    CAT_CHARACTERS.forEach(char => {
        let btn = document.createElement("button");
        btn.style.cssText = "background:#2b2d42; border:2px solid #8d99ae; color:white; padding:10px; border-radius:8px; cursor:pointer; font-size:14px; display:flex; flex-direction:column; align-items:center; gap:5px; transition:0.2s;";
        btn.innerHTML = `<span style="font-size:24px;">${char.emoji}</span> <span>${char.name}</span>`;
        
        btn.onclick = () => {
            selectedCharacter = char;
            charScreen.remove(); // Hide selection screen
            startGameEngine();   // Launch actual game
        };
        
        // Hover effect
        btn.onmouseenter = () => btn.style.borderColor = "#ff758f";
        btn.onmouseleave = () => btn.style.borderColor = "#8d99ae";
        grid.appendChild(btn);
    });
    
    charScreen.appendChild(grid);
    wrapper.appendChild(charScreen);

    // Audio setup variables
    const bgAudio = document.getElementById("catBgMusic");
    const moveAudio = document.getElementById("catMoveSound");

    // Game variables placeholder initialized inside wrapper scope
    let lastTime = performance.now();
    const fpsInterval = 1000 / 60;
    
    let catX = 145;
    let catY = 320;
    let baseSpeed = 15;
    let gameOver = false;
    let gameStarted = false; 
    
    let cars = [
        { x: 0, y: 70, speed: 2.2, width: 45, icon: "🚘" },
        { x: 180, y: 130, speed: -1.8, width: 45, icon: "🚌" },
        { x: 40, y: 190, speed: 2.5, width: 45, icon: "🏎️" },
        { x: 260, y: 250, speed: -2.0, width: 45, icon: "🚗" }
    ];
    
    // Core game initialization triggered post character select
    function startGameEngine() {
        window.addEventListener("keydown", handleCrosswalkKeys);
        requestAnimationFrame(update);
    }

    function playMoveAudio() {
        if (moveAudio) {
            moveAudio.currentTime = 0;
            moveAudio.play().catch(e => console.log("Audio play blocked until interaction"));
        }
    }

    function playBgAudio() {
        if (bgAudio && bgAudio.paused) {
            bgAudio.currentTime = 0;
            bgAudio.play().catch(e => console.log("Audio play blocked until interaction"));
        }
    }

    function stopBgAudio() {
        if (bgAudio) {
            bgAudio.pause();
        }
    }

    const handleCrosswalkKeys = (e) => {
        if (gameOver) return;
        
        // Start background music on first ever movement input
        if (!gameStarted) {
            gameStarted = true;
            playBgAudio();
        }
        
        const finalSpeed = baseSpeed + selectedCharacter.speedBonus;
        let moved = false;

        if (e.key === "ArrowUp" || e.code === "KeyW") { catY -= finalSpeed; moved = true; }
        if (e.key === "ArrowDown" || e.code === "KeyS") { catY += finalSpeed; moved = true; }
        if (e.key === "ArrowLeft" || e.code === "KeyA") { catX -= finalSpeed; moved = true; }
        if (e.key === "ArrowRight" || e.code === "KeyD") { catX += finalSpeed; moved = true; }
        
        if (moved) playMoveAudio();

        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.key) > -1) {
            e.preventDefault();
        }
    };
    
    window.moveCat = function(direction) {
        if (gameOver) return;
        
        if (!gameStarted) {
            gameStarted = true;
            playBgAudio();
        }
        
        const finalSpeed = baseSpeed + selectedCharacter.speedBonus;
        if (direction === 'up') catY -= finalSpeed;
        if (direction === 'down') catY += finalSpeed;
        if (direction === 'left') catX -= finalSpeed;
        if (direction === 'right') catX += finalSpeed;
        
        playMoveAudio();
    };
    
    function resetCrosswalkMatch() {
        catX = 145;
        catY = 320;
        gameOver = false;
        gameStarted = false;
        stopBgAudio();
    }
    
    function update(currentTime) {
        if (currentStage !== 2) {
            window.removeEventListener("keydown", handleCrosswalkKeys);
            stopBgAudio();
            return;
        }
        
        requestAnimationFrame(update);
        
        const elapsed = currentTime - lastTime;
        if (elapsed < fpsInterval) return;
        lastTime = currentTime - (elapsed % fpsInterval);
        
        // Drawing environment
        ctx.fillStyle = "#8d99ae"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#d1d5db";
        ctx.fillRect(0, 0, canvas.width, 50); 
        ctx.fillRect(0, 310, canvas.width, 50); 
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let i = 20; i < canvas.width; i += 40) {
            ctx.fillRect(i, 50, 15, 260);
        }
        
        // Car systems
        for (let i = 0; i < cars.length; i++) {
            if (gameStarted && !gameOver) {
                cars[i].x += cars[i].speed;
                if (cars[i].speed > 0 && cars[i].x > canvas.width) cars[i].x = -cars[i].width;
                if (cars[i].speed < 0 && cars[i].x < -cars[i].width) cars[i].x = canvas.width;
            }
            
            ctx.font = "26px sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(cars[i].icon, cars[i].x, cars[i].y - 5);
            
            if (gameStarted && !gameOver && catX + 10 > cars[i].x && catX - 10 < cars[i].x + cars[i].width) {
                if (catY + 10 > cars[i].y && catY - 10 < cars[i].y + 24) {
                    gameOver = true;
                    gameStarted = false;
                    stopBgAudio();
                    const meme = document.getElementById("reiDisappointedPop");
                    if (meme) {
                        meme.classList.remove("hidden");
                        setTimeout(() => { 
                            meme.classList.add("hidden"); 
                            resetCrosswalkMatch();
                        }, 1800);
                    }
                }
            }
        }
        
        if (catX < 10) catX = 10;
        if (catX > canvas.width - 25) catX = canvas.width - 25;
        if (catY > canvas.height - 35) catY = canvas.height - 35;
        
        // Render Chosen Character
        ctx.font = "24px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(selectedCharacter.emoji, catX, catY);
        
        if (!gameStarted && !gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, 45);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`USING: ${selectedCharacter.name.toUpperCase()} - MOVE TO START`, canvas.width / 2, 15);
        }
        
        if (catY <= 25 && !gameOver) {
            window.removeEventListener("keydown", handleCrosswalkKeys);
            stopBgAudio();
            currentStage = 3; 
            
            setTimeout(() => {
                if (isPracticeMode) {
                    document.getElementById("practiceStatus").innerHTML = "🎉 <b style='color:#06d6a0;'>Practice Complete!</b> 🎉<br>You're ready for the real thing!";
                    document.getElementById("practiceCrosswalkStage").classList.add("hidden");
                } else {
                    if (typeof window.handleActualGiftUnlock === "function") {
                        window.handleActualGiftUnlock();
                    }
                }
            }, 300);
            return;
        }
    }
}