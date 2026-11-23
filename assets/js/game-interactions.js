/**
 * Game Interactions - Like, Dislike, Report
 * Uses new centralized user-data storage system
 */

import { 
    likeGame, 
    dislikeGame, 
    reportGame, 
    unlikeGame, 
    undislikeGame,
    isGameLiked, 
    isGameDisliked,
    isGameReported,
    addRecentGame
} from '../../src/lib/user-data.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const gameIdStr = document.querySelector('[data-game-id]')?.dataset.gameId;
    if (!gameIdStr) {
        console.error('Game ID not found');
        return;
    }
    
    const gameId = parseInt(gameIdStr);
    const gameSlug = window.location.pathname.split('/').pop();
    
    // Add to recent games
    addRecentGame(gameId);
    
    // Update button states based on user data
    updateButtonStates(gameId);
    
    // Setup interaction handlers
    setupLikeDislikeHandlers(gameId, gameSlug);
    setupReportHandler(gameId, gameSlug);
});

/**
 * Update button states on page load
 */
function updateButtonStates(gameId) {
    const likeBtn = document.querySelector('[data-action="like"]');
    const dislikeBtn = document.querySelector('[data-action="dislike"]');
    const reportBtn = document.getElementById('report-btn');
    
    // Check and update Like button
    if (likeBtn && isGameLiked(gameId)) {
        const svg = likeBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', 'currentColor');
    }
    
    // Check and update Dislike button
    if (dislikeBtn && isGameDisliked(gameId)) {
        const svg = dislikeBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', 'currentColor');
    }
    
    // Check and update Report button
    if (reportBtn && isGameReported(gameId)) {
        const svg = reportBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', 'currentColor');
    }
}

/**
 * Setup Like/Dislike handlers
 */
function setupLikeDislikeHandlers(gameId, gameSlug) {
    document.querySelectorAll('.game-action-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            
            if (action !== 'like' && action !== 'dislike') return;
            
            const likeBtn = document.querySelector('[data-action="like"]');
            const dislikeBtn = document.querySelector('[data-action="dislike"]');
            const likeSvg = likeBtn?.querySelector('svg');
            const dislikeSvg = dislikeBtn?.querySelector('svg');
            const likeCountSpan = likeBtn?.querySelector('.action-count');
            const dislikeCountSpan = dislikeBtn?.querySelector('.action-count');
            
            // Check current state
            const isLiked = isGameLiked(gameId);
            const isDisliked = isGameDisliked(gameId);
            const isTogglingOff = (action === 'like' && isLiked) || (action === 'dislike' && isDisliked);
            
            if (isTogglingOff) {
                // TOGGLE OFF
                const svg = btn.querySelector('svg');
                if (svg) svg.setAttribute('fill', 'none');
                
                // Decrease count
                const countSpan = btn.querySelector('.action-count');
                if (countSpan) {
                    const currentCount = parseInt(countSpan.textContent) || 0;
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }
                
                // Update backend
                await updateBackendCount(gameSlug, action, -1);
                
                // Update user data
                if (action === 'like') {
                    unlikeGame(gameId);
                } else {
                    undislikeGame(gameId);
                }
                
                console.log('Toggled OFF:', action);
                return;
            }
            
            // TOGGLE ON or SWITCH
            
            // Reset both buttons
            if (likeSvg) likeSvg.setAttribute('fill', 'none');
            if (dislikeSvg) dislikeSvg.setAttribute('fill', 'none');
            
            // If switching, decrease old button count
            if (isLiked || isDisliked) {
                const oldAction = isLiked ? 'like' : 'dislike';
                const oldBtn = oldAction === 'like' ? likeBtn : dislikeBtn;
                const oldCountSpan = oldBtn?.querySelector('.action-count');
                
                if (oldCountSpan) {
                    const currentCount = parseInt(oldCountSpan.textContent) || 0;
                    oldCountSpan.textContent = Math.max(0, currentCount - 1);
                }
                
                await updateBackendCount(gameSlug, oldAction, -1);
            }
            
            // Fill clicked button
            const svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'currentColor');
            
            // Increase count
            const countSpan = btn.querySelector('.action-count');
            if (countSpan) {
                const currentCount = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = currentCount + 1;
            }
            
            // Update backend
            await updateBackendCount(gameSlug, action, 1);
            
            // Update user data
            if (action === 'like') {
                likeGame(gameId);
            } else {
                dislikeGame(gameId);
            }
            
            console.log('Toggled ON:', action);
        });
    });
}

/**
 * Setup Report handler
 */
function setupReportHandler(gameId, gameSlug) {
    const reportBtn = document.getElementById('report-btn');
    const reportFormBox = document.getElementById('report-form-box');
    const reportFormCloseBtn = document.getElementById('report-form-close-btn');
    const reportSendBtn = document.getElementById('report-send-btn');
    const reportTextarea = document.getElementById('report-textarea');
    const reportGameName = document.getElementById('report-game-name');
    const reportThankYouBox = document.getElementById('report-thank-you-box');
    const reportThankYouCloseBtn = document.getElementById('report-thank-you-close-btn');
    
    let currentReportId = null;
    
    if (!reportBtn || !reportFormBox) return;
    
    // Open report form
    reportBtn.addEventListener('click', async (e) => {
        const gameName = reportBtn.dataset.gameName || 'this game';
        const isDirectUserClick = e.isTrusted;
        
        let actionType;
        if (isDirectUserClick && !reportBtn.dataset.actionType) {
            actionType = 'report';
            reportBtn.dataset.actionType = 'report';
        } else if (isDirectUserClick && reportBtn.dataset.actionType && reportBtn.dataset.actionType !== 'report') {
            actionType = 'report';
            reportBtn.dataset.actionType = 'report';
        } else {
            actionType = reportBtn.dataset.actionType || 'report';
        }
        
        // Fill report button icon if actionType is 'report'
        if (actionType === 'report') {
            const svg = reportBtn.querySelector('svg');
            if (svg) svg.setAttribute('fill', 'currentColor');
            
            // Save to user data
            reportGame(gameId);
        }
        
        // Change title based on action type
        let titleText = '';
        let placeholderText = '';
        
        if (actionType === 'like') {
            titleText = `What do you like about<br>${gameName}?`;
            placeholderText = "Tell us what you enjoyed... the gameplay, graphics, controls, or something else?";
        } else if (actionType === 'dislike') {
            titleText = `What don't you like about<br>${gameName}?`;
            placeholderText = "Let us know what could be improved... was it too hard, buggy, or something else?";
        } else {
            titleText = `WHAT BUG DID YOU FIND IN<br>${gameName}?`;
            placeholderText = "Help us understand the bug you found... and please only share info on the bug itself";
        }
        
        reportGameName.innerHTML = titleText;
        reportTextarea.setAttribute('placeholder', placeholderText);
        reportFormBox.style.display = 'block';
        reportTextarea.value = '';
        reportTextarea.focus();
        
        // Log report to backend (create initial record)
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameSlug,
                    gameName,
                    actionType,
                    message: '(Form opened - not submitted yet)',
                    attachScreenshot: false,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                console.log('✅ Report form opened, initial record created');
            } else {
                console.error('❌ Failed to create initial report');
            }
        } catch (error) {
            console.error('Error logging form open:', error);
        }
    });
    
    // Close report form
    if (reportFormCloseBtn) {
        reportFormCloseBtn.addEventListener('click', () => {
            reportFormBox.style.display = 'none';
            reportBtn.dataset.actionType = 'report';
        });
    }
    
    // Send report (update the existing record)
    if (reportSendBtn) {
        reportSendBtn.addEventListener('click', async () => {
            const message = reportTextarea.value.trim();
            const gameName = reportBtn.dataset.gameName || 'this game';
            const attachScreenshot = document.getElementById('report-screenshot').checked;
            const actionType = reportBtn.dataset.actionType || 'report';
            
            console.log('Updating report with actionType:', actionType);
            
            try {
                const response = await fetch('/api/reports', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        gameSlug,
                        gameName,
                        actionType,
                        message: message || '(No description provided)',
                        attachScreenshot,
                        timestamp: new Date().toISOString()
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Report updated successfully');
                } else {
                    console.error('❌ Report update failed');
                }
                
                // Reset actionType
                reportBtn.dataset.actionType = 'report';
                
                // Hide form, show thank you
                reportFormBox.style.display = 'none';
                reportThankYouBox.style.display = 'flex';
                
                // Auto close after 2.5s
                setTimeout(() => {
                    reportThankYouBox.style.display = 'none';
                }, 2500);
                
            } catch (error) {
                console.error('Error sending report:', error);
                alert('Failed to send report. Please try again.');
            }
        });
    }
    
    // Close thank you box
    if (reportThankYouCloseBtn) {
        reportThankYouCloseBtn.addEventListener('click', () => {
            reportThankYouBox.style.display = 'none';
        });
    }
}

/**
 * Update backend count
 */
async function updateBackendCount(gameSlug, action, increment) {
    try {
        await fetch('/api/games/like-dislike', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameSlug,
                action,
                increment
            })
        });
    } catch (error) {
        console.error('Error updating backend:', error);
    }
}
