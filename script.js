// ==========================================
// CONFIGURATION & SECURITY MANAGEMENT
// ==========================================
// 🛠️ TRUE = Bypasses countdown lock instantly so you can test on your desktop.
// 🚀 FALSE = Activates countdown for live deployment.
const IS_DRY_RUN = true; 

// Target Date: July 16, 2026, 00:00:00 JST (UTC+9)
const TARGET_DATE_JST = new Date("2026-07-16T00:00:00+09:00").getTime();
let serverTimeOffset = 0;

// Fetch secure network time once when the page loads so she can't cheat the clock
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
        clearInterval(countdownInterval);
        hideCountdownLock();
        return;
    }

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
    const mainContent = document.getElementById("mainContent");
    
    if (lockScreen) {
        lockScreen.style.display = "none";
        lockScreen.innerHTML = ""; 
    }
    
    if (mainContent) {
        mainContent.style.display = "flex";
        setTimeout(() => { mainContent.style.opacity = "1"; }, 50);
    }
}

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
// DYNAMIC TRIVIA QUIZ SYSTEM
// ==========================================
const QUIZ_QUESTIONS = [
    {
        question: "When is your ultimate IVE bias Rei's birthday? 🎂",
        choices: ["February 3, 2004", "April 25, 2004", "July 16, 2004", "August 31, 2004"],
        correct: 0 
    },
    {
        question: "What were our sequential queue numbers when we met? 🎟️",
        choices: ["331 & 332", "333 & 334", "334 & 335", "335 & 336"],
        hint: "💡 Hint: Take a look at the wristbands in our first photo timeline entry!",
        correct: 0 
    },
    {
        question: "How old is Akina officially turning today on July 16th? ✨",
        choices: ["28 Years Old", "29 Years Old", "30 Years Old", "A timeless K-Pop Icon"],
        correct: 2 
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

function handleChoiceSelection(selectedIdx, clickedBtn) {
    const feedback = document.getElementById("quizFeedback");
    const currentData = QUIZ_QUESTIONS[quizIndex];
    
    if (!feedback) return;

    const allBtns = document.querySelectorAll('.choice-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');

    if (selectedIdx === currentData.correct) {
        clickedBtn.classList.add("btn-success-pop");
        feedback.className = "quiz-feedback-msg quiz-correct";
        feedback.innerText = "Correct! Spot on! 🎉";
        
        setTimeout(() => {
            quizIndex++;
            if (quizIndex < QUIZ_QUESTIONS.length) {
                loadQuizQuestion();
            } else {
                handleQuizSuccess();
            }
        }, 1200);
    } else {
        clickedBtn.classList.add("btn-error-shake");
        feedback.className = "quiz-feedback-msg quiz-wrong";
        feedback.innerText = "Ouch! Incorrect choice. Try that one again! 💕";
        
        setTimeout(() => {
            clickedBtn.classList.remove("btn-error-shake");
            feedback.innerText = "";
            allBtns.forEach(b => b.style.pointerEvents = 'auto');
        }, 800);
    }
}

// 🎮 REDIRECTS QUIZ SUCCESS STRAIGHT TO THE GAMES INSIDE GAMES.JS
function handleQuizSuccess() {
    const lockedState = document.getElementById("lockedState");
    const arcadeState = document.getElementById("arcadeState"); // 🛠️ Reconciled ID mapping bug

    // Hide the quiz panel layout
    if (lockedState) {
        lockedState.classList.add("hidden");
        lockedState.style.display = "none";
    }
    
    // Show the Arcade Arena frame wrapper layout
    if (arcadeState) {
        arcadeState.classList.remove("hidden");
        arcadeState.style.display = "block";
    }
    
    // Switch on the game engine kickoff code located inside games.js
    if (typeof window.initArcadeChain === "function") {
        console.log("Launching arcade games...");
        window.initArcadeChain();
    } else {
        console.error("Critical Error: games.js failed to provide initArcadeChain!");
        if (arcadeState) {
            arcadeState.innerHTML += `<p style="color: red; font-weight: bold; padding: 10px;">Game engine error: games.js script file was not detected or failed to load.</p>`;
        }
    }
}

// Master layout opener called once games are completely cleared by games.js
window.handleActualGiftUnlock = function() {
    const unlockedState = document.getElementById("unlockedState");
    const giftContainer = document.getElementById("giftContainer");
    const arcadeState = document.getElementById("arcadeState"); // 🛠️ Reconciled ID mapping bug
    
    if (arcadeState) {
        arcadeState.classList.add("hidden");
        arcadeState.style.display = "none";
    }
    if (giftContainer) {
        giftContainer.style.borderColor = "#2a9d8f";
        giftContainer.style.transform = "scale(1.02)";
    }
    if (unlockedState) {
        unlockedState.classList.remove("hidden");
        unlockedState.style.display = "block";
    }
};

// ==========================================
// MASTER INITIALIZATION & CONTROLLERS
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
    if (!IS_DRY_RUN) {
        await syncSecureTime();
    }

    if (IS_DRY_RUN) {
        const badge = document.createElement("div");
        badge.innerHTML = "🔧 Dry Run Active (Countdown Bypassed)";
        badge.style.position = "fixed";
        badge.style.top = "10px";
        badge.style.left = "10px";
        badge.style.background = "rgba(0, 0, 0, 0.8)";
        badge.style.color = "#ff758f";
        badge.style.padding = "6px 12px";
        badge.style.borderRadius = "30px";
        badge.style.fontSize = "11px";
        badge.style.fontWeight = "bold";
        badge.style.zIndex = "100000";
        document.body.appendChild(badge);
        
        hideCountdownLock();
    }

    const galleryElems = document.querySelectorAll(".gallery-img");
    galleryElems.forEach((img, index) => {
        allImages.push(img.src);
        img.style.cursor = "pointer";
        img.addEventListener("click", () => {
            openLightbox(index);
        });
    });

    const lbModal = document.getElementById("lightboxModal");
    if (lbModal) {
        lbModal.addEventListener("click", function(e) {
            if (e.target === this) closeLightbox();
        });
    }

    loadQuizQuestion();
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('choice-btn')) return;

    const burst = document.createElement('div');
    burst.className = 'click-burst';
    burst.style.left = `${e.clientX}px`;
    burst.style.top = `${e.clientY}px`;
    
    document.body.appendChild(burst);
    setTimeout(() => { burst.remove(); }, 500);
});

function triggerGiftHint() {
    const giftIcon = document.querySelector('.gift-box-animated');
    if (!giftIcon) return;
    
    giftIcon.classList.add('gift-bounce');
    setTimeout(() => { giftIcon.classList.remove('gift-bounce'); }, 400);
}