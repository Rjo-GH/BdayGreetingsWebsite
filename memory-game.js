// ==========================================
// memory-game.js
// GAME 3: MEMORY MATCH
// ==========================================

function initMemoryGame() {
    const boardId = (typeof isPracticeMode !== 'undefined' && isPracticeMode) ? "practiceMemoryBoard" : "memoryBoard";
    const container = document.getElementById(boardId) || document.getElementById("practiceMemoryBoard") || document.getElementById("memoryBoard");
    if (!container) return;
    container.innerHTML = "";

    const cardSources = [
        "pics/drooler.png",
        "pics/catina.png",
        "pics/bulgogi.png",
        "pics/fluffyloaf.png",
        "pics/lazytilapia.png",
        "pics/rei-plush.png"
    ];

    const deck = [...cardSources, ...cardSources].map((src, index) => ({ id: `${index}-${src}`, src, matched: false }));
    deck.sort(() => Math.random() - 0.5);

    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matches = 0;

    function revealCard(cardEl, cardData) {
        cardEl.classList.add('revealed');
        cardEl.querySelector('.card-front').style.backgroundImage = `url('${cardData.src}')`;
    }

    function hideCard(cardEl) {
        cardEl.classList.remove('revealed');
        cardEl.querySelector('.card-front').style.backgroundImage = '';
    }

    function checkMatch() {
        const isMatch = firstCard.cardData.src === secondCard.cardData.src;
        if (isMatch) {
            firstCard.cardData.matched = true;
            secondCard.cardData.matched = true;
            matches += 1;
            firstCard = null;
            secondCard = null;
            if (matches === cardSources.length) {
                showReactionPopup(
                    'pics/rei-happy.jpg',
                    'Match Complete!',
                    'Great memory! You matched all the cat pairs. 🐾',
                    '#06d6a0',
                    2200,
                    () => {
                        if (typeof window.handleActualGiftUnlock === 'function' && !window.isPracticeMode) {
                            window.handleActualGiftUnlock();
                        }
                    }
                );
            }
            lockBoard = false;
        } else {
            setTimeout(() => {
                hideCard(firstCard.element);
                hideCard(secondCard.element);
                firstCard = null;
                secondCard = null;
                lockBoard = false;
            }, 900);
        }
    }

    deck.forEach((cardData) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.innerHTML = `
            <div class="card-back"></div>
            <div class="card-front"></div>
        `;
        cardEl.addEventListener('click', () => {
            if (lockBoard || cardData.matched || cardEl.classList.contains('revealed')) return;

            revealCard(cardEl, cardData);
            if (!firstCard) {
                firstCard = { element: cardEl, cardData };
                return;
            }

            secondCard = { element: cardEl, cardData };
            lockBoard = true;
            checkMatch();
        });
        container.appendChild(cardEl);
    });
}
