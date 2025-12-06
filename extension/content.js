// content.js
(function () {
    'use strict';

    // ---------- CONFIG / CONSTANTS ----------

    const STATE_KEY = 'jsCompanionState_v1';
    const MODES = ['Beginner', 'Explorer', 'Trainer'];

    // Minimal hint pack; expand with more challenges later.
    // Keys MUST match challenge.key from /api/Challenges
    const HINTS = {
        "scoreBoardChallenge": {
            learning_goal: "Discover hidden functionality in a single-page app.",
            hints: [
                "What parts of the app might be hidden from normal navigation?",
                "Can you find any routes or components related to 'score' or 'board' in the HTML or JS?",
                "Is there any element that is hidden (e.g. via CSS or toggled via JavaScript) that reveals extra pages?"
            ]
        },
        "domXssChallenge": {
            learning_goal: "Understand how user input in the URL can affect the DOM directly.",
            hints: [
                "Where does the page read from the URL and display it without a full reload?",
                "Try modifying query string parameters and see what part of the page changes.",
                "Look for JavaScript that takes values from location or query parameters and uses innerHTML or similar sinks."
            ]
        }
        // add more challenges as needed
    };

    // ---------- STATE MANAGEMENT (localStorage) ----------

    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) {
                return { mode: 'Beginner', challengeState: {} };
            }
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load state', e);
            return { mode: 'Beginner', challengeState: {} };
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save state', e);
        }
    }

    let state = loadState();
    let challenges = [];

    function getChallengeState(chKey) {
        if (!state.challengeState[chKey]) {
            state.challengeState[chKey] = { maxHintSeen: 0, notes: '' };
        }
        return state.challengeState[chKey];
    }

    // ---------- HINT LIMIT PER MODE ----------

    function maxHintLevelForMode(mode, numHints) {
        if (mode === 'Beginner') {
            return Math.min(2, numHints); // cap at first 2 hints
        }
        // Explorer & Trainer: all hints
        return numHints;
    }

    // ---------- OVERLAY CREATION ----------

    function createOverlayShell() {
        if (document.getElementById('js-overlay')) return; // already injected

        const overlay = document.createElement('div');
        overlay.id = 'js-overlay';
        overlay.innerHTML = `
      <div id="js-overlay-header">
        <span>Juice Shop Coach</span>
        <button id="js-overlay-toggle" style="width:auto;font-size:10px;">⏵</button>
      </div>
      <div id="js-overlay-body">
        <small>Loading challenges...</small>
      </div>
    `;
        document.body.appendChild(overlay);

        const toggleBtn = document.getElementById('js-overlay-toggle');
        toggleBtn.addEventListener('click', (e) => {
            // Prevent drag when clicking toggle
            e.stopPropagation();
            if (overlay.style.width === '32px') {
                overlay.style.width = '320px';
                toggleBtn.textContent = '⏵';
            } else {
                overlay.style.width = '32px';
                toggleBtn.textContent = '⏴';
            }
        });

        // Draggable Logic
        const overlayElement = document.getElementById('js-overlay'); // Renamed to avoid conflict with 'overlay' variable
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        overlayElement.addEventListener('mousedown', (e) => {
            // Only left click
            if (e.button !== 0) return;

            // Don't drag if clicking on interactive elements
            if (['SELECT', 'BUTTON', 'TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
                return;
            }

            // Don't drag if clicking the resize handle (approx bottom-right 20px)
            const bounds = overlayElement.getBoundingClientRect();
            if (e.clientX > bounds.right - 20 && e.clientY > bounds.bottom - 20) {
                return; // Let native resize handle it
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get current computed position
            // We can reuse 'bounds' here as it represents current state
            initialLeft = bounds.left;
            initialTop = bounds.top;

            // Ensure we are positioning by left/top now, clearing right if set
            overlayElement.style.right = 'auto';
            overlayElement.style.left = `${initialLeft}px`;
            overlayElement.style.top = `${initialTop}px`;

            // Optional: visual feedback
            overlayElement.style.transition = 'none'; // Disable transition during drag
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            overlay.style.left = `${initialLeft + dx}px`;
            overlay.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                overlay.style.transition = ''; // Re-enable transitions if any were there
            }
        });
    }

    // ---------- RENDERING UI ----------

    function renderOverlay() {
        const body = document.getElementById('js-overlay-body');
        if (!body) return;

        body.innerHTML = '';

        // Mode selector
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Mode:';
        body.appendChild(modeLabel);

        const modeSelect = document.createElement('select');
        MODES.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            if (state.mode === m) opt.selected = true;
            modeSelect.appendChild(opt);
        });
        modeSelect.addEventListener('change', () => {
            state.mode = modeSelect.value;
            saveState(state);
            const select = document.getElementById('js-challenge-select');
            if (select) renderChallengeSection(select.value);
        });
        body.appendChild(modeSelect);

        // Challenge selector
        const chLabel = document.createElement('label');
        chLabel.textContent = 'Challenge:';
        chLabel.style.marginTop = '4px';
        body.appendChild(chLabel);

        const select = document.createElement('select');
        select.id = 'js-challenge-select';

        challenges
            .slice()
            .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name))
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.key;
                const solvedPrefix = c.solved ? '✅ ' : '';
                opt.textContent = `${solvedPrefix}${c.name} [${c.category} | ${c.difficulty}★]`;
                select.appendChild(opt);
            });

        select.addEventListener('change', () => {
            renderChallengeSection(select.value);
        });

        body.appendChild(select);

        const section = document.createElement('div');
        section.id = 'js-challenge-section';
        section.style.marginTop = '8px';
        body.appendChild(section);

        if (challenges.length > 0) {
            renderChallengeSection(select.value || challenges[0].key);
        }
    }

    function renderChallengeSection(chKey) {
        const section = document.getElementById('js-challenge-section');
        if (!section) return;
        section.innerHTML = '';

        const challenge = challenges.find(c => c.key === chKey);
        const hintData = HINTS[chKey];
        const chState = getChallengeState(chKey);

        // Title
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.marginBottom = '4px';
        title.textContent = challenge ? challenge.name : chKey;
        section.appendChild(title);

        if (challenge) {
            const meta = document.createElement('div');
            meta.style.fontSize = '11px';
            meta.style.opacity = '0.8';
            meta.textContent = `Category: ${challenge.category} | Difficulty: ${challenge.difficulty}★`;
            section.appendChild(meta);
        }

        // Hints
        const hintsHeader = document.createElement('div');
        hintsHeader.style.marginTop = '8px';
        hintsHeader.style.fontWeight = '600';
        hintsHeader.textContent = 'Hints';
        section.appendChild(hintsHeader);

        if (!hintData) {
            const info = document.createElement('div');
            info.style.fontSize = '12px';
            info.textContent = 'No hints written yet for this challenge.';
            section.appendChild(info);
        } else {
            const learning = document.createElement('div');
            learning.style.fontSize = '12px';
            learning.style.marginBottom = '4px';
            learning.textContent = 'Goal: ' + (hintData.learning_goal || 'n/a');
            section.appendChild(learning);

            const totalHints = hintData.hints.length;
            const maxLevel = maxHintLevelForMode(state.mode, totalHints);

            const hintContainer = document.createElement('div');
            hintContainer.style.fontSize = '12px';
            section.appendChild(hintContainer);

            function renderHintsList() {
                hintContainer.innerHTML = '';
                if (chState.maxHintSeen === 0) {
                    hintContainer.textContent = 'No hints shown yet.';
                    return;
                }
                for (let i = 0; i < chState.maxHintSeen; i++) {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>Hint ${i + 1}:</strong> ${hintData.hints[i]}`;
                    hintContainer.appendChild(p);
                }
            }

            const btn = document.createElement('button');
            btn.textContent = 'Show next hint';
            btn.addEventListener('click', () => {
                if (chState.maxHintSeen < maxLevel) {
                    chState.maxHintSeen += 1;
                    saveState(state);
                    renderHintsList();
                } else if (state.mode === 'Beginner') {
                    alert('Max hint level reached in Beginner mode. Switch to Explorer for more.');
                }
            });
            section.appendChild(btn);

            renderHintsList();
        }

        // Notes / reflection
        const notesLabel = document.createElement('div');
        notesLabel.style.marginTop = '8px';
        notesLabel.style.fontWeight = '600';
        notesLabel.textContent = 'Your notes';
        section.appendChild(notesLabel);

        const textarea = document.createElement('textarea');
        textarea.value = chState.notes || '';
        textarea.addEventListener('change', () => {
            chState.notes = textarea.value;
            saveState(state);
        });
        section.appendChild(textarea);

        const small = document.createElement('small');
        small.textContent = 'Hint usage & notes stored locally in this browser.';
        section.appendChild(small);
    }

    // ---------- INIT: CREATE OVERLAY + FETCH CHALLENGES ----------

    function init() {
        createOverlayShell();

        fetch('/api/Challenges')
            .then(r => r.json())
            .then(json => {
                challenges = json.data || [];
                renderOverlay();
            })
            .catch(err => {
                console.error('Failed to load challenges', err);
                const body = document.getElementById('js-overlay-body');
                if (body) {
                    body.textContent = 'Error loading /api/Challenges. Is Juice Shop running?';
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
