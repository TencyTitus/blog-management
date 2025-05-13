// Initialize the subscription modal
function initSubscriptionModal() {
    const subscriptionModal = document.getElementById('subscription-modal');
    const closeBtn = document.querySelector('.subscription-close');
    const subscribeBtn = document.querySelector('.subscribe-btn');
    const subscriptionStatus = document.getElementById('subscription-status');

    if (!subscriptionModal) return;

    // Close modal when close button is clicked
    closeBtn.addEventListener('click', () => {
        subscriptionModal.style.display = 'none';
    });

    // Handle subscription click
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('Please log in to subscribe');
                    window.location.href = '/login.html';
                    return;
                }

                // Get UPI payment link
                const response = await fetch('/api/subscription/upi-payment', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to get payment link');
                }

                const { upiLink, amount, upiId } = await response.json();

                // Redirect to payment page with UPI details
                window.location.href = `/payment.html?upiLink=${encodeURIComponent(upiLink)}&amount=${amount}`;
            } catch (error) {
                console.error('Error:', error);
                const errorMessage = error.message || 'Failed to process subscription. Please try again.';
                alert(errorMessage);
            }
        });
    }

    // Handle payment success
    document.getElementById('payment-success-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to verify payment');
                return;
            }

            const transactionId = document.getElementById('transaction-id').value;
            const amount = document.getElementById('amount').value;

            if (!transactionId || !amount) {
                alert('Please enter both transaction ID and amount');
                return;
            }

            const response = await fetch('/api/subscription/payment-success', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    transactionId,
                    amount: parseFloat(amount)
                })
            });

            if (response.ok) {
                // Subscription successful
                subscriptionStatus.textContent = 'Active Subscription';
                subscriptionStatus.style.color = 'green';
                alert('Subscription successful! You can now access all posts.');
                window.location.reload();
            } else {
                const error = await response.json();
                alert(error.message || 'Payment verification failed. Please try again.');
            }
        } catch (error) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please try again.');
        }
    });

    // Check subscription status
    async function checkSubscriptionStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                subscriptionStatus.textContent = 'Please log in to subscribe';
                subscriptionStatus.style.color = 'red';
                return;
            }

            const response = await fetch('/api/subscription/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to check subscription status');

            const status = await response.json();
            
            if (status.subscriptionStatus === 'active') {
                subscriptionStatus.textContent = 'Active Subscription';
                subscriptionStatus.style.color = 'green';
            } else {
                subscriptionStatus.textContent = 'No Active Subscription';
                subscriptionStatus.style.color = 'red';
            }
        } catch (error) {
            console.error('Error checking subscription status:', error);
            subscriptionStatus.textContent = 'Failed to check subscription status';
            subscriptionStatus.style.color = 'red';
        }
    }

    // Check subscription status when modal opens
    subscriptionModal.addEventListener('show.bs.modal', checkSubscriptionStatus);
}

// Initialize subscription handling when page loads
document.addEventListener('DOMContentLoaded', initSubscriptionModal);
