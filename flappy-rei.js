// ==========================================
// flappy-rei.js
// GAME 1: FLAPPY IVE MINI-GAME
// ==========================================

// 🎯 EASY SCORE MODIFIER: Change this number to easily adjust the winning score!
const FLAPPY_WIN_SCORE = 20; 

function initFlappyGame() {
    const containerId = isPracticeMode ? "practiceFlappyCanvasContainer" : "flappyCanvasContainer";
    const scoreBoardId = isPracticeMode ? "practiceFlappyScoreBoard" : "flappyScoreBoard";
    
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ""; 
    
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 400;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    
    const reiImg = new Image();
    reiImg.src = "pics/rei-plush.png"; 

    let lastTime = performance.now();
    const fpsInterval = 1000 / 60; 
    
    let birdY = 200;
    let velocity = 0;
    const gravity = 0.35;    
    const jump = -5.8;       
    const maxFallSpeed = 7;  
    
    let score = 0;
    let gameOver = false;
    let gameStarted = false; 
    let pipes = [];
    let pipeTimer = 0;
    
    let bgScrollX = 0;

    // Apply initial score text using our new variable
    const scoreBoard = document.getElementById(scoreBoardId);
    if (scoreBoard) scoreBoard.innerText = `Score: 0 / ${FLAPPY_WIN_SCORE}`;

    function controllerAction() {
        if (!gameStarted && !gameOver) {
            gameStarted = true;
            velocity = jump;
            return;
        }
        
        if (gameOver) {
            birdY = 200;
            velocity = 0;
            score = 0;
            pipes = [];
            pipeTimer = 0;
            gameOver = false;
            gameStarted = false; 
            document.getElementById(scoreBoardId).innerText = `Score: 0 / ${FLAPPY_WIN_SCORE}`; 
        } else {
            velocity = jump;
        }
    }
    
    canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        controllerAction();
    });
    
    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        controllerAction();
    }, { passive: false });
    
    const handleKeydown = (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            controllerAction();
        }
    };
    window.addEventListener("keydown", handleKeydown);
    
    function update(currentTime) {
        if (currentStage !== 1) {
            window.removeEventListener("keydown", handleKeydown);
            return; 
        }
        
        requestAnimationFrame(update);
        
        const elapsed = currentTime - lastTime;
        if (elapsed < fpsInterval) return;
        lastTime = currentTime - (elapsed % fpsInterval);
        
        // --- ARCADE DESIGN BACKGROUND PAINTING ---
        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#4ea8de");
        gradient.addColorStop(0.7, "#90e0ef");
        gradient.addColorStop(1, "#caf0f8");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (gameStarted && !gameOver) {
            bgScrollX = (bgScrollX - 0.5) % 40;
        }
        ctx.fillStyle = "#aad6ec";
        for (let x = bgScrollX; x < canvas.width + 40; x += 40) {
            ctx.fillRect(x, canvas.height - 40, 2, 40);
        }
        ctx.fillStyle = "#74c69d";
        ctx.fillRect(0, canvas.height - 15, canvas.width, 15);
        // ----------------------------------------

        if (gameStarted && !gameOver) {
            velocity += gravity;
            if (velocity > maxFallSpeed) velocity = maxFallSpeed; 
            birdY += velocity;
            pipeTimer++;
            
            if (pipeTimer >= 100) {
                let gap = 125; 
                let topHeight = Math.floor(Math.random() * (canvas.height - gap - 100)) + 40;
                pipes.push({
                    x: canvas.width,
                    top: topHeight,
                    bottom: canvas.height - topHeight - gap,
                    passed: false
                });
                pipeTimer = 0;
            }
            
            if (birdY > canvas.height - 40 || birdY < -10) {
                triggerFlappyLoss();
            }
        }
        
        for (let i = pipes.length - 1; i >= 0; i--) {
            if (gameStarted && !gameOver) {
                pipes[i].x -= 2.0;
            }
            
            ctx.fillStyle = "#ff758f";
            ctx.fillRect(pipes[i].x, 0, 52, pipes[i].top);
            ctx.fillStyle = "#ff4d6d";
            ctx.fillRect(pipes[i].x + 4, pipes[i].top - 12, 44, 12);
            
            ctx.fillStyle = "#ff758f";
            ctx.fillRect(pipes[i].x, canvas.height - pipes[i].bottom, 52, pipes[i].bottom);
            ctx.fillStyle = "#ff4d6d";
            ctx.fillRect(pipes[i].x + 4, canvas.height - pipes[i].bottom, 44, 12);
            
            if (pipes[i].x < 55 && pipes[i].x + 52 > 25) {
                if (birdY + 5 < pipes[i].top || birdY + 25 > canvas.height - pipes[i].bottom) {
                    triggerFlappyLoss();
                }
            }
            
            if (!pipes[i].passed && pipes[i].x < 25) {
                pipes[i].passed = true;
                score++;
                document.getElementById(scoreBoardId).innerText = `Score: ${score} / ${FLAPPY_WIN_SCORE}`; 
                
                // 🎯 WIN CONDITION USING THE NEW VARIABLE
                if (score >= FLAPPY_WIN_SCORE) { 
                    window.removeEventListener("keydown", handleKeydown);
                    currentStage = 2;
                    setTimeout(() => {
                        if (isPracticeMode) {
                            document.getElementById("practiceFlappyStage").classList.add("hidden");
                            document.getElementById("practiceCrosswalkStage").classList.remove("hidden");
                            document.getElementById("practiceStatus").innerText = "Stage 2: Crosswalk Training";
                        } else {
                            document.getElementById("flappyStage").classList.add("hidden");
                            document.getElementById("crosswalkStage").classList.remove("hidden");
                        }
                        initCrosswalkGame();
                    }, 500);
                    return;
                }
            }
            
            if (pipes[i].x + 52 < 0) pipes.splice(i, 1);
        }
        
        if (reiImg.complete) {
            ctx.drawImage(reiImg, 20, birdY, 32, 32);
        } else {
            ctx.font = "20px sans-serif";
            ctx.fillText("🧸", 20, birdY + 15);
        }
        
        if (!gameStarted && !gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("TAP SCREEN OR SPACE TO FLY", canvas.width / 2, canvas.height / 2);
        }
        
        if (gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Game Over 💔", canvas.width / 2, canvas.height / 2 - 15);
            ctx.font = "13px sans-serif";
            ctx.fillStyle = "#ffccd5";
            ctx.fillText("Tap Frame to Try Again", canvas.width / 2, canvas.height / 2 + 15);
        }
    }
    
    function triggerFlappyLoss() {
        if (gameOver) return; 
        gameOver = true;
        gameStarted = false;
        const meme = document.getElementById("reiDisappointedPop");
        if (meme) {
            meme.classList.remove("hidden");
            setTimeout(() => { meme.classList.add("hidden"); }, 1800);
        }
    }
    
    requestAnimationFrame(update);
}