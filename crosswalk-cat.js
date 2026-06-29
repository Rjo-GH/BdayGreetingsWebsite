// ==========================================
// crosswalk-cat.js
// GAME 2: CROSSWALK DODGE (OPTIMIZED HITBOXES)
// ==========================================

// ⚠️ IMAGE DECLARATION ZONE: REPLACE THE `imgSrc` URLS WITH YOUR PICTURES!
// If `imgSrc` is empty (""), it defaults back to using emojis.
const CAT_CHARACTERS = [
    { id: "classic", name: "Drooler", emoji: "🐱", speedBonus: 3, imgSrc: "pics/drooler.png" },
    { id: "calico",  name: "CatIna",      emoji: "🐈", speedBonus: 2, imgSrc: "pics/catina.png" },
    { id: "tiger",   name: "Bulgogi",       emoji: "🐯", speedBonus: 4, imgSrc: "pics/bulgogi.png" },
    { id: "black",   name: "Lazy Tilapia", emoji: "🐈‍⬛", speedBonus: 1, imgSrc: "pics/lazytilapia.png" },
    { id: "black",   name: "Fluffy Loaf", emoji: "🐈‍⬛", speedBonus: 0, imgSrc: "pics/fluffyloaf.png" }
];

let selectedCharacter = CAT_CHARACTERS[0]; 

function initCrosswalkGame() {
    const containerId = isPracticeMode ? "practiceCrosswalkCanvasContainer" : "crosswalkCanvasContainer";
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "320px";
    wrapper.style.margin = "0 auto";
    container.appendChild(wrapper);

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 360;
    wrapper.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    
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
        
        btn.innerHTML = char.imgSrc 
            ? `<img src="${char.imgSrc}" style="width: 32px; height: 32px; object-fit: contain;"><span>${char.name}</span>` 
            : `<span style="font-size:24px;">${char.emoji}</span><span>${char.name}</span>`;
        
        btn.onclick = () => {
            selectedCharacter = char;
            charScreen.remove(); 
            startGameEngine();   
        };
        
        btn.onmouseenter = () => btn.style.borderColor = "#ff758f";
        btn.onmouseleave = () => btn.style.borderColor = "#8d99ae";
        grid.appendChild(btn);
    });
    
    charScreen.appendChild(grid);
    wrapper.appendChild(charScreen);

    // --- AUDIO GRABBERS ---
    const bgAudio = document.getElementById("catBgMusic");
    const moveAudio = document.getElementById("catMoveSound");
    const dieAudio = document.getElementById("catDieSound");
    const winAudio = document.getElementById("catWinSound");

    function playSound(audioEl) {
        if (audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch(e => console.log("Audio prevented:", e));
        }
    }

    let lastTime = performance.now();
    const fpsInterval = 1000 / 60;
    
    let catX = 145;
    let catY = 320;
    let baseSpeed = 15;
    let gameOver = false;
    let gameStarted = false; 
    let loadedPlayerImage = null;
    
    let cars = [
        { x: 0, y: 70, speed: 2.2, width: 45, icon: "🚘" },
        { x: 180, y: 130, speed: -1.8, width: 45, icon: "🚌" },
        { x: 40, y: 190, speed: 2.5, width: 45, icon: "🏎️" },
        { x: 260, y: 250, speed: -2.0, width: 45, icon: "🚗" }
    ];
    
    function startGameEngine() {
        if (selectedCharacter.imgSrc) {
            loadedPlayerImage = new Image();
            loadedPlayerImage.src = selectedCharacter.imgSrc;
        }

        window.addEventListener("keydown", handleCrosswalkKeys);
        requestAnimationFrame(update);
    }

    function playBgAudio() {
        if (bgAudio && bgAudio.paused) { bgAudio.currentTime = 0; bgAudio.play().catch(e=>e); }
    }

    function stopBgAudio() {
        if (bgAudio) bgAudio.pause();
    }

    const handleCrosswalkKeys = (e) => {
        if (gameOver) return;
        if (!gameStarted) { gameStarted = true; playBgAudio(); }
        
        const finalSpeed = baseSpeed + selectedCharacter.speedBonus;
        let moved = false;

        if (e.key === "ArrowUp" || e.code === "KeyW") { catY -= finalSpeed; moved = true; }
        if (e.key === "ArrowDown" || e.code === "KeyS") { catY += finalSpeed; moved = true; }
        if (e.key === "ArrowLeft" || e.code === "KeyA") { catX -= finalSpeed; moved = true; }
        if (e.key === "ArrowRight" || e.code === "KeyD") { catX += finalSpeed; moved = true; }
        
        if (moved) playSound(moveAudio);
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].indexOf(e.key) > -1) { e.preventDefault(); }
    };
    
    window.moveCat = function(direction) {
        if (gameOver) return;
        if (!gameStarted) { gameStarted = true; playBgAudio(); }
        
        const finalSpeed = baseSpeed + selectedCharacter.speedBonus;
        if (direction === 'up') catY -= finalSpeed;
        if (direction === 'down') catY += finalSpeed;
        if (direction === 'left') catX -= finalSpeed;
        if (direction === 'right') catX += finalSpeed;
        
        playSound(moveAudio);
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
        
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, "#1b2434");
        bgGradient.addColorStop(1, "#28354f");
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#2f3b58";
        ctx.fillRect(16, 60, canvas.width - 32, canvas.height - 110);

        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 60, canvas.width - 32, canvas.height - 110);

        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 1;
        for (let i = 80; i < canvas.height - 40; i += 40) {
            ctx.setLineDash([12, 12]);
            ctx.beginPath();
            ctx.moveTo(28, i);
            ctx.lineTo(canvas.width - 28, i);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(16, 60, 10, canvas.height - 110);
        ctx.fillRect(canvas.width - 26, 60, 10, canvas.height - 110);

        ctx.fillStyle = "#263145";
        ctx.fillRect(0, 0, canvas.width, 54);
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("CROSSWALK TRAINING", 18, 22);
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText("Avoid the moving cars and reach the top safely.", 18, 40);
        ctx.fillStyle = "#d3f8ff";
        ctx.fillText(`CHARACTER: ${selectedCharacter.name}`, 18, canvas.height - 18);

        let coreX = catX + 12;
        let coreY = catY + 12;

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
            
            // OPTIMIZED DISTANCE-BASED HITBOX
            let carCoreX = cars[i].x + 18;
            let carCoreY = cars[i].y + 12;
            let distX = Math.abs(coreX - carCoreX);
            let distY = Math.abs(coreY - carCoreY);

            if (gameStarted && !gameOver && distX < 18 && distY < 14) {
                gameOver = true;
                gameStarted = false;
                stopBgAudio();
                playSound(dieAudio);

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
        
        if (catX < 10) catX = 10;
        if (catX > canvas.width - 25) catX = canvas.width - 25;
        if (catY > canvas.height - 35) catY = canvas.height - 35;
        
        if (loadedPlayerImage && loadedPlayerImage.complete) {
            ctx.drawImage(loadedPlayerImage, catX, catY, 26, 26);
        } else {
            ctx.font = "24px sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(selectedCharacter.emoji, catX, catY);
        }
        
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
            playSound(winAudio);

            currentStage = 3; 
            
            setTimeout(() => {
                if (isPracticeMode) {
                    document.getElementById("practiceStatus").innerHTML = "🎉 <b style='color:#06d6a0;'>Practice Complete!</b> 🎉<br>You're ready for the real thing!";
                    document.getElementById("practiceCrosswalkStage").classList.add("hidden");
                } else {
                    document.getElementById("crosswalkStage").classList.add("hidden");
                    document.getElementById("memoryStage").classList.remove("hidden");
                    if (typeof initMemoryGame === "function") initMemoryGame();
                }
            }, 300);
            return;
        }
    }
}