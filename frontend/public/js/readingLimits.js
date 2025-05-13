// Global variables for tracking reading status
let freePostsRead = 0;
let isSubscribed = false;

// Initialize reading limits functionality
function initReadingLimits() {
    // Get the subscription modal
    const subscriptionModal = document.getElementById('subscription-modal');
    if (!subscriptionModal) return;

    // Close modal when close button is clicked
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            subscriptionModal.style.display = 'none';
        };
    }

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === subscriptionModal) {
            subscriptionModal.style.display = 'none';
        }
    };

    // Update reading status if container exists
    updateReadingStatus();
}

// Update the reading status display
function updateReadingStatus() {
    const container = document.querySelector('.reading-status');
    if (!container || isSubscribed) return;

    if (freePostsRead > 0) {
        container.innerHTML = `
            <p>You've read ${freePostsRead} of 5 free posts
            ${freePostsRead >= 5 ? ' - Subscribe now to keep reading!' : ''}</p>
        `;
    }
}

// Handle post access
async function handlePostAccess(postId) {
    try {
        const username = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/posts/${postId}${username ? `?username=${username}` : ''}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        
        if (!response.ok) {
            const data = await response.json();
            if (response.status === 403) {
                if (data.showSubscriptionModal) {
                    const subscriptionModal = document.getElementById('subscription-modal');
                    if (subscriptionModal) {
                        subscriptionModal.style.display = 'block';
                    }
                    return false;
                } else if (data.message) {
                    alert(data.message);
                    return false;
                }
            }
            throw new Error(data.message || 'Failed to access post');
        }

        const data = await response.json();
        freePostsRead = data.freePostsRead || 0;
        isSubscribed = data.isSubscribed || false;
        
        updateReadingStatus();
        return true;
    } catch (error) {
        console.error('Error accessing post:', error);
        alert('Error accessing post. Please try again.');
        return false;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initReadingLimits);
