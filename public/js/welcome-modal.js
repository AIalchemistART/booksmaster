// Books Master Welcome Modal
(function() {
    'use strict';

    // Check if modal should be shown
    function shouldShowModal() {
        const hideModalPermanent = localStorage.getItem('hideBooksmasterWelcomeModal');
        const hideModalThisSession = sessionStorage.getItem('hideBooksmasterWelcomeModal');
        const signedUpEmail = localStorage.getItem('booksmasterSignedUpEmail');
        
        // Don't show if permanently hidden or hidden this session
        if (hideModalPermanent === 'true' || hideModalThisSession === 'true') {
            return false;
        }
        
        return true;
    }

    // Create and show modal
    function createModal() {
        if (!shouldShowModal()) return;

        const signedUpEmail = localStorage.getItem('booksmasterSignedUpEmail');
        const hasSignedUp = !!signedUpEmail;

        const modalHTML = `
            <div id="booksmaster-welcome-modal" class="bm-modal-overlay">
                <div class="bm-modal-container">
                    <button class="bm-modal-close" onclick="closeBooksmasterModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <div class="bm-modal-content">
                        <!-- Header -->
                        <div class="bm-modal-header">
                            <div class="bm-modal-icon">📖</div>
                            <h2>Welcome to <span class="bm-gold-text">Booksmaster</span></h2>
                            <p class="bm-modal-subtitle">Thank you for visiting!</p>
                        </div>

                        <!-- Mission Boxes -->
                        <div class="bm-modal-section">
                            <div class="bm-info-box bm-box-green">
                                <div class="bm-box-header">
                                    <span class="bm-box-icon">❤️</span>
                                    <h3>Free & Open Source</h3>
                                </div>
                                <p>Booksmaster is <strong>100% free</strong> and released under the <strong>MIT License</strong>. 
                                   No subscriptions, no vendor lock-in, no paywalls—ever. Download, use, modify, and 
                                   share freely. Built for contractors, by contractors.</p>
                            </div>

                            <div class="bm-info-box bm-box-blue">
                                <div class="bm-box-header">
                                    <span class="bm-box-icon">💙</span>
                                    <h3>Community-Sustained</h3>
                                </div>
                                <p>This project is sustained by community donations. If Booksmaster saves you money 
                                   at tax time, please consider donating to keep it free for everyone. Every contribution 
                                   helps fund development, hosting, and new features.</p>
                            </div>

                            <div class="bm-info-box bm-box-gold">
                                <div class="bm-box-header">
                                    <span class="bm-box-icon">📚</span>
                                    <h3>Upcoming Book</h3>
                                </div>
                                <p><strong>"The Alchemist's Cookbook"</strong> - A book on personal philosophy and 
                                   AI's potential to transform humanity's future. <span class="bm-gold-text">Free for 
                                   newsletter subscribers</span> when it's ready!</p>
                            </div>
                        </div>

                        <!-- Newsletter Signup -->
                        <div class="bm-newsletter-section">
                            <div class="bm-newsletter-header">
                                <span class="bm-newsletter-icon">✉️</span>
                                <div>
                                    <h3>Get Updates & Free Book</h3>
                                    <p>Stay informed about new features and receive the book when it launches!</p>
                                </div>
                            </div>
                            
                            ${hasSignedUp ? `
                                <div class="bm-signup-success">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    <span>Thank you! You'll receive updates soon.</span>
                                </div>
                            ` : `
                                <form id="bm-newsletter-form" class="bm-newsletter-form">
                                    <div class="bm-input-wrapper">
                                        <input 
                                            type="email" 
                                            id="bm-modal-email" 
                                            placeholder="your@email.com"
                                            required
                                        />
                                        <button type="submit" class="bm-btn-submit" id="bm-submit-btn">
                                            Sign Up
                                        </button>
                                    </div>
                                    <div id="bm-newsletter-status" class="bm-newsletter-status"></div>
                                </form>
                            `}
                        </div>

                        <!-- Don't Show Again -->
                        <div class="bm-modal-checkbox">
                            <input type="checkbox" id="bm-dont-show" />
                            <label for="bm-dont-show">Don't show this message again</label>
                        </div>

                        <!-- Action Buttons -->
                        <div class="bm-modal-actions">
                            <button class="bm-btn bm-btn-secondary" onclick="closeBooksmasterModal()">
                                Continue Exploring
                            </button>
                            <a href="donate.html" class="bm-btn bm-btn-primary" onclick="closeBooksmasterModal()">
                                ❤️ Support Development
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        if (!hasSignedUp) {
            setupNewsletterForm();
        }
        
        // Show modal with animation
        setTimeout(() => {
            document.getElementById('booksmaster-welcome-modal').classList.add('bm-modal-show');
        }, 100);
    }

    // Setup newsletter form
    function setupNewsletterForm() {
        const form = document.getElementById('bm-newsletter-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('bm-modal-email');
            const submitBtn = document.getElementById('bm-submit-btn');
            const statusEl = document.getElementById('bm-newsletter-status');
            const email = emailInput.value.trim();
            
            if (!email) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing Up...';
            statusEl.textContent = '';
            statusEl.className = 'bm-newsletter-status';

            try {
                const response = await fetch('/.netlify/functions/newsletter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, source: 'welcome_modal' })
                });

                if (response.ok) {
                    localStorage.setItem('booksmasterSignedUpEmail', email);
                    statusEl.className = 'bm-newsletter-status bm-status-success';
                    statusEl.textContent = '✓ Thank you! You\'ll receive updates soon.';
                    
                    // Replace form with success message after delay
                    setTimeout(() => {
                        form.innerHTML = `
                            <div class="bm-signup-success">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <span>Thank you! You'll receive updates soon.</span>
                            </div>
                        `;
                    }, 1500);
                } else {
                    const error = await response.json();
                    statusEl.className = 'bm-newsletter-status bm-status-error';
                    statusEl.textContent = '✗ ' + (error.error || 'Failed to subscribe. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Up';
                }
            } catch (error) {
                statusEl.className = 'bm-newsletter-status bm-status-error';
                statusEl.textContent = '✗ Network error. Please check your connection.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
    }

    // Close modal function (global)
    window.closeBooksmasterModal = function() {
        const modal = document.getElementById('booksmaster-welcome-modal');
        const dontShow = document.getElementById('bm-dont-show');
        
        if (dontShow && dontShow.checked) {
            localStorage.setItem('hideBooksmasterWelcomeModal', 'true');
        } else {
            // Always hide for this session when closed
            sessionStorage.setItem('hideBooksmasterWelcomeModal', 'true');
        }
        
        if (modal) {
            modal.classList.remove('bm-modal-show');
            setTimeout(() => modal.remove(), 300);
        }
    };

    // Initialize modal on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createModal, 1000);
        });
    } else {
        setTimeout(createModal, 1000);
    }
})();
