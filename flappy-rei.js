// ==========================================
// flappy-rei.js
// GAME 1: FLAPPY REI (WITH NEW POWER-UPS & AUDIO)
// ==========================================

const FLAPPY_WIN_SCORE = 20; 

// ⚠️ POWERUP IMAGE DECLARATION ZONE!
const IMG_LIZ = new Image(); IMG_LIZ.src = "pics/liz-plush.png"; 
const IMG_LEESEO = new Image(); IMG_LEESEO.src = "pics/leeseo-plush.png";
const IMG_WONYOUNG = new Image(); IMG_WONYOUNG.src = "pics/wonyoung-plush.png";

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

    // --- AUDIO GRABBERS ---
    const bgAudio = document.getElementById("flappyBgMusic");
    const tapAudio = document.getElementById("flappyTapSound");
    const pointAudio = document.getElementById("flappyPointSound");
    const powerupAudio = document.getElementById("flappyPowerupSound");
    const dieAudio = document.getElementById("flappyDieSound");
    const winAudio = document.getElementById("flappyWinSound");

    function playSound(audioEl) {
        if (audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch(e => console.log("Audio prevented:", e));
        }
    }

    let lastTime = performance.now();
    const fpsInterval = 1000 / 60; 
    
    let birdY = 200;
    let velocity = 0;
    const baseGravity = 0.35;    
    const baseJump = -5.8;       
    const baseMaxFall = 7;  
    
    let score = 0;
    let gameOver = false;
    let gameWon = false;
    let gameStarted = false; 
    let pipes = [];
    let pipeTimer = 0;
    let bgScrollX = 0;

    let powerups = [];
    let activeTimers = { liz: 0, leeseo: 0, wonyoung: 0 };
    let lizGraceFrames = 0;

    const scoreBoard = document.getElementById(scoreBoardId);
    if (scoreBoard) scoreBoard.innerText = `Score: 0 / ${FLAPPY_WIN_SCORE}`;

    function stopBgAudio() {
        if (bgAudio) bgAudio.pause();
    }

    // --- AUDIO & MOVEMENT CONTROLLER ---
    function controllerAction() {
        if (!gameStarted && !gameOver) {
            gameStarted = true;
            velocity = baseJump;
            // Start BG Music on first interaction
            if (bgAudio && bgAudio.paused) { 
                bgAudio.currentTime = 0; 
                bgAudio.play().catch(e => console.log("BG Audio prevented:", e)); 
            }
        } else if (gameOver) {
            birdY = 200;
            velocity = 0;
            score = 0;
            pipes = [];
            powerups = [];
            activeTimers = { liz: 0, leeseo: 0, wonyoung: 0 };
            pipeTimer = 0;
            gameOver = false;
            gameWon = false;
            gameStarted = false; 
            document.getElementById(scoreBoardId).innerText = `Score: 0 / ${FLAPPY_WIN_SCORE}`; 
        } else {
            // Wonyoung Heavy Gravity Logic
            velocity = activeTimers.wonyoung > 0 ? baseJump * 0.85 : baseJump;
        }

        // Robust Tap Sound Logic
        playSound(tapAudio);
    }
    
    canvas.addEventListener("mousedown", (e) => { e.preventDefault(); controllerAction(); });
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); controllerAction(); }, { passive: false });
    
    const handleKeydown = (e) => {
        if (e.code === "Space") { e.preventDefault(); controllerAction(); }
    };
    window.addEventListener("keydown", handleKeydown);
    
    function update(currentTime) {
        if (currentStage !== 1) {
            window.removeEventListener("keydown", handleKeydown);
            stopBgAudio();
            return; 
        }
        
        requestAnimationFrame(update);
        const elapsed = currentTime - lastTime;
        if (elapsed < fpsInterval) return;
        lastTime = currentTime - (elapsed % fpsInterval);
        
        let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#4ea8de");
        gradient.addColorStop(0.7, "#90e0ef");
        gradient.addColorStop(1, "#caf0f8");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (gameStarted && !gameOver) bgScrollX = (bgScrollX - 0.5) % 40;
        ctx.fillStyle = "#aad6ec";
        for (let x = bgScrollX; x < canvas.width + 40; x += 40) { ctx.fillRect(x, canvas.height - 40, 2, 40); }
        ctx.fillStyle = "#74c69d";
        ctx.fillRect(0, canvas.height - 15, canvas.width, 15);

        if (activeTimers.liz > 0) activeTimers.liz--;
        if (activeTimers.leeseo > 0) activeTimers.leeseo--;
        if (activeTimers.wonyoung > 0) activeTimers.wonyoung--;
        if (lizGraceFrames > 0) lizGraceFrames--;

        const currentGravity = activeTimers.wonyoung > 0 ? baseGravity * 1.8 : baseGravity;
        const currentMaxFall = activeTimers.wonyoung > 0 ? baseMaxFall * 1.5 : baseMaxFall;

        if (gameStarted && !gameOver) {
            velocity += currentGravity;
            if (velocity > currentMaxFall) velocity = currentMaxFall;
            birdY += velocity;
            pipeTimer++;

            if (pipeTimer >= 100) {
                let gap = 125;
                let topHeight = Math.floor(Math.random() * (canvas.height - gap - 100)) + 40;
                pipes.push({ x: canvas.width, top: topHeight, bottom: canvas.height - topHeight - gap, passed: false });

                if (Math.random() < 0.25) {
                    const types = ['liz', 'leeseo', 'wonyoung'];
                    powerups.push({
                        x: canvas.width + 60,
                        y: Math.floor(Math.random() * (canvas.height - 100)) + 30,
                        type: types[Math.floor(Math.random() * types.length)],
                        size: 26
                    });
                }
                pipeTimer = 0;
            }

            if (birdY > canvas.height - 40 || birdY < -10) {
                triggerFlappyLoss();
            }
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
            if (gameStarted && !gameOver) pipes[i].x -= 2.0;
            
            if (activeTimers.liz === 0) {
                ctx.fillStyle = "#ff758f"; ctx.fillRect(pipes[i].x, 0, 52, pipes[i].top);
                ctx.fillStyle = "#ff4d6d"; ctx.fillRect(pipes[i].x + 4, pipes[i].top - 12, 44, 12);
                ctx.fillStyle = "#ff758f"; ctx.fillRect(pipes[i].x, canvas.height - pipes[i].bottom, 52, pipes[i].bottom);
                ctx.fillStyle = "#ff4d6d"; ctx.fillRect(pipes[i].x + 4, canvas.height - pipes[i].bottom, 44, 12);
                
                if (activeTimers.leeseo === 0 && lizGraceFrames === 0 && pipes[i].x < 55 && pipes[i].x + 52 > 25) {
                    if (birdY + 5 < pipes[i].top || birdY + 25 > canvas.height - pipes[i].bottom) triggerFlappyLoss();
                }
            }
            
            if (!pipes[i].passed && pipes[i].x < 25) {
                pipes[i].passed = true;
                score++;
                playSound(pointAudio);
                
                document.getElementById(scoreBoardId).innerText = `Score: ${score} / ${FLAPPY_WIN_SCORE}`; 
                
                if (score >= FLAPPY_WIN_SCORE) { 
                    gameStarted = false;
                    gameOver = true;
                    gameWon = true;
                    pipes = [];
                    powerups = [];
                    window.removeEventListener("keydown", handleKeydown);
                    stopBgAudio();
                    playSound(winAudio);
                    
                    if(typeof showReactionPopup === "function") {
                        showReactionPopup("pics/rei-happy.jpg", "YOU DID IT! 🎉", "Congratulations on completing Flappy Rei game!", "#2a9d8f", 2500, () => {
                            currentStage = 2;
                            if (isPracticeMode) {
                                document.getElementById("practiceFlappyStage").classList.add("hidden");
                                document.getElementById("practiceCrosswalkStage").classList.remove("hidden");
                                document.getElementById("practiceStatus").innerText = "Stage 2: Crosswalk Training";
                            } else {
                                document.getElementById("flappyStage").classList.add("hidden");
                                document.getElementById("crosswalkStage").classList.remove("hidden");
                            }
                            initCrosswalkGame();
                        });
                    }
                    return;
                }
            }
            if (pipes[i].x + 52 < 0) pipes.splice(i, 1);
        }

        for (let j = powerups.length - 1; j >= 0; j--) {
            if (gameStarted && !gameOver) powerups[j].x -= 2.0;
            let p = powerups[j];
            let imgSource = p.type === 'liz' ? IMG_LIZ : (p.type === 'leeseo' ? IMG_LEESEO : IMG_WONYOUNG);
            let fallbackColor = p.type === 'liz' ? '#06d6a0' : (p.type === 'leeseo' ? '#ffd166' : '#9d4edd');
            
            if (imgSource.src && imgSource.complete) {
                ctx.drawImage(imgSource, p.x, p.y, p.size, p.size);
            } else {
                ctx.fillStyle = fallbackColor; ctx.beginPath(); ctx.arc(p.x + p.size/2, p.y + p.size/2, p.size/2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = "white"; ctx.font="12px Arial"; ctx.fillText(p.type[0].toUpperCase(), p.x+8, p.y+18);
            }

            if (gameStarted && !gameOver && 20 < p.x + p.size && 20 + 32 > p.x && birdY < p.y + p.size && birdY + 32 > p.y) {
                activeTimers[p.type] = 180;
                if (p.type === 'liz') {
                    pipes = [];
                    powerups = [];
                    pipeTimer = -80;
                    lizGraceFrames = 60;
                }
                playSound(powerupAudio);
                powerups.splice(j, 1);
            } else if (p.x + p.size < 0) powerups.splice(j, 1);
        }
        
        if (activeTimers.leeseo > 0) { ctx.shadowColor = "#ffd166"; ctx.shadowBlur = 15; } 
        else if (activeTimers.wonyoung > 0) { ctx.shadowColor = "#9d4edd"; ctx.shadowBlur = 15; }

        if (reiImg.complete) { ctx.drawImage(reiImg, 20, birdY, 32, 32); } 
        else { ctx.font = "20px sans-serif"; ctx.fillText("🧸", 20, birdY + 15); }
        ctx.shadowBlur = 0; 

        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "white";
        ctx.textAlign = "center"; 
        let yOffset = 20;
        if (activeTimers.liz > 0) { ctx.fillText(`LIZ: CLEAR (${Math.ceil(activeTimers.liz/60)}s)`, canvas.width/2, yOffset); yOffset += 15; }
        if (activeTimers.leeseo > 0) { ctx.fillText(`LEESEO: INVINCIBLE (${Math.ceil(activeTimers.leeseo/60)}s)`, canvas.width/2, yOffset); yOffset += 15; }
        if (activeTimers.wonyoung > 0) { ctx.fillText(`WONYOUNG: HEAVY! (${Math.ceil(activeTimers.wonyoung/60)}s)`, canvas.width/2, yOffset); }

        if (!gameStarted && !gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("TAP SCREEN OR SPACE TO FLY", canvas.width / 2, canvas.height / 2);
        }
        
        if (gameOver && !gameWon) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Game Over 💔", canvas.width / 2, canvas.height / 2 - 15);
            ctx.font = "13px sans-serif"; ctx.fillStyle = "#ffccd5";
            ctx.fillText("Tap Frame to Try Again", canvas.width / 2, canvas.height / 2 + 15);
        }
    }
    
    function triggerFlappyLoss() {
        if (gameOver) return; 
        gameOver = true;
        gameStarted = false;
        stopBgAudio();
        playSound(dieAudio);
        
        const meme = document.getElementById("reiDisappointedPop");
        if (meme) {
            meme.classList.remove("hidden");
            setTimeout(() => { meme.classList.add("hidden"); }, 1800);
        }
    }
    requestAnimationFrame(update);
}