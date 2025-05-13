const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");

// Get subscription status
router.get("/status", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({
            subscriptionStatus: user.subscription?.status || 'inactive',
            expiresAt: user.subscription?.expiresAt,
            freePostsRead: user.freePostsRead || 0
        });
    } catch (error) {
        console.error('Error checking subscription status:', error);
        res.status(500).json({ message: "Error checking subscription status" });
    }
});

// Generate UPI payment link
router.get("/upi-payment", auth, async (req, res) => {
    try {
        const amount = parseInt(process.env.SUBSCRIPTION_AMOUNT) || 999; // INR
        const upiId = process.env.UPI_ID; // Get UPI ID from environment variables
        const upiName = process.env.UPI_NAME || 'EchoWrites';
        
        if (!upiId) {
            throw new Error('UPI ID not configured');
        }
        
        // Generate UPI payment link with proper encoding
        const paymentReference = `ORDER_${Date.now()}`;
        const encodedUpiId = encodeURIComponent(upiId);
        const encodedPurpose = encodeURIComponent(upiName);
        
        // Generate UPI payment link with proper parameters
        const upiLink = `upi://pay?pa=${encodedUpiId}&pn=${encodedPurpose}&tr=${paymentReference}&am=${amount}&cu=INR`;

        res.json({
            upiLink,
            amount,
            upiId
        });
    } catch (error) {
        console.error('Error generating UPI link:', error);
        res.status(500).json({ message: error.message });
    }
});

// Handle payment success (manual verification)
router.post("/payment-success", auth, async (req, res) => {
    try {
        const { transactionId, amount } = req.body;
        const expectedAmount = parseInt(process.env.SUBSCRIPTION_AMOUNT) || 999;

        // Verify the amount
        if (parseInt(amount) !== expectedAmount) {
            return res.status(400).json({ message: "Invalid payment amount" });
        }

        // Update user subscription
        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                $set: {
                    'subscription.status': 'active',
                    'subscription.expiresAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    'subscription.paymentId': transactionId,
                    'subscription.lastPaymentDate': new Date(),
                    'freePostsRead': 0 // Reset free posts counter
                }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ 
            success: true,
            message: "Subscription activated successfully",
            expiresAt: user.subscription.expiresAt
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ message: "Error processing payment" });
    }
});

module.exports = router;
