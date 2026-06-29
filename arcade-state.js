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
    document.getElementById("memoryStage").classList.add("hidden");
    
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
    label.innerText = "🛠️ PRACTICE MENU: Flappy Rei → Cat Game → Memory";
    label.style.fontSize = "10px";
    label.style.fontWeight = "bold";
    label.style.color = "#aaa";
    
    const navContainer = document.createElement("div");
    navContainer.style.display = "flex";
    navContainer.style.gap = "8px";
    
    const btn1 = document.createElement("button");
    btn1.id = "btnSelectPracticeFlappy";
    btn1.innerText = "🕹️ Flappy Rei";
    btn1.style.cssText = "padding: 5px 10px; font-size: 10px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; background: #ff758f; color: white;";
    btn1.onclick = () => window.switchPracticeStage(1);
    
    const btn2 = document.createElement("button");
    btn2.id = "btnSelectPracticeCrosswalk";
    btn2.innerText = "🐱 Cat Game";
    btn2.style.cssText = "padding: 5px 10px; font-size: 10px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; background: #2b2d42; color: white; border: 1px solid #8d99ae;";
    btn2.onclick = () => window.switchPracticeStage(2);

    const btn3 = document.createElement("button");
    btn3.id = "btnSelectPracticeMemory";
    btn3.innerText = "🧠 Memory";
    btn3.style.cssText = "padding: 5px 10px; font-size: 10px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; background: #ff758f; color: white;";
    btn3.onclick = () => window.switchPracticeStage(3);
    
    navContainer.appendChild(btn1);
    navContainer.appendChild(btn2);
    navContainer.appendChild(btn3);
    statusEl.appendChild(label);
    statusEl.appendChild(navContainer);
}

window.switchPracticeStage = function(stageNum) {
    if (!isPracticeMode) return;
    
    currentStage = stageNum;
    
    const btnFlappy = document.getElementById("btnSelectPracticeFlappy");
    const btnCrosswalk = document.getElementById("btnSelectPracticeCrosswalk");
    const btnMemory = document.getElementById("btnSelectPracticeMemory");
    const stageFlappy = document.getElementById("practiceFlappyStage");
    const stageCrosswalk = document.getElementById("practiceCrosswalkStage");
    const stageMemory = document.getElementById("practiceMemoryStage");

    if (stageNum === 1) {
        if(btnFlappy) { btnFlappy.style.background = "#ff758f"; btnFlappy.style.border = "none"; }
        if(btnCrosswalk) { btnCrosswalk.style.background = "#2b2d42"; btnCrosswalk.style.border = "1px solid #8d99ae"; }
        if(btnMemory) { btnMemory.style.background = "#ff758f"; btnMemory.style.border = "1px solid #8d99ae"; }
        
        if(stageFlappy) stageFlappy.classList.remove("hidden");
        if(stageCrosswalk) stageCrosswalk.classList.add("hidden");
        if(stageMemory) stageMemory.classList.add("hidden");
        
        if (typeof initFlappyGame === "function") initFlappyGame();
    } else if (stageNum === 2) {
        if(btnFlappy) { btnFlappy.style.background = "#2b2d42"; btnFlappy.style.border = "1px solid #8d99ae"; }
        if(btnCrosswalk) { btnCrosswalk.style.background = "#ff758f"; btnCrosswalk.style.border = "none"; }
        if(btnMemory) { btnMemory.style.background = "#ff758f"; btnMemory.style.border = "1px solid #8d99ae"; }
        
        if(stageFlappy) stageFlappy.classList.add("hidden");
        if(stageCrosswalk) stageCrosswalk.classList.remove("hidden");
        if(stageMemory) stageMemory.classList.add("hidden");
        
        if (typeof initCrosswalkGame === "function") initCrosswalkGame();
    } else if (stageNum === 3) {
        if(btnFlappy) { btnFlappy.style.background = "#2b2d42"; btnFlappy.style.border = "1px solid #8d99ae"; }
        if(btnCrosswalk) { btnCrosswalk.style.background = "#2b2d42"; btnCrosswalk.style.border = "1px solid #8d99ae"; }
        if(btnMemory) { btnMemory.style.background = "#ff758f"; btnMemory.style.border = "none"; }
        
        if(stageFlappy) stageFlappy.classList.add("hidden");
        if(stageCrosswalk) stageCrosswalk.classList.add("hidden");
        if(stageMemory) stageMemory.classList.remove("hidden");
        
        if (typeof initMemoryGame === "function") initMemoryGame();
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