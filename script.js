/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {

    // ---- AOS ----
    AOS.init({
        once: true,
        duration: 800,
        easing: 'ease-out-cubic',
        offset: 60
    });

    // ---- Theme Toggle (Light default → Dark on click) ----
    const themeBtns = [
        document.getElementById('themeToggle'),
        document.getElementById('themeToggleMobile')
    ].filter(Boolean);

    function syncThemeIcons() {
        const isDark = document.body.classList.contains('dark-mode');
        themeBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (isDark) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        });
    }

    // Restore saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        syncThemeIcons();
    }

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            syncThemeIcons();
        });
    });

    // ---- Sticky Navbar ----
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    // ---- Active Section Highlighting ----
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.nav-links a:not(.btn-sm)');

    function highlightNav() {
        let current = '';
        sections.forEach(sec => {
            const top = sec.offsetTop - 120;
            if (window.scrollY >= top) current = sec.getAttribute('id');
        });
        navAnchors.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
        });
    }
    window.addEventListener('scroll', highlightNav, { passive: true });

    // ---- Mobile Menu ----
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobilePanel = document.querySelector('.mobile-nav-panel');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            mobilePanel.classList.toggle('active');
            const icon = mobileBtn.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-xmark');
        });
    }

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobilePanel.classList.remove('active');
            const icon = mobileBtn.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-xmark');
        });
    });

    // ---- Custom Interactive Poll Widget (TRULY LIVE via CounterAPI) ----
    const pollOptions = document.getElementById('poll-options');
    const pollResults = document.getElementById('poll-results');
    const resultsContainer = document.getElementById('results-container');
    const pollBtns = document.querySelectorAll('.poll-btn');

    const pollItems = [
        "Hands-on Offline Coding Bootcamps",
        "More Hackathons & Contest Participation",
        "International Contest Participation",
        "Team Based Work"
    ];

    // Unique fresh namespace for the app to collect cross-user votes securely
    const NAMESPACE = 'sstucc-v2026-1122';

    let isFirstLoad = true;

    async function fetchLiveResults(votedIndices = []) {
        const pollOptionsObj = document.getElementById('poll-options');
        const pollResultsObj = document.getElementById('poll-results');
        const resultsBox = document.getElementById('results-container');

        if (pollOptionsObj) pollOptionsObj.style.display = 'none';
        if (pollResultsObj) pollResultsObj.style.display = 'block';

        if (isFirstLoad) {
            resultsBox.innerHTML = '<p style="text-align:center; opacity:0.7;"><i class="fa-solid fa-spinner fa-spin"></i> Connecting to Live Data...</p>';
        }

        const buildApiUrl = (endpoint) => {
            const rawUrl = `https://api.counterapi.dev/v1/${NAMESPACE}/${endpoint}`;
            // Use corsproxy to heavily mask the domain from adblockers which randomly block 'api.counterapi'
            return `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`;
        };

        try {
            // Push votes sequentially if any
            if (votedIndices.length > 0) {
                // Increment total respondents/submissions first
                await fetch(buildApiUrl(`total-submissions/up?t=${Date.now()}`))
                    .catch(err => console.warn("Submission counter push network masked error:", err));

                // Then increment individual options
                for (const index of votedIndices) {
                    await fetch(buildApiUrl(`opt-${index}/up?t=${Date.now()}`))
                        .catch(err => console.warn("Vote push network masked error:", err));
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            // Fetch live aggregates
            const fetchPromises = pollItems.map((_, i) => {
                return fetch(buildApiUrl(`opt-${i}?t=${Date.now()}`))
                    .then(res => res.ok ? res.json() : { count: 0 })
                    .catch(() => ({ count: 0 }));
            });

            const results = await Promise.all(fetchPromises);

            // NEW: Fetch total respondents/submissions for correct multi-select % math
            const totalReponsesRes = await fetch(buildApiUrl(`total-submissions?t=${Date.now()}`))
                .then(res => res.ok ? res.json() : { count: 1 })
                .catch(() => ({ count: 1 }));

            let totalRespondents = Math.max(totalReponsesRes.count, 1);

            // Structure data and sort by highest votes
            let finalData = pollItems.map((text, i) => ({
                id: i,
                text,
                votes: results[i].count,
                percentage: parseFloat(((results[i].count / totalRespondents) * 100).toFixed(1))
            })).sort((a, b) => b.votes - a.votes);

            // Note: For multi-select, percentages can exceed 100% total, 
            // so we don't force a sum correction here.

            // Render DOM structure
            if (isFirstLoad) {
                resultsBox.innerHTML = '';
                finalData.forEach(item => {
                    const resultHtml = `
                        <div class="result-item" id="result-item-${item.id}">
                            <div class="result-label">
                                <span>${item.text} <small class="vote-count-text" style="opacity:0.6; font-size:0.85em; font-weight:normal;">(${item.votes} votes)</small></span>
                                <span class="percentage-text">${item.percentage.toFixed(1)}%</span>
                            </div>
                            <div class="result-bar-bg">
                                <div class="result-bar-fill" style="width: 0%;" data-target="${item.percentage.toFixed(1)}%"></div>
                            </div>
                        </div>
                    `;
                    resultsBox.insertAdjacentHTML('beforeend', resultHtml);
                });

                // Trigger smooth animation
                setTimeout(() => {
                    const fills = document.querySelectorAll('.result-bar-fill');
                    fills.forEach(fill => {
                        fill.style.width = fill.getAttribute('data-target');
                    });
                }, 100);

                isFirstLoad = false;

                // Keep polling every 20 seconds silently
                setInterval(() => {
                    if (pollResultsObj.style.display === 'block') fetchLiveResults([]);
                }, 20000);
            } else {
                // Subsequent loads: Update elements in-place to avoid flickering
                finalData.forEach((item, index) => {
                    const itemDiv = document.getElementById(`result-item-${item.id}`);
                    if (itemDiv) {
                        itemDiv.style.order = index; // CSS trick to sort naturally
                        itemDiv.querySelector('.vote-count-text').textContent = `(${item.votes} votes)`;
                        itemDiv.querySelector('.percentage-text').textContent = `${item.percentage.toFixed(1)}%`;

                        const fill = itemDiv.querySelector('.result-bar-fill');
                        fill.setAttribute('data-target', `${item.percentage.toFixed(1)}%`);
                        fill.style.width = `${item.percentage.toFixed(1)}%`;
                    }
                });
                resultsBox.style.display = 'flex';
                resultsBox.style.flexDirection = 'column';
            }

        } catch (err) {
            if (isFirstLoad) {
                resultsBox.innerHTML = '<p style="text-align:center; color:var(--danger);">Failed to load live results. Check connection.</p>';
            }
        }
    }

    // Submit Multi-Select Checkboxes Check
    const submitPollBtn = document.getElementById('submit-poll-btn');
    if (submitPollBtn) {
        submitPollBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.poll-checkbox-label input[type="checkbox"]:checked');
            if (checkedBoxes.length === 0) {
                alert("Please select at least one priority!");
                return;
            }

            // Get array of selected indices
            const votedIndices = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

            // Visual feedback
            submitPollBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            submitPollBtn.disabled = true;

            // Send votes
            fetchLiveResults(votedIndices);

            // Lock UI locally afterwards
            localStorage.setItem('voted_sstucc_live', 'true');
        });
    }

    // If they already voted locally, show live results right away
    if (localStorage.getItem('voted_sstucc_live')) {
        fetchLiveResults([]);
    }
});
