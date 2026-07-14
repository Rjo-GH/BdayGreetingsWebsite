// ==========================================
// CONFIGURATION & SECURITY MANAGEMENT
// ==========================================
const IS_DRY_RUN = true; 

// ⚙️ REI CONFIGURATION: Adjust how many floating Rei's appear!
const NUM_ROTATING_REIS = 30; 

function generateFloatingReis() {
    const containers = [document.getElementById('mainReiBg'), document.getElementById('lockReiBg')];
    containers.forEach(container => {
        if(!container) return;
        container.innerHTML = "";
        for(let i=1; i<=NUM_ROTATING_REIS; i++) {
            const div = document.createElement('div');
            div.className = `rei-plush bubble-${((i - 1) % 30) + 1}`; 
            container.appendChild(div);
        }
    });
}

const TARGET_DATE_JST = new Date("2026-07-16T00:00:00+09:00").getTime();
let serverTimeOffset = 0;
let countdownUnlocked = false;
const LOGIN_HASH = "199412cc1ff69271c01e1f96b80884842e0d4d78562d2419e46093abdbce306a";
const ADMIN_HASH = "bf6b5bdb74c79ece9fc0ad0ac9fb0359f9555d4f35a83b2e6ec69ae99e09603d"; // admin:admin123
const REACTION_STORAGE_KEY = "birthdayGreetingReactions";
const REACTION_TYPES = [
    { id: "love", emoji: "❤️", label: "Love" },
    { id: "sparkle", emoji: "🎉", label: "Sparkle" },
    { id: "cute", emoji: "🥰", label: "Cute" }
];

function encodeTextForStorage(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function buildGreetingKey(item) {
    const keySource = `${item.name || 'Anonymous'}|${item.message || ''}|${item.timestamp || ''}`;
    return encodeTextForStorage(keySource);
}

function loadReactionStorage() {
    try {
        return JSON.parse(localStorage.getItem(REACTION_STORAGE_KEY)) || {};
    } catch (err) {
        console.warn("Unable to read reaction storage:", err);
        return {};
    }
}

function saveReactionStorage(data) {
    localStorage.setItem(REACTION_STORAGE_KEY, JSON.stringify(data));
}

function getReactionCounts(key) {
    const storage = loadReactionStorage();
    const stored = storage[key] || {};
    return REACTION_TYPES.reduce((acc, type) => {
        acc[type.id] = stored[type.id] || 0;
        return acc;
    }, {});
}

function updateReactionCountsInRow(row, counts) {
    if (!row) return;
    row.querySelectorAll('.reaction-btn').forEach((btn) => {
        const reactionId = btn.dataset.reactionId;
        const countSpan = btn.querySelector('.reaction-count');
        if (reactionId && countSpan) {
            countSpan.innerText = counts[reactionId] || 0;
        }
    });
}

async function updateGreetingReaction(key, reactionId, row) {
    const rowId = row && row.dataset && row.dataset.rowId;
    
    // 1. Optimistic UI update instantly for immediate feedback
    const targetBtnSpan = row.querySelector(`[data-reaction-id="${reactionId}"] .reaction-count`);
    let newValue = 1;
    if (targetBtnSpan) {
        newValue = parseInt(targetBtnSpan.innerText || 0, 10) + 1;
        targetBtnSpan.innerText = newValue;
    }

    // 2. Update Local Storage Fallback
    const storage = loadReactionStorage();
    const counts = storage[key] || {};
    counts[reactionId] = (counts[reactionId] || 0) + 1;
    storage[key] = counts;
    saveReactionStorage(storage);

    // 3. Sync to Server safely (sending BOTH lowercase and camelCase to satisfy Sheety backend)
    if (rowId) {
        try {
            const lowerColName = `reaction${reactionId.toLowerCase()}`;
            const camelColName = `reaction${reactionId.charAt(0).toUpperCase() + reactionId.slice(1)}`;
            
            const updated = {};
            updated[lowerColName] = newValue;
            updated[camelColName] = newValue; 

            const payload = { sheet1: updated };
            const patchRes = await fetch(`${SHEETY_API_URL}/${rowId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!patchRes.ok) {
                throw new Error('Failed to update server');
            }
        } catch (err) {
            console.warn('Server reaction update failed, queuing locally', err);
            const q = JSON.parse(localStorage.getItem('sheetyReactionQueue') || '[]');
            q.push({ rowId, reactionId, ts: new Date().toISOString() });
            localStorage.setItem('sheetyReactionQueue', JSON.stringify(q));
        }
    }
}

function createReactionRow(key) {
    const counts = getReactionCounts(key);
    const row = document.createElement('div');
    row.className = 'reaction-row';

    REACTION_TYPES.forEach((type) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reaction-btn';
        btn.dataset.reactionId = type.id;
        btn.title = `React with ${type.label}`;
        btn.innerHTML = `
            <span class="reaction-emoji">${type.emoji}</span>
            <span class="reaction-count">${counts[type.id] || 0}</span>
        `;
        btn.onclick = () => updateGreetingReaction(key, type.id, row);
        row.appendChild(btn);
    });

    const label = document.createElement('div');
    label.className = 'reaction-label';
    label.innerText = 'React to this wish 💖';
    row.appendChild(label);
    return row;
}

async function digestMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

function formatCountdownText(distance) {
    const days = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    const hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
    return `Secure unlock available in ${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function updateCountdownStatus(distance) {
    const statusEl = document.getElementById("countdownStatus");
    if (!statusEl) return;
    if (distance > 0) {
        statusEl.innerText = formatCountdownText(distance);
    } else {
        statusEl.innerText = "Secure unlock ready. Please enter your special credentials.";
    }
}

async function hashLogin(username, password) {
    return await digestMessage(`${username}:${password}`);
}

async function syncSecureTime() {
    try {
        const response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Tokyo");
        const data = await response.json();
        const trueNetworkTime = new Date(data.datetime).getTime();
        serverTimeOffset = trueNetworkTime - new Date().getTime();
    } catch (err) {
        serverTimeOffset = 0; 
    }
}

// ==========================================
// COUNTDOWN ENGINE
// ==========================================
const countdownInterval = setInterval(() => {
    if (IS_DRY_RUN) {
        clearInterval(countdownInterval);
        hideCountdownLock();
        return;
    }

    const currentSecureTime = new Date().getTime() + serverTimeOffset;
    const distance = TARGET_DATE_JST - currentSecureTime;

    if (distance <= 0) {
        countdownUnlocked = true;
        clearInterval(countdownInterval);
        hideCountdownLock();
        return;
    }

    updateCountdownStatus(distance);
    const dElem = document.getElementById("days");
    const hElem = document.getElementById("hours");
    const mElem = document.getElementById("minutes");
    const sElem = document.getElementById("seconds");

    if (dElem) dElem.innerText = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    if (hElem) hElem.innerText = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    if (mElem) mElem.innerText = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    if (sElem) sElem.innerText = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
}, 1000);

function hideCountdownLock() {
    const lockScreen = document.getElementById("countdownLockScreen");
    const loginScreen = document.getElementById("loginScreen");
    
    if (lockScreen) {
        lockScreen.style.display = "none";
        lockScreen.innerHTML = ""; 
    }
    
    if (loginScreen) {
        loginScreen.classList.remove("hidden");
        loginScreen.style.display = "flex";
    }
}

// ==========================================
// SECURE LOGIN SYSTEM 
// ==========================================
window.processLogin = async function() {
    const userEl = document.getElementById("loginUser").value.trim().toLowerCase();
    const passEl = document.getElementById("loginPass").value.trim();
    const errEl = document.getElementById("loginError");
    const loginBtn = document.querySelector("#loginScreen button");

    if (!userEl || !passEl) {
        errEl.innerText = "Enter both username and password to continue.";
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerText = "Checking...";
    }

    const candidateHash = await hashLogin(userEl, passEl);
    const isAdmin = candidateHash === ADMIN_HASH;
    const isValid = candidateHash === LOGIN_HASH || isAdmin;

    if (!countdownUnlocked && !isAdmin) {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerText = "Enter";
        }
        errEl.innerText = "Birthday unlock is not ready yet. Please wait until July 16.";
        return;
    }

    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerText = "Enter";
    }

    if (isValid) {
        document.getElementById("loginScreen").style.display = "none";
        const mainContent = document.getElementById("mainContent");
        if (mainContent) {
            mainContent.style.display = "flex";
            setTimeout(() => { mainContent.style.opacity = "1"; }, 50);
        }
        renderGreetings();
    } else {
        errEl.innerText = "Incorrect credentials. Try again.";
    }
};

// ==========================================
// GREETINGS & SHEETY API INTEGRATION
// ==========================================
const SHEETY_API_URL = "https://api.sheety.co/d085eb98fe3832247bd18be97eebcba2/birthdayGreetingsMessages/sheet1";
const SHEETY_NOTIFICATIONS_URL = "https://api.sheety.co/d085eb98fe3832247bd18be97eebcba2/birthdayGreetingsMessages/notifications";

window.submitGreeting = async function() {
    const nameEl = document.getElementById("greetName");
    const msgEl = document.getElementById("greetMsg");
    const submitBtn = document.querySelector(".greetings-form-container button");
    
    if (!nameEl.value || !msgEl.value) {
        alert("Please fill in both your name and message! 💕");
        return;
    }

    if(submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Sending..."; }

    const payload = {
        sheet1: {
            name: nameEl.value,
            message: msgEl.value,
            timestamp: new Date().toLocaleString()
        }
    };

    try {
        const response = await fetch(SHEETY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            nameEl.value = "";
            msgEl.value = "";
            alert("Thank you for your greetings! Akina would be happy to read it when this website unlocks for her on her upcoming birthday!");
            renderGreetings(); 
        } else {
            alert("There was an error saving your message. Please try again.");
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert("Network error. Failed to send greeting.");
    } finally {
        if(submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Submit Message"; }
    }
};

window.renderGreetings = async function() {
    const display = document.getElementById("greetingsDisplay");
    if (!display) return;

    display.innerHTML = "<p style='color:#888; font-style:italic; font-size: 0.9rem;'>Loading messages... 💌</p>";

    try {
        const response = await fetch(SHEETY_API_URL);
        const data = await response.json();
        
        const greetings = data.sheet1 || [];
        
        if (greetings.length === 0) {
            display.innerHTML = "<p style='color:#888; font-style:italic; font-size: 0.9rem;'>No messages yet. They are still waiting to be written!</p>";
            return;
        }
        
        display.innerHTML = "";
        
        [...greetings].reverse().forEach(g => {
            const card = document.createElement("div");
            card.className = "greeting-card";
            
            const gName = g.name || "Anonymous";
            const gMsg = g.message || "";
            const gTime = g.timestamp || "";
            const messageKey = buildGreetingKey({ name: gName, message: gMsg, timestamp: gTime });

            // Checking both lowercase and camelCase representation from Sheety
            const serverCounts = {};
            REACTION_TYPES.forEach(t => { 
                const camelKey = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`; 
                const lowerKey = `reaction${t.id.toLowerCase()}`; 
                serverCounts[t.id] = g[lowerKey] !== undefined ? g[lowerKey] : (g[camelKey] || 0); 
            });

            card.innerHTML = `
                <h4>${gName}</h4>
                <p>${gMsg}</p>
                <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">${gTime}</div>
            `;
            const reactionRow = createReactionRow(messageKey);
            if (g.id) reactionRow.dataset.rowId = g.id;
            
            if (Object.values(serverCounts).some(v => v > 0)) {
                updateReactionCountsInRow(reactionRow, serverCounts);
            }
            card.appendChild(reactionRow);
            display.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching greetings:", error);
        display.innerHTML = "<p style='color:#d90429; font-style:italic; font-size: 0.9rem;'>Failed to load messages from the server. 😢</p>";
    }
};

// ==========================================
// LIGHTBOX GALLERY SYSTEM
// ==========================================
let allImages = [];
let currentImageIndex = 0;

function openLightbox(index) {
    currentImageIndex = index;
    const modal = document.getElementById("lightboxModal");
    const lightboxImg = document.getElementById("lightboxImg");
    
    if (modal && lightboxImg) {
        lightboxImg.src = allImages[currentImageIndex];
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closeLightbox() {
    const modal = document.getElementById("lightboxModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

function changeLightboxImage(direction) {
    if (allImages.length === 0) return;
    currentImageIndex += direction;
    
    if (currentImageIndex >= allImages.length) currentImageIndex = 0;
    else if (currentImageIndex < 0) currentImageIndex = allImages.length - 1;
    
    const lightboxImg = document.getElementById("lightboxImg");
    if (lightboxImg) lightboxImg.src = allImages[currentImageIndex];
}

window.addEventListener("keydown", (e) => {
    const modal = document.getElementById("lightboxModal");
    if (modal && modal.style.display === "flex") {
        if (e.key === "ArrowRight") changeLightboxImage(1);
        if (e.key === "ArrowLeft") changeLightboxImage(-1);
        if (e.key === "Escape") closeLightbox();
    }
});

// ==========================================
// ARCADE CHAIN ENGINE (Flappy Rei -> Cat Catcher -> Memory Match)
// ==========================================
let currentArcadeStage = 1;

window.initArcadeChain = function() {
    const arcadeState = document.getElementById("arcadeState");
    if (!arcadeState) return;
    
    arcadeState.innerHTML = `
        <div class="arcade-console">
            <div class="arcade-header">
                <h2>🎮 Rei's Arcade Console 🎮</h2>
                <div class="arcade-steps">
                    <span class="step step-done">✅ Quiz</span>
                    <span class="step-arrow">➡️</span>
                    <span id="step-flappy" class="step step-active">🎈 Flappy Rei</span>
                    <span class="step-arrow">➡️</span>
                    <span id="step-cat" class="step">🐱 Cat Game</span>
                    <span class="step-arrow">➡️</span>
                    <span id="step-memory" class="step">🧠 Memory Match</span>
                </div>
            </div>
            <div id="arcadeGameArea" class="arcade-game-area"></div>
        </div>
    `;
    
    loadArcadeStage(1);
};

function loadArcadeStage(stage) {
    currentArcadeStage = stage;
    
    const flappyStep = document.getElementById("step-flappy");
    const catStep = document.getElementById("step-cat");
    const memoryStep = document.getElementById("step-memory");
    
    if (flappyStep && catStep && memoryStep) {
        flappyStep.className = stage === 1 ? "step step-active" : (stage > 1 ? "step step-done" : "step");
        catStep.className = stage === 2 ? "step step-active" : (stage > 2 ? "step step-done" : "step");
        memoryStep.className = stage === 3 ? "step step-active" : "step";
        
        if (stage > 1) flappyStep.innerHTML = "✅ Flappy Rei";
        if (stage > 2) catStep.innerHTML = "✅ Cat Game";
    }
    
    const area = document.getElementById("arcadeGameArea");
    if (!area) return;
    area.innerHTML = "";
    
    if (stage === 1) {
        startFlappyRei(area);
    } else if (stage === 2) {
        startCatGame(area);
    } else if (stage === 3) {
        startMemoryMatchGame(area);
    }
}

/* 1. Flappy Rei Game Engine */
function startFlappyRei(container) {
    container.innerHTML = `
        <div class="game-container">
            <p class="game-instructions">Tap screen/canvas to jump! Clear 5 pipes to pass! 🎈</p>
            <div class="score-board">Score: <span id="flappyScore">0</span> / 5</div>
            <canvas id="flappyCanvas" width="320" height="240" style="border: 2px dashed var(--secondary-color); border-radius: 12px; background: #e8f0fe; display: block; margin: 0 auto; max-width: 100%;"></canvas>
        </div>
    `;
    
    const canvas = document.getElementById("flappyCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let score = 0;
    let birdY = 100;
    let birdVelocity = 0;
    const gravity = 0.22;
    const lift = -4.5;
    let isGameOver = false;
    let animationId;
    
    const reiImg = new Image();
    reiImg.src = 'pics/rei-plush.png';
    
    const pipes = [];
    const pipeWidth = 35;
    const pipeGap = 85;
    let frameCount = 0;
    
    function flap() {
        if (isGameOver) return;
        birdVelocity = lift;
        window.playGameAudio("quizCorrectSound");
    }
    
    canvas.addEventListener("click", flap);
    
    function gameLoop() {
        if (isGameOver) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background color
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Physics
        birdVelocity += gravity;
        birdY += birdVelocity;
        
        if (birdY > canvas.height - 20) birdY = canvas.height - 20;
        if (birdY < 0) birdY = 0;
        
        // Draw Rei Plush
        if (reiImg.complete && reiImg.naturalWidth !== 0) {
            ctx.drawImage(reiImg, 40, birdY - 15, 30, 30);
        } else {
            ctx.font = "24px sans-serif";
            ctx.fillText("👧", 40, birdY + 10);
        }
        
        // Spawn pipes
        if (frameCount % 100 === 0) {
            const minH = 20;
            const maxH = canvas.height - pipeGap - minH;
            const topHeight = Math.floor(Math.random() * (maxH - minH)) + minH;
            pipes.push({
                x: canvas.width,
                top: topHeight,
                bottom: canvas.height - topHeight - pipeGap,
                passed: false
            });
        }
        
        // Move & Draw pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            const p = pipes[i];
            p.x -= 1.8;
            
            ctx.fillStyle = "var(--secondary-color)";
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
            
            // Collision Check
            if (40 + 12 > p.x && 40 - 12 < p.x + pipeWidth) {
                if (birdY - 12 < p.top || birdY + 12 > canvas.height - p.bottom) {
                    gameOver();
                }
            }
            
            // Score tracking
            if (!p.passed && p.x + pipeWidth < 40) {
                p.passed = true;
                score++;
                const sEl = document.getElementById("flappyScore");
                if (sEl) sEl.innerText = score;
                
                if (score >= 5) {
                    winStage();
                }
            }
            
            if (p.x + pipeWidth < 0) pipes.splice(i, 1);
        }
        
        frameCount++;
        animationId = requestAnimationFrame(gameLoop);
    }
    
    function gameOver() {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        window.playGameAudio("quizWrongSound");
        
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillText("Click Canvas to Restart", canvas.width / 2, canvas.height / 2 + 15);
        
        canvas.onclick = () => {
            canvas.onclick = flap;
            startFlappyRei(container);
        };
    }
    
    function winStage() {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        window.playGameAudio("quizWinSound");
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "var(--primary-color)";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎉 Stage Clear! 🎉", canvas.width / 2, canvas.height / 2);
        
        setTimeout(() => loadArcadeStage(2), 1500);
    }
    
    gameLoop();
}

/* 2. Cat Game Engine */
function startCatGame(container) {
    container.innerHTML = `
        <div class="game-container">
            <p class="game-instructions">Slide your finger/mouse on canvas to catch 10 hearts! 🐱</p>
            <div class="score-board">Caught: <span id="catScore">0</span> / 10</div>
            <canvas id="catCanvas" width="320" height="240" style="border: 2px dashed var(--primary-color); border-radius: 12px; background: #fff5f6; display: block; margin: 0 auto; max-width: 100%; cursor: none;"></canvas>
        </div>
    `;
    
    const canvas = document.getElementById("catCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    let score = 0;
    let isGameOver = false;
    let animationId;
    
    let catX = canvas.width / 2;
    const catY = canvas.height - 30;
    const catW = 45;
    const catH = 20;
    
    const hearts = [];
    let spawnTimer = 0;
    
    function updatePos(clientX) {
        const rect = canvas.getBoundingClientRect();
        catX = ((clientX - rect.left) / rect.width) * canvas.width;
        if (catX < catW / 2) catX = catW / 2;
        if (catX > canvas.width - catW / 2) catX = canvas.width - catW / 2;
    }
    
    canvas.addEventListener("mousemove", (e) => updatePos(e.clientX));
    canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) updatePos(e.touches[0].clientX);
        e.preventDefault();
    }, { passive: false });
    
    function gameLoop() {
        if (isGameOver) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff0f2";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Basket / Cat Basket
        ctx.fillStyle = "var(--primary-color)";
        ctx.beginPath();
        ctx.roundRect(catX - catW / 2, catY, catW, catH, [0, 0, 8, 8]);
        ctx.fill();
        
        // Cute Ears
        ctx.beginPath();
        ctx.moveTo(catX - catW / 2 + 3, catY);
        ctx.lineTo(catX - catW / 2 + 11, catY - 8);
        ctx.lineTo(catX - catW / 2 + 15, catY);
        ctx.moveTo(catX + catW / 2 - 3, catY);
        ctx.lineTo(catX + catW / 2 - 11, catY - 8);
        ctx.lineTo(catX + catW / 2 - 15, catY);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.font = "10px sans-serif";
        ctx.fillText("🐱", catX - 6, catY + 14);
        
        // Spawn Hearts
        spawnTimer++;
        if (spawnTimer % 40 === 0) {
            hearts.push({
                x: Math.random() * (canvas.width - 20) + 10,
                y: -10,
                speed: 1.8 + Math.random() * 1.5,
                size: 14 + Math.random() * 8
            });
        }
        
        // Handle Hearts falling
        for (let i = hearts.length - 1; i >= 0; i--) {
            const h = hearts[i];
            h.y += h.speed;
            
            ctx.fillStyle = "#ff4d6d";
            ctx.font = `${h.size}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText("💖", h.x, h.y);
            
            // Intersection catch
            if (h.y >= catY && h.y <= catY + catH) {
                if (h.x > catX - catW / 2 - 5 && h.x < catX + catW / 2 + 5) {
                    hearts.splice(i, 1);
                    score++;
                    window.playGameAudio("quizCorrectSound");
                    
                    const scoreEl = document.getElementById("catScore");
                    if (scoreEl) scoreEl.innerText = score;
                    
                    if (score >= 10) {
                        winStage();
                    }
                    continue;
                }
            }
            if (h.y > canvas.height + 20) hearts.splice(i, 1);
        }
        
        animationId = requestAnimationFrame(gameLoop);
    }
    
    function winStage() {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        window.playGameAudio("quizWinSound");
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "var(--primary-color)";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎉 Stage Clear! 🎉", canvas.width / 2, canvas.height / 2);
        
        setTimeout(() => loadArcadeStage(3), 1500);
    }
    
    gameLoop();
}

/* 3. Memory Match Engine */
function startMemoryMatchGame(container) {
    container.innerHTML = `
        <div class="game-container">
            <p class="game-instructions">Match all the duplicate pairs to unlock your gift! 🧠</p>
            <div id="memoryGrid" class="memory-grid"></div>
        </div>
    `;
    
    const grid = document.getElementById("memoryGrid");
    if (!grid) return;
    
    const emojis = ["🌸", "💖", "🐱", "🍦", "🎀", "🍰"];
    let cardsArray = [...emojis, ...emojis];
    
    cardsArray.sort(() => Math.random() - 0.5);
    
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matchesFound = 0;
    
    cardsArray.forEach((emoji) => {
        const card = document.createElement("div");
        card.className = "memory-card";
        card.dataset.emoji = emoji;
        
        card.innerHTML = `
            <div class="card-back"></div>
            <div class="card-front">
                <div class="card-front-content">${emoji}</div>
            </div>
        `;
        
        card.addEventListener("click", () => {
            if (lockBoard) return;
            if (card === firstCard) return;
            if (card.classList.contains("revealed")) return;
            
            card.classList.add("revealed");
            
            if (!firstCard) {
                firstCard = card;
                return;
            }
            
            secondCard = card;
            checkForMatch();
        });
        
        grid.appendChild(card);
    });
    
    function checkForMatch() {
        lockBoard = true;
        const isMatch = firstCard.dataset.emoji === secondCard.dataset.emoji;
        
        if (isMatch) {
            disableCards();
        } else {
            unflipCards();
        }
    }
    
    function disableCards() {
        window.playGameAudio("quizCorrectSound");
        matchesFound++;
        resetBoard();
        
        if (matchesFound === emojis.length) {
            setTimeout(() => {
                window.playGameAudio("quizWinSound");
                alert("🎉 Success! You've conquered all challenges! 🎁");
                window.handleActualGiftUnlock();
            }, 800);
        }
    }
    
    function unflipCards() {
        window.playGameAudio("quizWrongSound");
        setTimeout(() => {
            firstCard.classList.remove("revealed");
            secondCard.classList.remove("revealed");
            resetBoard();
        }, 1000);
    }
    
    function resetBoard() {
        [firstCard, secondCard] = [null, null];
        lockBoard = false;
    }
}

window.launchMemoryGame = function() {
    window.initArcadeChain();
    setTimeout(() => loadArcadeStage(3), 100);
};

// ==========================================
// DYNAMIC TRIVIA QUIZ SYSTEM
// ==========================================
const QUIZ_QUESTIONS = [
    {
        question: "When is your ultimate IVE bias Rei's birthday? 🎂",
        choices: ["February 3, 2004", "April 25, 2004", "July 16, 2004", "August 31, 2004"],
        correct: 0,
        imgCorrect: "pics/rei-happy.jpg", 
        imgWrong: "pics/rei-disappointed.jpg"
    },
    {
        question: "What were our sequential queue numbers when we met? 🎟️",
        choices: ["331 & 332", "333 & 334", "334 & 335", "335 & 336"],
        hint: "💡 Hint: Take a look at the wristbands in our first photo timeline entry!",
        correct: 0,
        imgCorrect: "pics/rei-happy.jpg", 
        imgWrong: "pics/rei-disappointed.jpg"
    },
    {
        question: "How old is Akina officially turning today on July 16th? ✨",
        choices: ["28 Years Old", "29 Years Old", "30 Years Old", "A timeless K-Pop Icon"],
        correct: 2,
        imgCorrect: "pics/rei-happy.jpg", 
        imgWrong: "pics/rei-disappointed.jpg"
    }
];

let quizIndex = 0;

function loadQuizQuestion() {
    const currentData = QUIZ_QUESTIONS[quizIndex];
    
    const numElem = document.getElementById("currentQuestionNum");
    const textElem = document.getElementById("questionText");
    const gridElem = document.getElementById("choicesGrid");
    const feedbackElem = document.getElementById("quizFeedback");
    
    if (!numElem || !textElem || !gridElem) return;

    numElem.innerText = quizIndex + 1;
    
    let questionContent = currentData.question;
    if (currentData.hint) {
        questionContent += `<br><span style="font-size:0.8rem; color:#888; font-style:italic; font-weight:normal;">${currentData.hint}</span>`;
    }
    textElem.innerHTML = questionContent;
    
    gridElem.innerHTML = "";
    currentData.choices.forEach((choice, idx) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerText = choice;
        btn.onclick = function() { handleChoiceSelection(idx, this); };
        gridElem.appendChild(btn);
    });
    
    if (feedbackElem) feedbackElem.innerText = "";
}

window.showReactionPopup = function(imgSrc, title, desc, color, duration, callback) {
    const pop = document.getElementById("dynamicReactionPop");
    const img = document.getElementById("reactionImage");
    const titleEl = document.getElementById("reactionTitle");
    const descEl = document.getElementById("reactionDesc");
    
    if (img) img.src = imgSrc;
    if (titleEl) {
        titleEl.innerText = title;
        titleEl.style.color = color;
    }
    if (descEl) descEl.innerText = desc;
    
    if (pop) {
        pop.classList.remove("hidden");
        setTimeout(() => {
            pop.classList.add("hidden");
            if(callback) callback();
        }, duration);
    } else {
        if(callback) callback();
    }
};

window.playGameAudio = function(audioId) {
    const audio = document.getElementById(audioId);
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio prevented:", e));
    }
};

function handleChoiceSelection(selectedIdx, clickedBtn) {
    const feedback = document.getElementById("quizFeedback");
    const currentData = QUIZ_QUESTIONS[quizIndex];
    
    if (!feedback) return;

    const allBtns = document.querySelectorAll('.choice-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    if (selectedIdx === currentData.correct) {
        window.playGameAudio("quizCorrectSound"); 
        clickedBtn.classList.add("btn-success-pop");
        feedback.className = "quiz-feedback-msg quiz-correct";
        feedback.innerText = "Correct! Spot on! 🎉";
        
        window.showReactionPopup(currentData.imgCorrect, "CORRECT!", "Rei is proud of you! ✨", "#2a9d8f", 1600, () => {
            quizIndex++;
            if (quizIndex < QUIZ_QUESTIONS.length) {
                loadQuizQuestion();
            } else {
                handleQuizSuccess();
            }
        });

    } else {
        window.playGameAudio("quizWrongSound"); 
        clickedBtn.classList.add("btn-error-shake");
        feedback.className = "quiz-feedback-msg quiz-wrong";
        feedback.innerText = "Ouch! Incorrect choice. Try that one again! 💕";
        
        window.showReactionPopup(currentData.imgWrong, "WRONG ANSWER!", "Rei is mad, let's try again! 🥺", "#d90429", 1400, () => {
            clickedBtn.classList.remove("btn-error-shake");
            feedback.innerText = "";
            allBtns.forEach(b => b.style.pointerEvents = 'auto');
        });
    }
}

function handleQuizSuccess() {
    window.playGameAudio("quizWinSound"); 
    const quizBox = document.getElementById("quizContainer");
    if (quizBox) {
        quizBox.innerHTML = "<h3 style='color: #06d6a0; margin: 0;'>🎉 Access Granted! 🎉</h3><p style='color: #555; font-size: 0.9rem;'>Booting up Rei's Console System...</p>";
        
        setTimeout(() => {
            document.getElementById("lockedState").classList.add("hidden");
            document.getElementById("arcadeState").classList.remove("hidden");
            document.getElementById("arcadeState").style.display = "flex";
            
            window.initArcadeChain();
        }, 1500);
    }
}

window.handleActualGiftUnlock = function() {
    const arcadeState = document.getElementById("arcadeState");
    if (arcadeState) {
        arcadeState.classList.add("hidden");
        arcadeState.style.display = "none";
    }
    
    const unlockedState = document.getElementById("unlockedState");
    if (unlockedState) {
        unlockedState.classList.remove("hidden");
        unlockedState.style.display = "flex";
    }
    
    const unlockContainer = document.getElementById("mainReiBg");
    if (unlockContainer) {
        for (let i = 0; i < 20; i++) {
            const tempRei = document.createElement("div");
            tempRei.className = `rei-plush bubble-${((i) % 10) + 1}`;
            tempRei.style.animationDuration = "2s"; 
            unlockContainer.appendChild(tempRei);
            setTimeout(() => { if (tempRei.parentNode) tempRei.parentNode.removeChild(tempRei); }, 2500);
        }
    }

    (async () => {
        const notifyTextEl = document.getElementById('ownerNotifyText');
        if (notifyTextEl) notifyTextEl.innerText = 'Notifying owner...';
        const ok = await notifyOwnerViaSheety('auto_unlock', { source: 'client' });
        if (notifyTextEl) {
            if (ok) notifyTextEl.innerText = 'Owner has been successfully notified!';
            else notifyTextEl.innerText = 'Finished successfully! (Please screenshot this and send to Rjo along with your QR codeto claim your prize xD)';
        }
    })();
};

async function notifyOwnerViaSheety(messageKey, meta = {}) {
    try {
        const payload = { 
            notification: { 
                messageKey: messageKey || '', 
                type: 'unlock', 
                status: 'celebrant_finished', 
                timestamp: new Date().toISOString(), 
                meta: JSON.stringify(meta) 
            } 
        };
        const res = await fetch(SHEETY_NOTIFICATIONS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok;
    } catch (err) {
        console.error('Notify owner failed:', err);
        const q = JSON.parse(localStorage.getItem('sheetyNotifyQueue') || '[]');
        q.push({ messageKey, meta, ts: new Date().toISOString() });
        localStorage.setItem('sheetyNotifyQueue', JSON.stringify(q));
        return false;
    }
}

async function flushSheetyNotifyQueue() {
    const q = JSON.parse(localStorage.getItem('sheetyNotifyQueue') || '[]');
    if (!Array.isArray(q) || q.length === 0) return;
    const remaining = [];
    for (const item of q) {
        try {
            const ok = await notifyOwnerViaSheety(item.messageKey, item.meta || {});
            if (!ok) remaining.push(item);
        } catch (e) { remaining.push(item); }
    }
    localStorage.setItem('sheetyNotifyQueue', JSON.stringify(remaining));
}

async function flushSheetyReactionQueue() {
    const q = JSON.parse(localStorage.getItem('sheetyReactionQueue') || '[]');
    if (!Array.isArray(q) || q.length === 0) return;
    const remaining = [];
    for (const item of q) {
        try {
            const { rowId, reactionId } = item;
            const res = await fetch(`${SHEETY_API_URL}/${rowId}`);
            if (!res.ok) { remaining.push(item); continue; }
            const data = await res.json();
            const serverRow = data.sheet1 || {};
            const updated = {};
            
            REACTION_TYPES.forEach(t => {
                const camelColName = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`;
                const lowerColName = `reaction${t.id.toLowerCase()}`;
                const current = parseInt(serverRow[lowerColName] !== undefined ? serverRow[lowerColName] : (serverRow[camelColName] || 0), 10);
                const incremented = current + (t.id === reactionId ? 1 : 0);
                updated[lowerColName] = incremented;
                updated[camelColName] = incremented;
            });
            const patchRes = await fetch(`${SHEETY_API_URL}/${rowId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet1: updated })
            });
            if (!patchRes.ok) remaining.push(item);
        } catch (e) { remaining.push(item); }
    }
    localStorage.setItem('sheetyReactionQueue', JSON.stringify(remaining));
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('ownerMarkDone');
    const link = document.getElementById('viewSheetLink');
    if (btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true; btn.innerText = 'Marking...';
            await notifyOwnerViaSheety('manual_owner_mark', { manual: true });
            btn.innerText = 'Marked';
            setTimeout(() => { btn.disabled = false; btn.innerText = 'Mark as Sent'; }, 3000);
        });
    }
    if (link) {
        link.href = 'https://docs.google.com/spreadsheets/';
    }
    flushSheetyNotifyQueue();
    flushSheetyReactionQueue();
});

window.triggerGiftHint = function() {
    alert("Crack the 3 trivia questions below to open this gift box! 🌸");
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    generateFloatingReis();
    await syncSecureTime();

    const loginUserEl = document.getElementById("loginUser");
    const loginPassEl = document.getElementById("loginPass");
    const handleLoginEnter = (e) => {
        if (e.key === "Enter") processLogin();
    };
    if (loginUserEl) loginUserEl.addEventListener("keydown", handleLoginEnter);
    if (loginPassEl) loginPassEl.addEventListener("keydown", handleLoginEnter);

    const galleryImages = document.querySelectorAll('.gallery-img');
    galleryImages.forEach((img, idx) => {
        allImages.push(img.src);
        img.style.cursor = "pointer";
        img.addEventListener('click', () => openLightbox(idx));
    });

    const modal = document.getElementById("lightboxModal");
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeLightbox();
        });
    }
    
    loadQuizQuestion();
});

// ==========================================
// GLOBAL TAP EFFECT (Pure CSS/JS Golden Particle Burst)
// ==========================================
document.addEventListener("click", function(e) {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) return;

    const burstContainer = document.createElement("div");
    burstContainer.className = "sparkle-burst";
    burstContainer.style.left = `${e.clientX}px`;
    burstContainer.style.top = `${e.clientY}px`;
    document.body.appendChild(burstContainer);

    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "sparkle-particle";
        
        const angle = (i / particleCount) * 2 * Math.PI + (Math.random() * 0.4 - 0.2);
        const distance = 25 + Math.random() * 35; 
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        particle.style.setProperty('--x', `${x}px`);
        particle.style.setProperty('--y', `${y}px`);
        
        const size = 3 + Math.random() * 4; 
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
        particle.style.animationDelay = `${Math.random() * 0.05}s`;

        burstContainer.appendChild(particle);
    }

    setTimeout(() => {
        if (burstContainer.parentNode) {
            burstContainer.parentNode.removeChild(burstContainer);
        }
    }, 1000);
});