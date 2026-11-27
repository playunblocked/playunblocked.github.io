/**
 * Unified Infinite Scroll
 * Works for: category pages, hot-games, new-games (Desktop & Mobile)
 */

console.log('🎮 Infinite scroll script loaded');

// Run on initial load and Astro View Transitions
if (!window.__infiniteScrollBound) {
    window.__infiniteScrollBound = true;
    document.addEventListener('astro:page-load', initInfiniteScroll);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.__infiniteScrollRanInitial) initInfiniteScroll();
        });
    } else {
        initInfiniteScroll();
    }
}

function initInfiniteScroll() {
    window.__infiniteScrollRanInitial = true;

    // Disconnect any previous observer from prior page
    if (window.__infiniteScrollObserver) {
        window.__infiniteScrollObserver.disconnect();
        window.__infiniteScrollObserver = null;
    }
    if (window.__infiniteScrollHandler) {
        window.removeEventListener('scroll', window.__infiniteScrollHandler);
        window.removeEventListener('touchmove', window.__infiniteScrollHandler);
        window.__infiniteScrollHandler = null;
    }

    // Detect page type from URL
    const path = window.location.pathname;
    let pageType, apiEndpoint, emoji, pinnedIds = [], initialOffset = 0, ssrBatchSize = 60, hasSsrInitialCount = false;
    
    if (path.includes('/category/')) {
        pageType = 'category';
        const pathParts = path.split('/').filter(Boolean);
        const categorySlug = pathParts[pathParts.length - 1];
        apiEndpoint = `/api/category/${categorySlug}`;
        emoji = '📂';
        ssrBatchSize = 60;
        
        // Get pinned IDs and initial SSR count from script tag
        const scriptTag = document.querySelector('script[data-pinned-ids], script[data-initial-count]');
        if (scriptTag) {
            if (scriptTag.hasAttribute('data-pinned-ids')) {
                try {
                    pinnedIds = JSON.parse(scriptTag.getAttribute('data-pinned-ids') || '[]');
                } catch (_) {
                    pinnedIds = [];
                }
            }
            if (scriptTag.hasAttribute('data-initial-count')) {
                hasSsrInitialCount = true;
                const initialCount = parseInt(scriptTag.getAttribute('data-initial-count') || '0', 10);
                if (!isNaN(initialCount)) {
                    initialOffset = initialCount;
                }
            }
        }
        
    } else if (path.includes('/hot-games')) {
        pageType = 'hot';
        apiEndpoint = '/api/hot-games';
        emoji = '🔥';
        initialOffset = 30; // 30 loaded initially via SSR
        ssrBatchSize = 30;
        hasSsrInitialCount = true;
        
    } else if (path.includes('/new-games')) {
        pageType = 'new';
        apiEndpoint = '/api/new-games';
        emoji = '✨';
        initialOffset = 30; // 30 loaded initially via SSR
        ssrBatchSize = 30;
        hasSsrInitialCount = true;
        
    } else {
        return;
    }
    
    let isLoading = false;
    let hasMore = hasSsrInitialCount ? (initialOffset >= ssrBatchSize) : true;
    let currentOffset = initialOffset;
    const LOAD_MORE_COUNT = 60;
    
    const mosaicWrapper = document.querySelector('main.mosaic-wrapper');
    const mosaicGrid = mosaicWrapper ? mosaicWrapper.querySelector('.mosaic-grid') : null;
    if (!mosaicWrapper || !mosaicGrid || mosaicGrid.dataset.infiniteScrollInit === '1') {
        return;
    }
    mosaicGrid.dataset.infiniteScrollInit = '1';

    if (!hasMore) {
        return;
    }

    // CDN & Asset URL Helper (supports localhost, GitHub Pages, and production)
    const getCdnUrl = (url) => {
        if (!url) return '';
        // If it points to cdn.tapwap.com or localhost, normalize to local /games/
        if (url.includes('cdn.tapwap.com') || url.includes('localhost:4321')) {
            const clean = url.replace(/^https?:\/\/[^/]+\/(?:games\/)?/, '');
            return `/games/${clean}`;
        }
        if (url.startsWith('/games/')) return url;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const clean = url.replace(/^\/?(?:games\/)?/, '');
        return `/games/${clean}`;
    };
    
    // Create game tile element
    const createGameTile = (game) => {
        const tile = document.createElement('a');
        let size = '1x1';
        const isMobileScreen = window.innerWidth <= 768;
        if (pageType === 'new' || pageType === 'hot') {
            const rand = Math.random();
            // On mobile screen (<= 768px), 3x3 tiles are hidden via CSS, so avoid 3x3 on mobile
            if (!isMobileScreen && rand < 0.05) {
                size = '3x3';
            } else if (rand < 0.20) {
                size = '2x2';
            }
        }
        const [colSpan, rowSpan] = size.split('x').map(Number);
        const large = size === '3x3' ? ' tile-3x3' : (size === '2x2' ? ' tile-large' : '');
        
        tile.className = `game-tile${large}`;
        tile.href = `/g/${game.slug}`;
        tile.style.gridColumn = `span ${colSpan}`;
        tile.style.gridRow = `span ${rowSpan}`;
        tile.title = game.name;
        tile.setAttribute('data-video', getCdnUrl(game.video_url));
        tile.setAttribute('data-game-id', game.id);
        tile.setAttribute('data-slug', game.slug);
        tile.setAttribute('data-size', size);
        
        tile.innerHTML = `
            <div class="game-tile-media">
                <img class="game-thumbnail" src="${getCdnUrl(game.image_url)}" alt="${game.name}" loading="lazy">
            </div>
            <div class="tile-overlay">
                <span class="tile-name">${game.name}</span>
            </div>
        `;
        
        return tile;
    };

    // Sentinel element at end of wrapper (transparent, NOT visibility:hidden to support iOS WebKit)
    let sentinel = mosaicWrapper.querySelector('.scroll-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        sentinel.style.width = '100%';
        sentinel.style.height = '10px';
        sentinel.style.pointerEvents = 'none';
        sentinel.style.opacity = '0';
        mosaicWrapper.appendChild(sentinel);
    }

    let observedTarget = null;
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting && !isLoading && hasMore) {
                loadMoreGames();
                break;
            }
        }
    }, {
        rootMargin: '1200px' // Preload 1200px ahead on all devices
    });
    window.__infiniteScrollObserver = observer;

    // Attach observer to the optimal trigger point:
    // On mobile/desktop with category tiles, observe the element right before or at the first category tile.
    // If no category tiles, observe a game tile near the bottom (or sentinel).
    const updateObserverTarget = () => {
        if (observedTarget) {
            observer.unobserve(observedTarget);
            observedTarget = null;
        }
        if (!hasMore) return;

        // Priority 1: First category tile (marks the exact end of the games list)
        const firstCategoryTile = mosaicGrid.querySelector('.category-tile-other');
        if (firstCategoryTile) {
            observedTarget = firstCategoryTile;
            observer.observe(observedTarget);
            return;
        }

        // Priority 2: Tile near the bottom of games
        const gameTiles = mosaicGrid.querySelectorAll('.game-tile');
        if (gameTiles.length > 0) {
            const targetIdx = Math.max(0, gameTiles.length - 4);
            observedTarget = gameTiles[targetIdx];
            observer.observe(observedTarget);
            return;
        }

        // Priority 3: Fallback sentinel
        if (sentinel && sentinel.parentNode) {
            observedTarget = sentinel;
            observer.observe(observedTarget);
        }
    };
    
    // Load more games from API
    const loadMoreGames = async () => {
        if (isLoading || !hasMore) {
            return;
        }
        
        isLoading = true;
        console.log(`${emoji} Loading games...`, { offset: currentOffset, limit: LOAD_MORE_COUNT });
        
        try {
            let data = null;
            try {
                const url = `${apiEndpoint}?offset=${currentOffset}&limit=${LOAD_MORE_COUNT}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                data = await response.json();
            } catch (apiErr) {
                // Static mode fallback for GitHub Pages (read from pre-rendered static data)
                try {
                    if (!window.__gamesIndexCache) {
                        const res = await fetch('/data/games-index.json');
                        window.__gamesIndexCache = await res.json();
                    }
                    const allGames = window.__gamesIndexCache || [];
                    let filtered = allGames;
                    if (pageType === 'category') {
                        const catSlug = path.split('/').filter(Boolean).pop();
                        filtered = allGames.filter(g => g.categories && (Array.isArray(g.categories) ? g.categories.includes(catSlug) : String(g.categories).includes(catSlug)));
                    } else if (pageType === 'new') {
                        filtered = [...allGames].sort((a,b) => (Number(b.id)||0) - (Number(a.id)||0));
                    } else if (pageType === 'hot') {
                        filtered = [...allGames].sort((a,b) => (Number(b.rating)||0) - (Number(a.rating)||0));
                    }
                    const slice = filtered.slice(currentOffset, currentOffset + LOAD_MORE_COUNT);
                    data = {
                        games: slice,
                        offset: currentOffset + slice.length,
                        hasMore: (currentOffset + slice.length) < filtered.length
                    };
                } catch (fallbackErr) {
                    console.error('❌ Error loading games:', apiErr, fallbackErr);
                    hasMore = false;
                    cleanup();
                    return;
                }
            }
            
            if (!data.games || data.games.length === 0) {
                hasMore = false;
                console.log('✅ No more games');
                cleanup();
                return;
            }
            
            // Filter out pinned games (category pages only)
            let gamesToAdd = data.games;
            if (pageType === 'category' && pinnedIds.length > 0) {
                gamesToAdd = data.games.filter(g => !pinnedIds.includes(g.id));
            }
            
            // If all games were filtered out, try next batch
            if (gamesToAdd.length === 0) {
                currentOffset = data.offset;
                isLoading = false;
                if (data.hasMore) {
                    loadMoreGames();
                } else {
                    hasMore = false;
                    cleanup();
                }
                return;
            }
            
            // Create and insert game tiles before category tiles
            const categoryTiles = mosaicGrid.querySelectorAll('.category-tile-other');
            const insertBeforeElement = categoryTiles.length > 0 ? categoryTiles[0] : null;

            const fragment = document.createDocumentFragment();
            gamesToAdd.forEach(game => {
                const tile = createGameTile(game);
                fragment.appendChild(tile);
            });
            
            if (insertBeforeElement && insertBeforeElement.parentNode === mosaicGrid) {
                mosaicGrid.insertBefore(fragment, insertBeforeElement);
            } else {
                mosaicGrid.appendChild(fragment);
            }
            
            // Update state
            currentOffset = data.offset;
            hasMore = Boolean(data.hasMore);
            
            // Trigger video lazy loading and recently played marking
            window.dispatchEvent(new Event('gamesAdded'));
            
            if (!hasMore) {
                cleanup();
            } else {
                updateObserverTarget();
                // Check if user is still near the bottom of games
                requestAnimationFrame(checkScrollFallback);
            }
            
        } catch (error) {
            console.error('❌ Error loading games:', error);
        } finally {
            isLoading = false;
        }
    };

    const cleanup = () => {
        if (observedTarget) {
            observer.unobserve(observedTarget);
            observedTarget = null;
        }
        if (sentinel && sentinel.parentNode) {
            sentinel.remove();
        }
        if (window.__infiniteScrollHandler) {
            window.removeEventListener('scroll', window.__infiniteScrollHandler);
            window.removeEventListener('touchmove', window.__infiniteScrollHandler);
            window.__infiniteScrollHandler = null;
        }
    };
    
    // Robust Fallback Trigger (works on Mobile iOS/Android touch and Desktop scroll):
    // Checks if the user is within 1500px of the last game tile or the category boundary
    const checkScrollFallback = () => {
        if (isLoading || !hasMore) return;
        
        const gameTiles = mosaicGrid.querySelectorAll('.game-tile');
        const lastTile = gameTiles.length > 0 ? gameTiles[gameTiles.length - 1] : null;
        if (lastTile) {
            const rect = lastTile.getBoundingClientRect();
            // If last game tile is within 1500px of viewport bottom (or passed it)
            if (rect.top <= window.innerHeight + 1500) {
                loadMoreGames();
                return;
            }
        }
        
        // Also check if approaching page bottom
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        const docHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight
        );
        if (scrollY + viewportHeight >= docHeight - 1200) {
            loadMoreGames();
        }
    };

    let scrollRaf = null;
    const handleScroll = () => {
        if (!scrollRaf) {
            scrollRaf = requestAnimationFrame(() => {
                scrollRaf = null;
                checkScrollFallback();
            });
        }
    };

    window.__infiniteScrollHandler = handleScroll;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    
    // Initial target setup
    updateObserverTarget();

    // Only trigger immediate load if SSR did not pre-render initial games
    if (initialOffset === 0) {
        loadMoreGames();
    } else {
        // Trigger initial check in case screen height can fit more than initial batch
        requestAnimationFrame(checkScrollFallback);
    }
}
