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
window.processLogin = function() {
    const userEl = document.getElementById("loginUser").value.trim().toLowerCase();
    const passEl = document.getElementById("loginPass").value.trim();
    const errEl = document.getElementById("loginError");

    if (btoa(userEl) === "YWtpbmE=" && btoa(passEl) === "ZGl2ZTIwMjY=") {
        document.getElementById("loginScreen").style.display = "none";
        const mainContent = document.getElementById("mainContent");
        mainContent.style.display = "flex";
        setTimeout(() => { mainContent.style.opacity = "1"; }, 50);
        
        renderGreetings();
    } else {
        errEl.innerText = "Incorrect Credentials. Try again.";
    }
};

// ==========================================
// GREETINGS & SHEETY API INTEGRATION
// ==========================================
const SHEETY_API_URL = "https://api.sheety.co/d085eb98fe3832247bd18be97eebcba2/birthdayGreetingsMessages/sheet1";

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
            
            card.innerHTML = `
                <h4>${gName}</h4>
                <p>${gMsg}</p>
                <div style="font-size: 0.7rem; color: #aaa; margin-top: 5px;">${gTime}</div>
            `;
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
        clickedBtn.classList.add("btn-error-shake");
        feedback.className = "quiz-feedback-msg quiz-wrong";
        feedback.innerText = "Ouch! Incorrect choice. Try that one again! 💕";
        
        // Show Sad Rei Popup!
        showReactionPopup(currentData.imgWrong, "WRONG ANSWER!", "Rei is sad, let's try again! 🥺", "#d90429", 1400, () => {
            clickedBtn.classList.remove("btn-error-shake");
            feedback.innerText = "";
            allBtns.forEach(b => b.style.pointerEvents = 'auto');
        });
    }
}

function handleQuizSuccess() {
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

// CALLED BY crosswalk-cat.js WHEN STAGE 2 IS BEATEN
window.handleActualGiftUnlock = function() {
    document.getElementById("arcadeState").classList.add("hidden");
    document.getElementById("arcadeState").style.display = "none";
    document.getElementById("unlockedState").classList.remove("hidden");
    
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
};

window.triggerGiftHint = function() {
    alert("Crack the 3 trivia questions below to open this gift box! 🌸");
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    generateFloatingReis();
    await syncSecureTime();

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