// Main App initialization function (runs on initial load & ClientRouter page transitions)
function initApp() {
    // ============ PLAY AGAIN BANNER (Mobile only) ============
    initPlayAgainBanner();
    
    // ============ RECENTLY PLAYED SIDEBAR ============
    initRecentlyPlayedSidebar();
    
    // ============ PRIORITIZE PLAYED CATEGORIES ============
    syncLastPlayedCategoriesCookie();
    prioritizePlayedCategories();

    // ============ GAME PLAY TRACKING ============
    initGamePlayTracking();
    
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    const panelSearch = document.getElementById('panel-search');
    const panelLogin = document.getElementById('panel-login');
    const panelAccount = document.getElementById('panel-account');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const closeSidebarLoginBtn = document.getElementById('close-sidebar-login');
    const closeSidebarAccountBtn = document.getElementById('close-sidebar-account');
    const searchInput = document.getElementById('search-input');
    const tabRegister = document.getElementById('tab-register');
    const tabLoginBtn = document.getElementById('tab-login-tab');
    const panelRegister = document.getElementById('panel-register');
    const panelLoginForm = document.getElementById('panel-login-form');

    // Bind tất cả nút login/search (cả layout dọc, ngang, và mobile header)
    const loginBtns = document.querySelectorAll('#btn-login, #btn-login-lg, #btn-mobile-login');
    const searchBtns = document.querySelectorAll('#btn-search, #btn-search-lg, #btn-mobile-search');

    console.log('Sidebar script loaded. Found:', {
        loginBtns: loginBtns.length,
        searchBtns: searchBtns.length,
        sidebar: !!sidebar,
        overlay: !!overlay
    });

    function openSidebarPanel(panel) {
        console.log('Opening sidebar panel:', panel);
        
        // Show/hide panels based on auth status
        if (panel === 'search') {
            panelSearch.style.display = '';
            panelLogin.style.display = 'none';
            panelAccount.style.display = 'none';
        } else if (panel === 'login') {
            panelSearch.style.display = 'none';
            panelLogin.style.display = '';
            panelAccount.style.display = 'none';
        } else if (panel === 'account') {
            panelSearch.style.display = 'none';
            panelLogin.style.display = 'none';
            panelAccount.style.display = '';
        }
        
        // Open sidebar
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus search input if search panel
        if (panel === 'search' && searchInput) {
            setTimeout(() => searchInput.focus(), 320);
        }
    }

    function closeSidebar() {
        console.log('Closing sidebar');
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Event listeners
    loginBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Login button clicked:', btn.id);
            openSidebarPanel('login');
        });
    });
    
    searchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Search button clicked:', btn.id);
            openSidebarPanel('search');
        });
    });
    
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (closeSidebarLoginBtn) closeSidebarLoginBtn.addEventListener('click', closeSidebar);
    if (closeSidebarAccountBtn) closeSidebarAccountBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    if (!window.__tapwapEscBound) {
        window.__tapwapEscBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const sb = document.getElementById('sidebar');
                const ov = document.getElementById('sidebar-overlay');
                if (sb) sb.classList.remove('open');
                if (ov) ov.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Auth tabs
    const authTitle = document.getElementById('auth-title');
    
    if (tabRegister) {
        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLoginBtn.classList.remove('active');
            // Change title to Register
            if (authTitle) authTitle.textContent = 'Create a TapWap Account';
        });
    }

    if (tabLoginBtn) {
        tabLoginBtn.addEventListener('click', () => {
            tabLoginBtn.classList.add('active');
            tabRegister.classList.remove('active');
            // Change title to Login
            if (authTitle) authTitle.textContent = 'Welcome Back';
            panelLoginForm.style.display = '';
            panelRegister.style.display = 'none';
        });
    }
    
    // OAuth handlers
    document.querySelectorAll('.auth-provider[data-provider]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const provider = btn.dataset.provider;
            
            if (!provider) return;
            
            console.log('OAuth login:', provider);
            
            // Redirect to OAuth endpoint
            window.location.href = `/api/auth/${provider}`;
        });
    });
    
    // Demo login handlers
    document.querySelectorAll('.auth-provider[data-demo]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const provider = btn.dataset.demo;
            
            if (!provider) return;
            
            console.log('🧪 Demo login:', provider);
            
            // Redirect to demo login endpoint
            window.location.href = `/api/auth/demo-login?provider=${provider}`;
        });
    });
    
    // Check if user is already logged in
    checkAuthStatus();

    // Search filter
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim().toLowerCase();
            const defaultContent = document.getElementById('search-default-content');
            const resultsSection = document.getElementById('search-results-section');
            const resultsGrid = document.getElementById('search-results-grid');
            const resultsTitle = document.getElementById('search-results-title');
            
            // Clear previous timeout
            clearTimeout(searchTimeout);
            
            if (!q) {
                // Empty search - show default content
                defaultContent.style.display = 'block';
                resultsSection.style.display = 'none';
                return;
            }
            
            // Hide default content, show loading
            defaultContent.style.display = 'none';
            resultsSection.style.display = 'block';
            resultsTitle.style.display = 'none'; // Hide title
            resultsGrid.innerHTML = '<div class="search-empty-message">Loading...</div>';
            
            // Debounce search
            searchTimeout = setTimeout(async () => {
                let data = null;
                try {
                    // Fetch from API
                    const response = await fetch('/api/games/search?q=' + encodeURIComponent(q));
                    if (response.ok) {
                        data = await response.json();
                    } else {
                        throw new Error('API search failed: ' + response.status);
                    }
                } catch (_) {
                    // Static mode fallback (GitHub Pages)
                    try {
                        if (!window.__gamesIndexCache) {
                            const res = await fetch('/data/games-index.json');
                            window.__gamesIndexCache = await res.json();
                        }
                        const qLower = q.toLowerCase();
                        const matches = (window.__gamesIndexCache || []).filter(g =>
                            g.name && g.name.toLowerCase().includes(qLower)
                        );
                        data = { games: matches };
                    } catch (fallbackErr) {
                        console.error('Search fallback error:', fallbackErr);
                    }
                }

                try {
                    
                    if (data.games && data.games.length > 0) {
                        resultsGrid.innerHTML = data.games.slice(0, 100).map(game => {
                            const imgUrl = ensureCdnUrl(game.cdn_image_url || game.image_url, 'image');
                            const videoUrl = ensureCdnUrl(game.cdn_video_url || game.video_url, 'video') || '';
                            const gameHref = `/game/${game.id || game.slug}`;
                            return `
                            <a 
                                class="game-tile"
                                href="${gameHref}"
                                title="${game.name}"
                                data-video="${videoUrl}"
                                data-game-id="${game.id}"
                                data-slug="${game.slug}"
                            >
                                <div class="game-tile-media">
                                    <img class="game-thumbnail" src="${imgUrl}" alt="${game.name}" loading="lazy">
                                </div>
                                <div class="tile-overlay">
                                    <span class="tile-name">${game.name}</span>
                                </div>
                            </a>
                            `;
                        }).join('');
                        
                        // Initialize video lazy loading for search results
                        initGameVideoHover(resultsGrid);
                        window.dispatchEvent(new Event('gamesAdded'));
                        markRecentlyPlayedGames();
                    } else {
                        resultsGrid.innerHTML = '<div class="search-empty-message">No games found matching "' + q + '"</div>';
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    resultsGrid.innerHTML = '<div class="search-empty-message">Failed to search. Please try again.</div>';
                }
            }, 300); // 300ms debounce
        });
    }

    // Tags
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active-tag'));
            tag.classList.add('active-tag');
        });
    });

    // Show More button for mosaic grid (mobile)
    const showMoreBtn = document.getElementById('show-more-mosaic');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            const mosaicGrid = document.querySelector('.mosaic-grid');
            if (mosaicGrid) {
                if (mosaicGrid.style.maxHeight) {
                    mosaicGrid.style.maxHeight = '';
                    mosaicGrid.style.overflow = 'hidden';
                    showMoreBtn.querySelector('.show-more-text').textContent = 'Show more';
                    showMoreBtn.querySelector('svg polyline').setAttribute('points', '6 9 12 15 18 9');
                } else {
                    mosaicGrid.style.maxHeight = 'none';
                    mosaicGrid.style.overflow = 'visible';
                    showMoreBtn.querySelector('.show-more-text').textContent = 'Show less';
                    showMoreBtn.querySelector('svg polyline').setAttribute('points', '18 15 12 9 6 15');
                }
            }
        });
    }

    // Toggle login state (demo) - REMOVED because it conflicts with sidebar opening
    // The login icon toggle is now handled via CSS based on data-logged-in attribute
    // You can manually change data-logged-in="true" in HTML to see logged-in state

    // Drag to scroll for tag-list
    const tagList = document.querySelector('.tag-list');
    if (tagList) {
        let isDown = false;
        let startX;
        let scrollLeft;

        tagList.addEventListener('mousedown', (e) => {
            isDown = true;
            tagList.style.cursor = 'grabbing';
            startX = e.pageX - tagList.offsetLeft;
            scrollLeft = tagList.scrollLeft;
            e.preventDefault();
        });

        tagList.addEventListener('mouseleave', () => {
            isDown = false;
            tagList.style.cursor = 'grab';
        });

        tagList.addEventListener('mouseup', () => {
            isDown = false;
            tagList.style.cursor = 'grab';
        });

        tagList.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - tagList.offsetLeft;
            const walk = (x - startX) * 2;
            tagList.scrollLeft = scrollLeft - walk;
        });

        tagList.addEventListener('click', (e) => {
            if (Math.abs(tagList.scrollLeft - scrollLeft) > 5) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    // Initialize video hover for initial tiles
    initGameVideoHover();
}

// Bind global lifecycle listeners only once across Astro ClientRouter transitions
if (!window.__tapwapAppBound) {
    window.__tapwapAppBound = true;

    // Re-initialize when new games are added (infinite scroll or dynamic lists)
    window.addEventListener('gamesAdded', () => {
        initGameVideoHover();
        markRecentlyPlayedGames();
    });

    // Ensure initApp runs once per page transition in Astro ClientRouter
    document.addEventListener('astro:page-load', () => {
        window.__tapwapHasPageLoaded = true;
        initApp();
        initGameVideoHover();
        markRecentlyPlayedGames();
    });

    // Fallback for pages without ClientRouter
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!window.__tapwapHasPageLoaded) {
                initApp();
                initGameVideoHover();
                markRecentlyPlayedGames();
            }
        }, 50);
    });
}


// ============ CDN HELPER ============
function ensureCdnUrl(url, type = 'image') {
    if (!url) return '';
    
    // Clean accidental duplicate /games/games/
    url = url.replace(/\/games\/games\//g, '/games/');

    // Strip host if localhost:4321 was embedded in data
    if (url.includes('localhost:4321/games/')) {
        url = url.replace(/https?:\/\/localhost:4321\/games\//, '/games/');
    }

    // Already has local or full URL
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        return url;
    }

    // Normalize cdn.tapwap.com or localhost URLs to local /games/
    if (url.includes('cdn.tapwap.com') || url.includes('localhost:4321')) {
        const clean = url.replace(/^https?:\/\/[^/]+\/(?:games\/)?/, '');
        return `/games/${clean}`;
    }

    // If it already starts with /games/, return clean path or relative path
    if (url.startsWith('/games/')) {
        return url;
    }

    // Other external third-party full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Strip leading slashes and optional 'games/' prefix so it never duplicates
    const clean = url.replace(/^\/?(?:games\/)?/, '');
    return `/games/${clean}`;
}

// Helper to normalize category IDs to array (first item is primary)
function normalizeCategoryIds(val) {
    if (Array.isArray(val)) return val.map(Number).filter(n => !isNaN(n));
    if (typeof val === 'number' && !isNaN(val)) return [val];
    if (typeof val === 'string' && val.trim()) {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed.map(Number).filter(n => !isNaN(n));
            const num = Number(parsed);
            if (!isNaN(num)) return [num];
        } catch {
            return val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
        }
    }
    return [];
}

// Set cookie for SSR category prioritization
function setLastPlayedCategoriesCookie(catIds) {
    const normalized = normalizeCategoryIds(catIds);
    if (normalized.length === 0) return;
    document.cookie = `last_played_categories=${encodeURIComponent(JSON.stringify(normalized))}; path=/; max-age=2592000; SameSite=Lax`;
}

function syncLastPlayedCategoriesCookie() {
    try {
        const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        if (recentGames.length > 0 && recentGames[0].category_id) {
            setLastPlayedCategoriesCookie(recentGames[0].category_id);
        }
    } catch (e) {
        console.warn('Error syncing last_played_categories cookie:', e);
    }
}

// ============ PLAY AGAIN FUNCTIONALITY ============

function initPlayAgainBanner() {
    // Only show on mobile
    if (window.innerWidth > 768) return;
    
    const banner = document.getElementById('play-again-banner');
    if (!banner) return;
    
    const lastGame = getLastPlayedGame();
    if (lastGame) {
        displayPlayAgainBanner(lastGame);
    }
}

function getLastPlayedGame() {
    try {
        const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        if (recentGames.length === 0) return null;
        const lastGame = recentGames[0];
        if (lastGame && lastGame.image_url) {
            lastGame.image_url = ensureCdnUrl(lastGame.image_url);
        }
        return lastGame;
    } catch (e) {
        console.error('Error reading recently played games:', e);
        return null;
    }
}

function displayPlayAgainBanner(game) {
    const banner = document.getElementById('play-again-banner');
    const img = document.getElementById('play-again-img');
    const title = document.getElementById('play-again-title');
    const btn = document.getElementById('play-again-btn');
    
    if (!banner || !img || !title || !btn || !game) return;
    
    img.src = ensureCdnUrl(game.image_url || game.cdn_image_url);
    img.alt = game.name;
    title.textContent = game.name;
    
    // Click handler - navigate by game ID
    const playGame = () => {
        window.location.href = `/game/${game.id}`;
    };
    
    btn.onclick = playGame;
    banner.onclick = (e) => {
        if (e.target === btn || btn.contains(e.target)) return;
        playGame();
    };
    
    banner.style.display = 'block';
}

// ============ PRIORITIZE PLAYED CATEGORIES ============
function prioritizePlayedCategories() {
    try {
        const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        if (!recentGames || recentGames.length === 0) return;

        // Game cuối cùng mà người đã chơi (most recently played game)
        const lastPlayedGame = recentGames[0];
        if (!lastPlayedGame) return;

        const catIds = normalizeCategoryIds(lastPlayedGame.category_id);
        if (catIds.length === 0) return;

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile: Lấy category ID đầu tiên (category_id[0]) của game cuối cùng mà người đã chơi
            // Không cần is_visible_on_mobile = 1 vẫn hiện category đó, và hiện nó lên đầu tiên
            const categoriesSection = document.querySelector('.categories-section');
            if (!categoriesSection) return;

            const primaryCatId = catIds[0];
            const block = categoriesSection.querySelector(`.category-block[data-category-id="${primaryCatId}"]`);
            if (block && categoriesSection.firstElementChild !== block) {
                // Hiện nó lên đầu tiên
                categoriesSection.prepend(block);

                // Cập nhật lại màu chuyển tiếp và class odd/even cho tất cả các block đang hiển thị
                const visibleBlocks = Array.from(categoriesSection.querySelectorAll('.category-block')).filter(b => b.style.display !== 'none');
                visibleBlocks.forEach((b, idx) => {
                    const oddEven = idx % 2 === 0 ? 'even' : 'odd';
                    b.classList.remove('even', 'odd');
                    b.classList.add(oddEven);

                    const nextBlock = idx < visibleBlocks.length - 1 ? visibleBlocks[idx + 1] : null;
                    const nextColor = nextBlock ? nextBlock.dataset.color : null;
                    const currentColor = b.dataset.color;

                    let style = '';
                    if (currentColor) style += `--cat-bg: ${currentColor}; `;
                    if (nextColor) style += `--next-bg: ${nextColor};`;
                    b.setAttribute('style', style.trim());
                });
            }

        } else {
            // Máy tính (desktop): Lấy tất cả category ID (category_id: [id1, id2, ...]) của game cuối cùng mà người đã chơi
            // Không cần is_visible = 1 vẫn hiện category đó, và hiện nó lên đầu tiên
            const allCategoryTiles = Array.from(document.querySelectorAll('.category-tile'));
            if (allCategoryTiles.length === 0) return;

            const parent = allCategoryTiles[0].parentElement;
            if (!parent) return;

            // Đưa các category tile của game đó lên đầu danh sách category tiles (theo thứ tự: id đầu tiên ở vị trí đầu nhất)
            for (let i = catIds.length - 1; i >= 0; i--) {
                const catId = catIds[i];
                const tile = parent.querySelector(`.category-tile[data-category-id="${catId}"]`);
                if (tile) {
                    // Hiện category đó (kể cả khi ban đầu display: none vì is_visible = 0)
                    tile.style.display = '';

                    const currentFirst = parent.querySelector('.category-tile');
                    if (currentFirst && currentFirst !== tile) {
                        parent.insertBefore(tile, currentFirst);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error prioritizing played categories:', e);
    }
}

function savePlayedGame(gameData, playDuration = 0) {
    try {
        if (!gameData || (!gameData.id && !gameData.slug)) return;
        let recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        
        // Check if game already exists by ID or by slug
        const existingIndex = recentGames.findIndex(g => 
            (gameData.id && (g.id || g.game_id) === gameData.id) ||
            (gameData.slug && g.slug && g.slug === gameData.slug)
        );
        
        const catIds = normalizeCategoryIds(gameData.category_id || gameData.categories);
        const gameId = gameData.id || (existingIndex >= 0 ? recentGames[existingIndex].id : Date.now());
        const gameSlug = gameData.slug || (existingIndex >= 0 ? recentGames[existingIndex].slug : '');

        if (existingIndex >= 0) {
            // Update existing game
            recentGames[existingIndex].playDuration = (recentGames[existingIndex].playDuration || 0) + playDuration;
            recentGames[existingIndex].playedAt = Date.now();
            if (gameData.video_url) {
                recentGames[existingIndex].video_url = ensureCdnUrl(gameData.video_url, 'video');
            }
            if (gameData.name) recentGames[existingIndex].name = gameData.name;
            if (gameData.image_url) recentGames[existingIndex].image_url = ensureCdnUrl(gameData.image_url);
            if (catIds.length > 0) {
                recentGames[existingIndex].category_id = catIds;
            } else if (recentGames[existingIndex].category_id !== undefined) {
                recentGames[existingIndex].category_id = normalizeCategoryIds(recentGames[existingIndex].category_id);
            }
            if (gameSlug) recentGames[existingIndex].slug = gameSlug;
            
            // Move to front
            const game = recentGames.splice(existingIndex, 1)[0];
            recentGames.unshift(game);
        } else {
            // Add new game with id, slug, category_id array, name, image_url, video_url
            recentGames.unshift({
                id: gameId,
                slug: gameSlug,
                category_id: catIds,
                name: gameData.name,
                image_url: ensureCdnUrl(gameData.image_url),
                video_url: ensureCdnUrl(gameData.video_url, 'video') || '',
                playedAt: Date.now(),
                playDuration: playDuration
            });
        }
        
        // Normalize category_id on all items
        recentGames.forEach(g => {
            if (g.category_id !== undefined) {
                g.category_id = normalizeCategoryIds(g.category_id);
            }
        });
        
        // Keep only last 15 games
        recentGames = recentGames.slice(0, 15);
        
        localStorage.setItem('recentlyPlayedGames', JSON.stringify(recentGames));
        console.log('✅ Saved played game:', gameData.name, `(+${Math.round(playDuration / 1000)}s)`);
        
        // Update live user account stats
        try {
            let currentStats = window.currentUserStats || JSON.parse(localStorage.getItem('userAccountStats') || 'null');
            if (!currentStats || typeof currentStats !== 'object') {
                currentStats = {
                    games_played: recentGames.length,
                    time_played: 0
                };
            }
            if (existingIndex < 0) {
                currentStats.games_played = Math.max(recentGames.length, (currentStats.games_played || 0) + 1);
            }
            currentStats.time_played = (currentStats.time_played || 0) + playDuration;
            window.currentUserStats = currentStats;
            localStorage.setItem('userAccountStats', JSON.stringify(currentStats));
        } catch (_) {}
        
        // Sync cookie for SSR
        if (recentGames.length > 0 && recentGames[0].category_id) {
            setLastPlayedCategoriesCookie(recentGames[0].category_id);
        }

        // Reorder categories based on played game
        prioritizePlayedCategories();
        
        // Also save to database if user is logged in
        if (gameId) {
            saveGamePlayToDB(gameId, playDuration);
        }
    } catch (e) {
        console.error('Error saving played game:', e);
    }
}

async function saveGamePlayToDB(gameId, playDuration) {
    try {
        if (!window.currentUser || !gameId) return;
        const isStaticHost = window.location.hostname.includes('github.io') || 
                             window.location.protocol === 'file:' ||
                             window.__isStaticSite === true ||
                             window.location.port === '8945' ||
                             window.currentUser.provider === 'local';
        if (isStaticHost) return;
        
        // Save to database directly using gameId
        await fetch('/api/user/game-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameId: gameId,
                playDuration: playDuration
            })
        });
        
        console.log('💾 Saved to database for game ID:', gameId);
    } catch (error) {
        console.error('Error saving to database:', error);
    }
}

// Track game play time on game pages (supports Astro ClientRouter transitions & static pages)
var currentGameTrackingCleanup = window.currentGameTrackingCleanup || null;

function initGamePlayTracking() {
    if (currentGameTrackingCleanup) {
        currentGameTrackingCleanup();
        currentGameTrackingCleanup = null;
    }

    if (!window.location.pathname.includes('/game/')) return;

    console.log('🎮 Game page detected, starting play tracking...');
    let lastSaveTime = Date.now();
    let cachedGameData = null;
    
    // Extract slug from URL reliably (/game/thumb-fighter, /game/thumb-fighter/, /game/thumb-fighter.html)
    const pathParts = window.location.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '').split('/').filter(Boolean);
    const gameIdx = pathParts.indexOf('game');
    const slug = (gameIdx >= 0 && pathParts[gameIdx + 1]) ? pathParts[gameIdx + 1] : (pathParts.pop() || '');

    const getGameData = async () => {
        if (cachedGameData) return cachedGameData;
        
        // 1. Try in-memory / global games index cache
        if (window.__gamesIndexCache && Array.isArray(window.__gamesIndexCache)) {
            const found = window.__gamesIndexCache.find(g => g.slug === slug || String(g.id) === slug);
            if (found) {
                cachedGameData = {
                    id: found.id,
                    slug: found.slug,
                    name: found.name,
                    image_url: ensureCdnUrl(found.image_url),
                    video_url: ensureCdnUrl(found.video_url, 'video') || '',
                    category_id: normalizeCategoryIds(found.categories)
                };
                return cachedGameData;
            }
        }

        // 2. Try fetching static games-index.json
        try {
            const res = await fetch('/data/games-index.json');
            if (res.ok) {
                const list = await res.json();
                window.__gamesIndexCache = list;
                const found = list.find(g => g.slug === slug || String(g.id) === slug);
                if (found) {
                    cachedGameData = {
                        id: found.id,
                        slug: found.slug,
                        name: found.name,
                        image_url: ensureCdnUrl(found.image_url),
                        video_url: ensureCdnUrl(found.video_url, 'video') || '',
                        category_id: normalizeCategoryIds(found.categories)
                    };
                    return cachedGameData;
                }
            }
        } catch (_) {}

        // 3. Try API fetch (dynamic dev server)
        try {
            const response = await fetch(`/api/games/${slug}`);
            if (response.ok) {
                const data = await response.json();
                if (data.game) {
                    cachedGameData = {
                        id: data.game.id,
                        slug: data.game.slug || slug,
                        category_id: normalizeCategoryIds(data.game.category_id),
                        name: data.game.name,
                        image_url: data.game.cdn_image_url || ensureCdnUrl(data.game.image_url),
                        video_url: data.game.cdn_video_url || ensureCdnUrl(data.game.video_url, 'video') || ''
                    };
                    return cachedGameData;
                }
            }
        } catch (_) {}
        
        // 4. Fallback to DOM elements of the game page
        const mainEl = document.querySelector('main.mosaic-wrapper[data-game-id]');
        const gameId = mainEl ? parseInt(mainEl.dataset.gameId) : null;
        const gameTitle = document.querySelector('.game-info-title, .game-about-title, h1.game-about-title');
        const gameImg = document.querySelector('.game-info-icon, .game-about-thumb');
        const categoryIds = normalizeCategoryIds(mainEl ? mainEl.dataset.categoryId : null);
        
        if (gameTitle) {
            cachedGameData = {
                id: gameId || Date.now(),
                slug: slug,
                category_id: categoryIds,
                name: gameTitle.textContent.trim(),
                image_url: gameImg ? ensureCdnUrl(gameImg.src) : '',
                video_url: mainEl ? ensureCdnUrl(mainEl.dataset.gameVideo, 'video') : ''
            };
            return cachedGameData;
        }
        
        return null;
    };
    
    const saveCurrentPlayTime = async () => {
        const now = Date.now();
        const duration = now - lastSaveTime;
        const gameData = await getGameData();
        
        if (gameData && duration >= 1000) {
            console.log(`⏱️ Saving play time: ${Math.round(duration / 1000)}s for ${gameData.name}`);
            savePlayedGame(gameData, duration);
            lastSaveTime = now;
        }
    };

    // IMMEDIATELY register game as played (duration 0) on load so it appears right away
    getGameData().then(gameData => {
        if (gameData) {
            savePlayedGame(gameData, 0);
            markRecentlyPlayedGames();
        }
    });

    // Save periodically every 5 seconds
    const intervalId = setInterval(saveCurrentPlayTime, 5000);

    // Save when visibility changes (user switches tab or locks screen)
    const onVisibilityChange = () => {
        if (document.hidden) {
            saveCurrentPlayTime();
        } else {
            lastSaveTime = Date.now();
        }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Save on page unload / navigation (both full page and Astro SPA)
    const onPageLeave = () => {
        saveCurrentPlayTime();
    };
    window.addEventListener('beforeunload', onPageLeave);
    window.addEventListener('pagehide', onPageLeave);

    currentGameTrackingCleanup = () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('beforeunload', onPageLeave);
        window.removeEventListener('pagehide', onPageLeave);
        saveCurrentPlayTime();
    };
}

// Save tracking before navigating away
if (!window.__tapwapBeforeSwapBound) {
    window.__tapwapBeforeSwapBound = true;
    document.addEventListener('astro:before-swap', () => {
        if (currentGameTrackingCleanup) {
            currentGameTrackingCleanup();
            currentGameTrackingCleanup = null;
        }
    });
}


// ============ MARK RECENTLY PLAYED GAMES ============

function markRecentlyPlayedGames() {
    try {
        const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        const playedIds = new Set(recentGames.map(g => (g.id || g.game_id)).filter(Boolean));
        const playedSlugs = new Set(recentGames.map(g => g.slug).filter(Boolean));
        
        // Find all game tiles and mark played ones
        document.querySelectorAll('.game-tile, .cat-game-tile').forEach(tile => {
            const tileGameId = tile.dataset.gameId ? parseInt(tile.dataset.gameId) : null;
            const tileSlug = tile.dataset.slug || (tile.getAttribute('href') || '').replace(/^\/game\//, '').replace(/\/$/, '');
            const isPlayed = (tileGameId && playedIds.has(tileGameId)) || (tileSlug && playedSlugs.has(tileSlug));
            if (isPlayed) {
                // Add played marker if not already present
                if (!tile.querySelector('.game-tile-label')) {
                    const label = document.createElement('div');
                    label.className = 'game-tile-label game-tile-label--played';
                    label.innerHTML = `
                        <div class="game-tile-label__container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#009CFF" d="M12 19.898c3.875 0 7.008-3.151 7.008-7.03 0-3.5-2.552-6.407-5.898-6.942a1.25 1.25 0 0 0-1.994-1.458L9.168 6.416a1.25 1.25 0 0 0 0 1.768l1.948 1.948a1.25 1.25 0 0 0 1.838-1.691 4.526 4.526 0 0 1 3.554 4.427c0 2.506-2.022 4.53-4.508 4.53s-4.509-2.024-4.509-4.53a1.25 1.25 0 0 0-2.5 0c0 3.879 3.134 7.03 7.009 7.03"></path>
                            </svg>
                        </div>
                    `;
                    tile.insertBefore(label, tile.firstChild);
                }
            }
        });
        
        console.log(`✅ Marked ${playedIds.size || playedSlugs.size} recently played games`);
    } catch (e) {
        console.error('Error marking played games:', e);
    }
}

// (Handled centrally in window.__tapwapAppBound listener above)


// ============ RECENTLY PLAYED SIDEBAR ============

function initRecentlyPlayedSidebar() {
    const section = document.getElementById('recently-played-section');
    const grid = document.getElementById('recently-grid');
    
    console.log('🎮 Initializing Recently Played Sidebar...');
    console.log('   Section found:', !!section);
    console.log('   Grid found:', !!grid);
    
    if (!section || !grid) {
        console.warn('⚠️ Recently played section or grid not found');
        return;
    }
    
    try {
        const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        console.log(`   Found ${recentGames.length} recently played games in localStorage`);
        
        if (recentGames.length === 0) {
            // No games played, keep section hidden
            section.style.display = 'none';
            console.log('   No games to display, hiding section');
            return;
        }
        
        // Show section and populate grid
        section.style.display = 'block';
        console.log(`   Displaying ${Math.min(recentGames.length, 17)} games`);
        
        // Take up to 17 games for the grid
        const gamesToShow = recentGames.slice(0, 17);
        
        grid.innerHTML = gamesToShow.map(game => `
            <a 
                href="/game/${game.slug || game.id}" 
                class="game-tile"
                title="${game.name}"
                data-video="${ensureCdnUrl(game.video_url, 'video')}"
                data-slug="${game.slug || ''}"
                data-game-id="${game.id}"
            >
                <div class="game-tile-media">
                    <img class="game-thumbnail" src="${ensureCdnUrl(game.image_url, 'image')}" alt="${game.name}" loading="lazy">
                </div>
                <div class="tile-overlay">
                    <span class="tile-name">${game.name}</span>
                </div>
            </a>
        `).join('');
        
        // Initialize video hover for recently played items
        initPopularVideoHover();
        
    } catch (e) {
        console.error('Error loading recently played games:', e);
        section.style.display = 'none';
    }
}

// Unified Video hover for all game tiles (main grid, search results, sidebar recently/popular)
function initGameVideoHover(target = document) {
    const selector = '.game-tile[data-video]:not([data-video-initialized])';
    const root = target || document;
    const gameTiles = (root instanceof Element && root.matches && root.matches(selector))
        ? [root]
        : (root.querySelectorAll ? root.querySelectorAll(selector) : document.querySelectorAll(selector));
    
    gameTiles.forEach(item => {
        const videoUrl = item.dataset.video;
        if (!videoUrl) return;
        
        item.setAttribute('data-video-initialized', 'true');
        let videoCreated = false;
        
        item.addEventListener('mouseenter', function() {
            const currentVideoUrl = this.dataset.video;
            if (!currentVideoUrl) return;
            
            if (!videoCreated) {
                const mediaContainer = this.querySelector('.game-tile-media');
                if (mediaContainer) {
                    const video = document.createElement('video');
                    video.className = 'game-video';
                    video.muted = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.preload = 'auto';
                    video.src = currentVideoUrl;
                    
                    mediaContainer.appendChild(video);
                    
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            console.log('Video play failed:', err);
                        });
                    }
                    
                    videoCreated = true;
                }
            } else {
                const video = this.querySelector('.game-video');
                if (video) {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            console.log('Video play failed:', err);
                        });
                    }
                }
            }
        });
        
        item.addEventListener('mouseleave', function() {
            const video = this.querySelector('.game-video');
            if (video) {
                video.pause();
            }
        });
    });
}

// Aliases for compatibility
window.initGameVideoHover = initGameVideoHover;
window.initPopularVideoHover = initGameVideoHover;
window.initVideoLazyLoad = initGameVideoHover;


// ============ AUTH STATUS CHECK ============

var isSyncingHistory = false;
async function syncGameHistory() {
    if (isSyncingHistory) return;
    isSyncingHistory = true;
    try {
        console.log('🔄 Syncing game history with database...');
        
        // Get localStorage data
        const localGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
        console.log(`   Found ${localGames.length} games in localStorage:`, localGames);
        
        if (localGames.length === 0) {
            console.log('📭 No local history to sync');
            // Load from database
            await loadGameHistoryFromDB();
            return;
        }
        
        console.log('📤 Uploading to database...');
        // Upload localStorage to database
        const response = await fetch('/api/user/game-history', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ games: localGames })
        });
        
        console.log('   Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Synced ${result.synced || localGames.length} games to database`);
            // Load from database to merge with any existing data
            await loadGameHistoryFromDB();
        } else {
            const error = await response.json();
            console.error('❌ Sync failed:', error);
        }
    } catch (error) {
        console.error('❌ Error syncing game history:', error);
    } finally {
        isSyncingHistory = false;
    }
}

var isLoadingHistory = false;
async function loadGameHistoryFromDB() {
    if (isLoadingHistory) return;
    isLoadingHistory = true;
    try {
        const response = await fetch('/api/user/game-history');
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.success) {
            // Save server stats if returned
            if (data.stats) {
                window.currentUserStats = data.stats;
                localStorage.setItem('userAccountStats', JSON.stringify(data.stats));
            }
            
            if (data.history) {
                // Save to localStorage with ID and slug
                const dbGames = data.history.map(h => ({
                    id: h.game_id || h.id,
                    slug: h.slug || '',
                    category_id: normalizeCategoryIds(h.category_id),
                    name: h.name,
                    image_url: ensureCdnUrl(h.image_url),
                    video_url: ensureCdnUrl(h.video_url, 'video') || '',
                    playedAt: new Date(h.played_at).getTime(),
                    playDuration: h.play_duration
                }));
                
                localStorage.setItem('recentlyPlayedGames', JSON.stringify(dbGames));
                console.log(`✅ Loaded ${dbGames.length} games from database`);
                if (dbGames.length > 0 && dbGames[0].category_id) {
                    setLastPlayedCategoriesCookie(dbGames[0].category_id);
                }
                prioritizePlayedCategories();
            }
        }
    } catch (error) {
        console.error('❌ Error loading game history:', error);
    } finally {
        isLoadingHistory = false;
    }
}

var isCheckingAuth = false;
async function checkAuthStatus(force = false) {
    if (window.__tapwapAuthChecked && !force) {
        if (window.currentUser) {
            updateUIForLoggedInUser(window.currentUser);
            populateAccountPanel();
        }
        return;
    }
    if (isCheckingAuth) return;
    isCheckingAuth = true;

    // Detect if running on static host (GitHub Pages, localhost:8945, etc.)
    const isStaticHost = window.location.hostname.includes('github.io') || 
                         window.location.protocol === 'file:' ||
                         window.__isStaticSite === true ||
                         window.location.port === '8945';

    try {
        let authenticated = false;
        let user = null;

        if (isStaticHost) {
            // Default logged in for static non-database site!
            user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {
                id: 1,
                name: 'Player',
                email: 'player@tapwap.com',
                role: 'player',
                provider: 'local'
            };
            authenticated = true;
        } else {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.authenticated && data.user) {
                        authenticated = true;
                        user = data.user;
                    }
                } else if (response.status === 401) {
                    // Guest user (not logged in)
                    authenticated = false;
                    user = null;
                } else if (isStaticHost) {
                    // Static host fallback
                    user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {
                        id: 1,
                        name: 'Player',
                        email: 'player@tapwap.com',
                        role: 'player',
                        provider: 'local'
                    };
                    authenticated = true;
                }
            } catch (_) {
                if (isStaticHost) {
                    user = JSON.parse(localStorage.getItem('currentUser') || 'null') || {
                        id: 1,
                        name: 'Player',
                        email: 'player@tapwap.com',
                        role: 'player',
                        provider: 'local'
                    };
                    authenticated = true;
                }
            }
        }

        window.__tapwapAuthChecked = true;
        
        if (authenticated && user) {
            console.log('✅ User logged in:', user);
            updateUIForLoggedInUser(user);
            
            // Sync game history with database only if backend API is available
            if (!isStaticHost) {
                await syncGameHistory().catch(() => {});
            }
            
            populateAccountPanel();
        } else {
            window.currentUser = null;
            console.log('❌ User not logged in');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    } finally {
        isCheckingAuth = false;
    }
}

function updateUIForLoggedInUser(user) {
    // Update login buttons to show logged-in state
    const loginBtns = document.querySelectorAll('#btn-mobile-login, #btn-login, #btn-login-lg');
    loginBtns.forEach(btn => {
        btn.setAttribute('data-logged-in', 'true');
        btn.setAttribute('title', user.name || 'Your Account');
        
        // Ensure svg icon is displayed (turns pink via CSS)
        const svg = btn.querySelector('svg');
        if (svg) svg.style.display = 'block';
    });
    
    // Store user data globally for account panel
    window.currentUser = user;
    
    // Update login button click handlers to open account panel
    loginBtns.forEach(btn => {
        // Remove old click handlers
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Opening account panel for logged in user');
            openAccountPanel();
        });
    });
}

function openAccountPanel() {
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    const panelSearch = document.getElementById('panel-search');
    const panelLogin = document.getElementById('panel-login');
    const panelAccount = document.getElementById('panel-account');
    
    // Show account panel
    panelSearch.style.display = 'none';
    panelLogin.style.display = 'none';
    panelAccount.style.display = '';
    
    // Open sidebar
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Populate account data immediately from cache
    populateAccountPanel();
    
    // Refresh stats from server in background
    syncGameHistory().then(() => {
        populateAccountPanel();
    }).catch(() => {});
    
    // Setup logout button
    const logoutBtn = document.getElementById('account-logout-btn');
    if (logoutBtn) {
        if (window.__isStaticSite) {
            logoutBtn.style.display = 'none';
        }
        logoutBtn.onclick = () => {
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        };
    }
}

function populateAccountPanel() {
    const user = window.currentUser;
    if (!user) return;
    
    // Update subtitle with provider
    const subtitle = document.getElementById('account-subtitle');
    if (subtitle) {
        if (user.provider === 'local' || user.provider === 'guest' || !user.provider) {
            subtitle.textContent = `Welcome back, ${user.name || 'Player'}!`;
        } else {
            const providerName = user.provider === 'google' ? 'Google' : (user.provider === 'microsoft' ? 'Microsoft' : 'Apple');
            subtitle.textContent = `You are logged in with ${providerName}${user.role === 'administrator' ? ' (Admin)' : ''}`;
        }
    }
    
    // Add admin link if user is administrator
    let adminBtn = document.getElementById('account-admin-btn');
    if (user.role === 'administrator') {
        if (!adminBtn) {
            adminBtn = document.createElement('a');
            adminBtn.id = 'account-admin-btn';
            adminBtn.href = '/twmanager';
            adminBtn.setAttribute('data-astro-reload', 'true');
            adminBtn.className = 'account-admin-link';
            adminBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 6px;padding:9px 14px;background:#009CFF;color:#fff;border-radius:10px;text-align:center;font-weight:700;font-size:13px;text-decoration:none;box-shadow:0 2px 8px rgba(0,156,255,0.3);transition:background 0.2s;';
            adminBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg><span>Admin Console</span>';
            const headerTop = document.querySelector('.account-header-top');
            if (headerTop && headerTop.parentNode) {
                headerTop.parentNode.insertBefore(adminBtn, headerTop.nextSibling);
            }
        } else {
            adminBtn.style.display = 'block';
        }
    } else if (adminBtn) {
        adminBtn.style.display = 'none';
    }
    
    // Get recently played games from localStorage
    const recentGames = JSON.parse(localStorage.getItem('recentlyPlayedGames') || '[]');
    
    // Accurate stats: prefer server stats, fallback to localStorage
    let gamesPlayed = 0;
    let totalTime = 0;
    
    const savedStats = window.currentUserStats || JSON.parse(localStorage.getItem('userAccountStats') || 'null');
    if (savedStats && typeof savedStats.games_played === 'number') {
        gamesPlayed = savedStats.games_played;
        totalTime = savedStats.time_played || 0;
    } else {
        gamesPlayed = recentGames.length;
        totalTime = recentGames.reduce((sum, game) => sum + (game.playDuration || 0), 0);
    }
    
    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    
    // Update stats DOM
    const gamesPlayedEl = document.getElementById('account-games-played');
    const timePlayedEl = document.getElementById('account-time-played');
    if (gamesPlayedEl) gamesPlayedEl.textContent = gamesPlayed;
    if (timePlayedEl) {
        if (hours > 0) {
            timePlayedEl.textContent = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            timePlayedEl.textContent = `${minutes}m`;
        } else if (seconds > 0) {
            timePlayedEl.textContent = `${seconds}s`;
        } else {
            timePlayedEl.textContent = `0m`;
        }
    }
    
    // Populate Recently Played (up to 12 games)
    const recentlyPlayedSection = document.getElementById('account-recently-played-section');
    const recentlyPlayedGrid = document.getElementById('account-recently-played-grid');
    
    if (recentGames.length > 0) {
        recentlyPlayedSection.style.display = 'block';
        recentlyPlayedGrid.innerHTML = recentGames.slice(0, 12).map(game => `
            <a 
                href="/game/${game.slug || game.id}" 
                class="game-tile"
                title="${game.name}"
                data-video="${ensureCdnUrl(game.video_url, 'video')}"
                data-slug="${game.slug || ''}"
                data-game-id="${game.id}"
            >
                <div class="game-tile-media">
                    <img class="game-thumbnail" src="${ensureCdnUrl(game.image_url, 'image')}" alt="${game.name}" loading="lazy">
                </div>
                <div class="tile-overlay">
                    <span class="tile-name">${game.name}</span>
                </div>
            </a>
        `).join('');
        
        // Initialize video hover
        initPopularVideoHover();
    } else {
        recentlyPlayedSection.style.display = 'none';
    }
    
    // Populate Most Played (games with longest play time) + Category Tile based on top game
    const mostPlayedSection = document.getElementById('account-most-played-section');
    const mostPlayedGrid = document.getElementById('account-most-played-grid');
    
    if (recentGames.length > 0) {
        const sortedByPlayTime = [...recentGames].sort((a, b) => (b.playDuration || 0) - (a.playDuration || 0));
        const topGame = sortedByPlayTime[0];
        
        // Find category of the user's most played game
        const topCatIds = normalizeCategoryIds(topGame ? topGame.category_id : null);
        const topCatId = topCatIds.length > 0 ? topCatIds[0] : null;
        const siteCats = window.siteCategories || [];
        let topCategory = topCatId ? siteCats.find(c => Number(c.id) === Number(topCatId)) : null;
        if (!topCategory && siteCats.length > 0) {
            topCategory = siteCats[0];
        }
        
        // Helper to get category icon with SVG fallback
        const getCategoryIconSvg = (cat) => {
            if (cat && cat.icon && typeof cat.icon === 'string' && cat.icon.trim().startsWith('<svg')) {
                return cat.icon.trim();
            }
            const fallbackIcons = {
                action: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
                puzzle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>`,
                racing: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14-1-3"/><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/></svg>`,
                sports: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 7 4 3-1.5 4.5h-5L8 10l4-3Z"/><path d="m12 7-.5-5"/><path d="m8 10-5-1"/><path d="m9.5 14.5-3 4"/><path d="m14.5 14.5 3 4"/><path d="m16 10 5-1"/><path d="m6.5 18.5 2.5 2"/><path d="m17.5 18.5-2.5 2"/></svg>`,
                multiplayer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
                arcade: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>`
            };
            const slug = cat ? (cat.slug || '').toLowerCase() : '';
            for (const key of Object.keys(fallbackIcons)) {
                if (slug.includes(key)) return fallbackIcons[key];
            }
            return fallbackIcons.arcade;
        };

        const catIconSvg = getCategoryIconSvg(topCategory);
        
        // Category tile (takes last 2 slots on desktop, wraps on mobile)
        const categoryTileHtml = topCategory ? `
            <a 
                class="category-tile account-category-tile"
                href="/category/${topCategory.slug}"
                style="background: ${topCategory.color || '#00a8ff'};"
                title="${topCategory.name}"
                data-category-id="${topCategory.id}"
                data-category-slug="${topCategory.slug}"
            >
                <div class="category-icon-bg">${catIconSvg}</div>
                <div class="category-tile-content">
                    <h3 class="category-tile-name">${topCategory.name}</h3>
                </div>
            </a>
        ` : '';
        
        // Display up to 4 games alongside the 2-col category tile
        const mostPlayed = sortedByPlayTime.slice(0, 4);
        
        if (mostPlayed.length > 0) {
            mostPlayedSection.style.display = 'block';
            const gamesHtml = mostPlayed.map(game => `
                <a 
                    href="/game/${game.slug || game.id}" 
                    class="game-tile"
                    title="${game.name}"
                    data-video="${ensureCdnUrl(game.video_url, 'video')}"
                    data-slug="${game.slug || ''}"
                    data-game-id="${game.id}"
                >
                    <div class="game-tile-media">
                        <img class="game-thumbnail" src="${ensureCdnUrl(game.image_url, 'image')}" alt="${game.name}" loading="lazy">
                    </div>
                    <div class="tile-overlay">
                        <span class="tile-name">${game.name}</span>
                    </div>
                </a>
            `).join('');
            
            mostPlayedGrid.innerHTML = gamesHtml + categoryTileHtml;
            
            // Initialize video hover
            initPopularVideoHover();
        }
    } else {
        mostPlayedSection.style.display = 'none';
    }
    
    const topCatSec = document.getElementById('account-top-category-section');
    if (topCatSec) topCatSec.style.display = 'none';
}

async function logout() {
    try {
        localStorage.removeItem('userAccountStats');
        window.currentUserStats = null;
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        window.location.reload();
    }
}
