/**
 * Countdown Timer
 * ---------------
 * Lets the user pick an event name and a target date/time,
 * then counts down to that moment second by second.
 *
 * Data is saved in localStorage so the countdown survives page refreshes.
 */

/* ------------------------------------------------------------------ */
/* DOM references                                                      */
/* ------------------------------------------------------------------ */
const setupView     = document.getElementById('setupView');
const countdownView = document.getElementById('countdownView');
const doneView      = document.getElementById('doneView');

const setupForm     = document.getElementById('setupForm');
const eventNameIn   = document.getElementById('eventName');
const targetDateIn  = document.getElementById('targetDate');
const presetBtns    = document.querySelectorAll('.preset-btn');

const eventLabel    = document.getElementById('eventLabel');
const eventDate     = document.getElementById('eventDate');
const daysDigit     = document.getElementById('daysDigit');
const hoursDigit    = document.getElementById('hoursDigit');
const minutesDigit  = document.getElementById('minutesDigit');
const secondsDigit  = document.getElementById('secondsDigit');
const progressBar   = document.getElementById('progressBar');
const progressText  = document.getElementById('progressText');
const changeBtn     = document.getElementById('changeBtn');

const doneText      = document.getElementById('doneText');
const newTimerBtn   = document.getElementById('newTimerBtn');

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'countdown_timer_data';
let intervalId  = null;
let currentTimer = null;   // { name: string, target: timestamp, startedAt: timestamp }
let previousSeconds = null;

/* ------------------------------------------------------------------ */
/* View switcher                                                       */
/* ------------------------------------------------------------------ */
function showView(name) {
    [setupView, countdownView, doneView].forEach(v => v.classList.add('hidden'));
    const map = { setup: setupView, countdown: countdownView, done: doneView };
    if (map[name]) map[name].classList.remove('hidden');
}

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */
function saveTimer(timer) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch (e) {
        // localStorage might be disabled — fine, just skip
    }
}

function loadTimer() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearTimer() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */
function pad(n) {
    return String(n).padStart(2, '0');
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, {
        weekday: 'short',
        year:    'numeric',
        month:   'short',
        day:     'numeric',
        hour:    'numeric',
        minute:  '2-digit',
    });
}

/* ------------------------------------------------------------------ */
/* The main tick — runs every second                                   */
/* ------------------------------------------------------------------ */
function tick() {
    if (!currentTimer) return;

    const now       = Date.now();
    const remaining = currentTimer.target - now;

    // Time's up
    if (remaining <= 0) {
        stopCountdown();
        doneText.textContent = `Your countdown for "${currentTimer.name}" has ended. Congratulations!`;
        showView('done');
        return;
    }

    // Break down remaining ms into d/h/m/s
    const seconds = Math.floor((remaining / 1000)        % 60);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const hours   = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const days    = Math.floor( remaining / (1000 * 60 * 60 * 24));

    daysDigit.textContent    = pad(days);
    hoursDigit.textContent   = pad(hours);
    minutesDigit.textContent = pad(minutes);
    secondsDigit.textContent = pad(seconds);

    // Add a subtle tick animation to the seconds digit each second
    if (previousSeconds !== seconds) {
        secondsDigit.classList.remove('tick');
        // Force reflow so the animation restarts
        void secondsDigit.offsetWidth;
        secondsDigit.classList.add('tick');
        previousSeconds = seconds;
    }

    // Progress bar — how much of the countdown has already elapsed
    const total   = currentTimer.target - currentTimer.startedAt;
    const elapsed = now - currentTimer.startedAt;
    const pct     = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${Math.round(pct)}% of the wait complete`;
}

/* ------------------------------------------------------------------ */
/* Start / stop                                                        */
/* ------------------------------------------------------------------ */
function startCountdown(timer) {
    currentTimer = timer;
    previousSeconds = null;

    eventLabel.textContent = timer.name;
    eventDate.textContent  = formatDate(timer.target);

    // If already past, jump straight to "done"
    if (timer.target - Date.now() <= 0) {
        doneText.textContent = `Your countdown for "${timer.name}" has ended. Congratulations!`;
        showView('done');
        return;
    }

    showView('countdown');
    tick();
    intervalId = setInterval(tick, 1000);
}

function stopCountdown() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    clearTimer();
    currentTimer = null;
}

/* ------------------------------------------------------------------ */
/* Event handlers                                                      */
/* ------------------------------------------------------------------ */
setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = eventNameIn.value.trim();
    const dateStr = targetDateIn.value;
    if (!name || !dateStr) return;

    const targetTs = new Date(dateStr).getTime();
    if (Number.isNaN(targetTs)) return;

    if (targetTs <= Date.now()) {
        alert("Please pick a date and time in the future.");
        return;
    }

    const timer = {
        name,
        target: targetTs,
        startedAt: Date.now(),
    };
    saveTimer(timer);
    startCountdown(timer);
});

changeBtn.addEventListener('click', () => {
    stopCountdown();
    showView('setup');
});

newTimerBtn.addEventListener('click', () => {
    stopCountdown();
    setupForm.reset();
    setDefaultDate();
    showView('setup');
});

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */
function computePreset(kind) {
    const now = new Date();
    let name, date;

    switch (kind) {
        case 'newYear': {
            date = new Date(now.getFullYear() + 1, 0, 1, 0, 0);
            name = `New Year ${date.getFullYear()}`;
            break;
        }
        case 'weekend': {
            date = new Date(now);
            date.setHours(10, 0, 0, 0);
            const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7; // always the *next* Saturday
            date.setDate(now.getDate() + daysUntilSat);
            name = 'Next Saturday';
            break;
        }
        case 'tomorrow': {
            date = new Date(now);
            date.setDate(now.getDate() + 1);
            date.setHours(9, 0, 0, 0);
            name = 'Tomorrow at 9 AM';
            break;
        }
    }

    return { name, date };
}

// Format a Date object as a value suitable for a datetime-local input.
function toInputValue(date) {
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const { name, date } = computePreset(btn.dataset.preset);
        eventNameIn.value  = name;
        targetDateIn.value = toInputValue(date);
    });
});

/* ------------------------------------------------------------------ */
/* Default date = 1 hour from now                                       */
/* ------------------------------------------------------------------ */
function setDefaultDate() {
    const d = new Date(Date.now() + 60 * 60 * 1000); // one hour from now
    targetDateIn.value = toInputValue(d);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
(function init() {
    setDefaultDate();

    // Resume any saved countdown
    const saved = loadTimer();
    if (saved && saved.target && saved.target > Date.now()) {
        startCountdown(saved);
    } else if (saved) {
        // Saved but expired
        clearTimer();
    }
})();
