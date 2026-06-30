// ==========================================
// CONFIGURATION & SECURITY MANAGEMENT
// ==========================================
const IS_DRY_RUN = false; 

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
    row.querySelectorAll('.reaction-btn').forEach((btn) => {
        const reactionId = btn.dataset.reactionId;
        const countSpan = btn.querySelector('.reaction-count');
        if (reactionId && countSpan) {
            countSpan.innerText = counts[reactionId] || 0;
        }
    });
}

async function updateGreetingReaction(key, reactionId, row) {
    // Prefer server-backed update when row has an associated Sheety row id
    const rowId = row && row.dataset && row.dataset.rowId;
    if (rowId) {
        try {
            // Read current server counts
            const res = await fetch(`${SHEETY_API_URL}/${rowId}`);
            if (res.ok) {
                const data = await res.json();
                const serverRow = data.sheet1 || {};
                const updated = {};
                
                REACTION_TYPES.forEach(t => {
                    // FIX: Match Sheety's camelCase naming convention (reactionLove, reactionSparkle, etc.)
                    const colName = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`;
                    const current = parseInt(serverRow[colName] || 0, 10);
                    updated[colName] = current + (t.id === reactionId ? 1 : 0);
                });

                const payload = { sheet1: updated };
                const patchRes = await fetch(`${SHEETY_API_URL}/${rowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (patchRes.ok) {
                    // Update UI with new counts from server response
                    const patched = await patchRes.json();
                    const patchedRow = patched.sheet1 || {};
                    const counts = {};
                    REACTION_TYPES.forEach(t => {
                        const colName = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`;
                        counts[t.id] = patchedRow[colName] || 0;
                    });
                    updateReactionCountsInRow(row, counts);
                    return;
                }
            }
        } catch (err) {
            console.warn('Server reaction update failed, queuing locally', err);
            // fall through to local queue
        }

        // Queue fallback for later retry
        const q = JSON.parse(localStorage.getItem('sheetyReactionQueue') || '[]');
        q.push({ rowId, reactionId, ts: new Date().toISOString() });
        localStorage.setItem('sheetyReactionQueue', JSON.stringify(q));
    }

    // Fallback: localStorage optimistic update
    const storage = loadReactionStorage();
    const counts = storage[key] || {};
    counts[reactionId] = (counts[reactionId] || 0) + 1;
    storage[key] = counts;
    saveReactionStorage(storage);
    updateReactionCountsInRow(row, getReactionCounts(key));
}

function createReactionRow(key) {
    const counts = getReactionCounts(key);
    const row = document.createElement('div');
    row.className = 'reaction-row';

    // row.dataset.rowId is set by renderGreetings when available

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

    // Structure mapped to CamelCase columns in Sheety based on headers
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
        
        // Reverse array to show latest greeting at the top
        [...greetings].reverse().forEach(g => {
            const card = document.createElement("div");
            card.className = "greeting-card";
            
            // Handle potentially empty/undefined rows returned from Sheety
            const gName = g.name || "Anonymous";
            const gMsg = g.message || "";
            const gTime = g.timestamp || "";
            const messageKey = buildGreetingKey({ name: gName, message: gMsg, timestamp: gTime });

            // If Sheety exposes reaction columns, prefer server counts
            const serverCounts = {};
            REACTION_TYPES.forEach(t => { 
                const colName = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`;
                serverCounts[t.id] = g[colName] || 0; 
            });

            card.innerHTML = `
                <h4>${gName}</h4>
                <p>${gMsg}</p>
                <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">${gTime}</div>
            `;
            const reactionRow = createReactionRow(messageKey);
            // Attach Sheety row id so reactions can be updated server-side when possible
            if (g.id) reactionRow.dataset.rowId = g.id;
            // If serverCounts provided, set them on the row UI
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

window.launchMemoryGame = function() {
    if (document.getElementById("practiceArena").classList.contains("hidden")) {
        window.startPracticeMode();
        setTimeout(() => window.switchPracticeStage(3), 120);
    } else {
        window.switchPracticeStage(3);
    }
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

// UNIVERSAL POPUP CONTROLLER
window.showReactionPopup = function(imgSrc, title, desc, color, duration, callback) {
    const pop = document.getElementById("dynamicReactionPop");
    const img = document.getElementById("reactionImage");
    const titleEl = document.getElementById("reactionTitle");
    const descEl = document.getElementById("reactionDesc");
    
    img.src = imgSrc;
    titleEl.innerText = title;
    titleEl.style.color = color;
    descEl.innerText = desc;
    
    pop.classList.remove("hidden");
    
    setTimeout(() => {
        pop.classList.add("hidden");
        if(callback) callback();
    }, duration);
};

// --- 🌟 GLOBAL AUDIO HELPER ---
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
        window.playGameAudio("quizCorrectSound"); // 🎵 CORRECT SOUND
        clickedBtn.classList.add("btn-success-pop");
        feedback.className = "quiz-feedback-msg quiz-correct";
        feedback.innerText = "Correct! Spot on! 🎉";
        
        // Show Happy Rei Popup!
        showReactionPopup(currentData.imgCorrect, "CORRECT!", "Rei is proud of you! ✨", "#2a9d8f", 1600, () => {
            quizIndex++;
            if (quizIndex < QUIZ_QUESTIONS.length) {
                loadQuizQuestion();
            } else {
                handleQuizSuccess();
            }
        });

    } else {
        window.playGameAudio("quizWrongSound"); // 🎵 WRONG SOUND
        clickedBtn.classList.add("btn-error-shake");
        feedback.className = "quiz-feedback-msg quiz-wrong";
        feedback.innerText = "Ouch! Incorrect choice. Try that one again! 💕";
        
        // Show Sad Rei Popup!
        showReactionPopup(currentData.imgWrong, "WRONG ANSWER!", "Rei is mad, let's try again! 🥺", "#d90429", 1400, () => {
            clickedBtn.classList.remove("btn-error-shake");
            feedback.innerText = "";
            allBtns.forEach(b => b.style.pointerEvents = 'auto');
        });
    }
}

function handleQuizSuccess() {
    window.playGameAudio("quizWinSound"); // 🎵 QUIZ FINISHED SOUND
    const quizBox = document.getElementById("quizContainer");
    if (quizBox) {
        quizBox.innerHTML = "<h3 style='color: #06d6a0; margin: 0;'>🎉 Access Granted! 🎉</h3><p style='color: #555; font-size: 0.9rem;'>Booting up Rei's Console System...</p>";
        
        setTimeout(() => {
            document.getElementById("lockedState").classList.add("hidden");
            document.getElementById("arcadeState").classList.remove("hidden");
            
            document.getElementById("arcadeState").style.display = "flex";
            if (typeof window.initArcadeChain === "function") {
                window.initArcadeChain();
            } else {
                console.warn("initArcadeChain missing!");
                window.handleActualGiftUnlock();
            }
        }, 1500);
    }
}

// CALLED BY memory-game.js WHEN STAGE 3 IS BEATEN
window.handleActualGiftUnlock = function() {
    document.getElementById("arcadeState").classList.add("hidden");
    document.getElementById("arcadeState").style.display = "none";
    
    const unlockedState = document.getElementById("unlockedState");
    unlockedState.classList.remove("hidden");
    unlockedState.style.display = "flex";
    
    // Quick burst of Reis on unlock!
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

    // Attempt to notify owner via Sheety and update the unlock notice
    (async () => {
        const notifyTextEl = document.getElementById('ownerNotifyText');
        if (notifyTextEl) notifyTextEl.innerText = 'Notifying owner...';
        const ok = await notifyOwnerViaSheety('auto_unlock', { source: 'client' });
        if (notifyTextEl) {
            if (ok) notifyTextEl.innerText = 'Owner has been successfully notified!';
            else notifyTextEl.innerText = 'Finished successfully! (Please screenshot this and send to Rjo to claim your prize xD)';
        }
    })();
};

// Notify owner via Sheety notifications sheet
async function notifyOwnerViaSheety(messageKey, meta = {}) {
    try {
        // FIX: The root key MUST be 'notification' (singular endpoint name) for Sheety to accept it!
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
        // queue locally for retry
        const q = JSON.parse(localStorage.getItem('sheetyNotifyQueue') || '[]');
        q.push({ messageKey, meta, ts: new Date().toISOString() });
        localStorage.setItem('sheetyNotifyQueue', JSON.stringify(q));
        return false;
    }
}

// Flush queued notifications
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

// Helper to update reaction counts in an existing reaction row element
function updateReactionCountsInRow(rowEl, counts) {
    try {
        const buttons = rowEl.querySelectorAll('.reaction-btn');
        buttons.forEach(btn => {
            const id = btn.dataset.reactionId;
            if (counts[id] !== undefined) {
                const badge = btn.querySelector('.reaction-count');
                if (badge) badge.innerText = counts[id];
            }
        });
    } catch (e) { console.warn('updateReactionCountsInRow failed', e); }
}

// Flush queued reaction updates
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
                const colName = `reaction${t.id.charAt(0).toUpperCase() + t.id.slice(1)}`;
                const current = parseInt(serverRow[colName] || 0, 10);
                updated[colName] = current + (t.id === reactionId ? 1 : 0);
            });
            const patchRes = await fetch(`${SHEETY_API_URL}/${rowId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet1: updated })
            });
            if (!patchRes.ok) remaining.push(item);
        } catch (e) { remaining.push(item); }
    }
    localStorage.setItem('sheetyReactionQueue', JSON.stringify(remaining));
}

// Wire owner mark-as-sent button and flush queue on load
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

    // --- 🌟 LOGIN ENTER KEY LISTENER ---
    const loginUserEl = document.getElementById("loginUser");
    const loginPassEl = document.getElementById("loginPass");
    const handleLoginEnter = (e) => {
        if (e.key === "Enter") processLogin();
    };
    if (loginUserEl) loginUserEl.addEventListener("keydown", handleLoginEnter);
    if (loginPassEl) loginPassEl.addEventListener("keydown", handleLoginEnter);

    // Populate images for gallery
    const galleryImages = document.querySelectorAll('.gallery-img');
    galleryImages.forEach((img, idx) => {
        allImages.push(img.src);
        img.style.cursor = "pointer";
        img.addEventListener('click', () => openLightbox(idx));
    });

    // Close lightbox background click
    const modal = document.getElementById("lightboxModal");
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeLightbox();
        });
    }
    
    // Load first question if on main page
    loadQuizQuestion();
});