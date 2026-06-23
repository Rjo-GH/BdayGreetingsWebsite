// ==========================================
// arcade-state.js
// GLOBAL ARCADE STATE CONTROLLER
// ==========================================
let currentStage = 1; 
let isPracticeMode = false; 

window.initArcadeChain = function() {
    console.log("Arcade Chain Initialized!");
    isPracticeMode = false;
    currentStage = 1;
    
    document.getElementById("flappyStage").classList.remove("hidden");
    document.getElementById("crosswalkStage").classList.add("hidden");
    
    if (typeof initFlappyGame === "function") initFlappyGame();
};

window.startPracticeMode = function() {
    console.log("Practice Mode Started!");
    isPracticeMode = true;
    
    document.getElementById("openPracticeBtn").classList.add("hidden");
    document.getElementById("practiceArena").classList.remove("hidden");
    
    setupPracticeNavigation();
    window.switchPracticeStage(1);
};

function setupPracticeNavigation() {
    const statusEl = document.getElementById("practiceStatus");
    if (!statusEl) return;
    
    statusEl.innerHTML = "";
    statusEl.style.display = "flex";
    statusEl.style.flexDirection = "column";
    statusEl.style.gap = "10px";
    statusEl.style.alignItems = "center";
    statusEl.style.marginBottom = "15px";

    const label = document.createElement("div");
    label.innerText = "🛠️ PRACTICE TESTING AREA (SELECT GAME):";
    label.style.fontSize = "11px";
    label.style.fontWeight = "bold";
    label.style.color = "#aaa";
    
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.gap = "8px";
    
    const btn1 = document.createElement("button");
    btn1.id = "btnSelectPracticeFlappy";
    btn1.innerText = "🕹️ Play Flappy Rei Game"; /* TWEAKED TEXT */
    btn1.style.cssText = "padding: 6px 12px; font-size: 12px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; background: #ff758f; color: white;";
    btn1.onclick = () => window.switchPracticeStage(1);
    
    const btn2 = document.createElement("button");
    btn2.id = "btnSelectPracticeCrosswalk";
    btn2.innerText = "🐱 Play Cat Game";
    btn2.style.cssText = "padding: 6px 12px; font-size: 12px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; background: #2b2d42; color: white; border: 1px solid #8d99ae;";
    btn2.onclick = () => window.switchPracticeStage(2);
    
    navContainer.appendChild(btn1);
    navContainer.appendChild(btn2);
    statusEl.appendChild(label);
    statusEl.appendChild(navContainer);
}

window.switchPracticeStage = function(stageNum) {
    if (!isPracticeMode) return;
    
    currentStage = stageNum;
    
    const btnFlappy = document.getElementById("btnSelectPracticeFlappy");
    const btnCrosswalk = document.getElementById("btnSelectPracticeCrosswalk");
    const stageFlappy = document.getElementById("practiceFlappyStage");
    const stageCrosswalk = document.getElementById("practiceCrosswalkStage");

    if (stageNum === 1) {
        if(btnFlappy) { btnFlappy.style.background = "#ff758f"; btnFlappy.style.border = "none"; }
        if(btnCrosswalk) { btnCrosswalk.style.background = "#2b2d42"; btnCrosswalk.style.border = "1px solid #8d99ae"; }
        
        if(stageFlappy) stageFlappy.classList.remove("hidden");
        if(stageCrosswalk) stageCrosswalk.classList.add("hidden");
        
        if (typeof initFlappyGame === "function") initFlappyGame();
    } else if (stageNum === 2) {
        if(btnFlappy) { btnFlappy.style.background = "#2b2d42"; btnFlappy.style.border = "1px solid #8d99ae"; }
        if(btnCrosswalk) { btnCrosswalk.style.background = "#ff758f"; btnCrosswalk.style.border = "none"; }
        
        if(stageFlappy) stageFlappy.classList.add("hidden");
        if(stageCrosswalk) stageCrosswalk.classList.remove("hidden");
        
        if (typeof initCrosswalkGame === "function") initCrosswalkGame();
    }
};

window.closePracticeMode = function() {
    isPracticeMode = false;
    currentStage = 0; 
    
    const bgAudio = document.getElementById("catBgMusic");
    if(bgAudio) bgAudio.pause();

    const flappyBgAudio = document.getElementById("flappyBgMusic");
    if(flappyBgAudio) flappyBgAudio.pause();

    document.getElementById("practiceArena").classList.add("hidden");
    document.getElementById("openPracticeBtn").classList.remove("hidden");
};