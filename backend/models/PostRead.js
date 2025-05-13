const mongoose = require('mongoose');

const postReadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    readAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying of user's reads within a time period
postReadSchema.index({ userId: 1, readAt: -1 });

module.exports = mongoose.model('PostRead', postReadSchema);
