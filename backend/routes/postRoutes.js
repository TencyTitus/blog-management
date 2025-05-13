const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const PostRead = require("../models/PostRead");
const auth = require("../middleware/auth");
const User = require("../models/User");
const jwt = require('jsonwebtoken');

// Helper function to check reading limits
async function checkReadingLimit(userId = null, session) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Make sure session object has postsRead property
    if (session && !session.postsRead) {
        session.postsRead = [];
    }

    if (userId) {
        // For logged-in users
        const user = await User.findById(userId);
        if (user?.subscription?.status === 'active') {
            return { allowed: true, postsRead: 0, maxFreePosts: 5 };
        }

        const postsReadToday = await PostRead.countDocuments({
            userId,
            readAt: { $gte: today }
        });

        return {
            allowed: postsReadToday < 5,
            postsRead: postsReadToday,
            maxFreePosts: 5
        };
    } else if (session) {
        // For anonymous users with session
        // Clean up old reads
        session.postsRead = session.postsRead.filter(read => 
            new Date(read.readAt) >= today
        );

        return {
            allowed: session.postsRead.length < 5,
            postsRead: session.postsRead.length,
            maxFreePosts: 5
        };
    } else {
        // Fallback for when session is not available
        return {
            allowed: true,
            postsRead: 0,
            maxFreePosts: 5
        };
    }
}

// Middleware to check reading limits
async function checkReadingLimits(req, res, next) {
    try {
        // Skip reading limit check for post creation and update operations
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
            return next();
        }

        const token = req.headers["authorization"] && req.headers["authorization"].split(" ")[1];
        let user = null;
        let isSubscribed = false;
        let freePostsRead = 0;

        // For logged-in users, verify token
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id);
                if (user) {
                    freePostsRead = user.freePostsRead;
                    isSubscribed = user.subscription?.status === 'active';
                }
            } catch (error) {
                // Invalid token, treat as non-logged-in user
                user = null;
            }
        }

        // For non-logged-in users, check email in query params
        if (!user) {
            const email = req.query.email;
            if (email) {
                user = await User.findOne({ email: email.toLowerCase() });
                if (user) {
                    freePostsRead = user.freePostsRead;
                    isSubscribed = user.subscription?.status === 'active';
                } else {
                    // Create a new user record for tracking
                    user = new User({
                        email: email.toLowerCase(),
                        freePostsRead: 0
                    });
                    await user.save();
                }
            }
        }

        // Check reading limits only for GET requests to read posts
        if (!isSubscribed && freePostsRead >= 5) {
            return res.status(403).json({
                message: "You've reached your free reading limit of 5 posts. Please subscribe to continue reading.",
                showSubscriptionModal: true,
                postsRead: freePostsRead,
                maxFreePosts: 5
            });
        }

        req.user = user;
        req.isSubscribed = isSubscribed;
        req.freePostsRead = freePostsRead;
        next();
    } catch (error) {
        console.error("Reading limits check error:", error);
        res.status(500).json({ message: "Error checking reading limits" });
    }
}

// Get all posts with optional category filtering
router.get("/", async (req, res) => {
    try {
        const { limit = 10, page = 1, category, sort = 'newest' } = req.query;
        const skip = (page - 1) * limit;

        // Build query with improved category handling
        const query = {};
        if (category && category !== 'all' && category.trim() !== '') {
            // Case insensitive search for category
            query.category = { $regex: new RegExp('^' + category + '$', 'i') };
        }

        // Build sort options
        const sortQuery = {};
        if (sort === 'oldest') {
            sortQuery.createdAt = 1;
        } else if (sort === 'popular') {
            // Sort by views (most popular)
            sortQuery.views = -1;
            sortQuery.createdAt = -1; // Secondary sort by date
        } else {
            // Default: newest first
            sortQuery.createdAt = -1;
        }

        const posts = await Post.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(Number(limit))
            .populate('userId', 'username');

        // Ensure all required fields are present
        const formattedPosts = posts.map(post => ({
            _id: post._id,
            title: post.title,
            content: post.content,
            category: post.category,
            createdAt: post.createdAt,
            userId: post.userId,
            views: post.views || 0
        }));

        const totalPosts = await Post.countDocuments(query);

        // Get reading limit status
        let userId = null;
        let isSubscribed = false;

        const token = req.headers['authorization']?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
                const user = await User.findById(userId);
                isSubscribed = user?.subscription?.status === 'active';
            } catch (error) {
                console.log('Invalid token:', error);
            }
        }

        const { allowed, postsRead } = await checkReadingLimit(userId, req.session);

        res.json({
            posts: formattedPosts,
            totalPosts,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalPosts / limit),
            isSubscribed,
            freePostsRead: postsRead,
            maxFreePosts: 5,
            allowed
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// Get user's posts
router.get("/my-posts", [auth, checkReadingLimits], async (req, res) => {
    try {
        console.log('User from request:', req.user);
        console.log('Looking for posts with userId:', req.user.id);
        
        const posts = await Post.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('userId', 'username email')
            .populate('likes', 'username');
            
        console.log('Found posts:', posts);
        
        // Sort comments in each post
        posts.forEach(post => {
            if (post.comments) {
                post.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        });
        
        res.json(posts);
    } catch (error) {
        console.error('Error in /my-posts:', error);
        res.status(500).json({ message: error.message });
    }
});

// Check post access and reading limit
router.get('/:id/access', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
        let user = null;

        // If token provided, get user
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id);
                
                // If user is subscribed, allow access
                if (user?.subscription?.status === 'active') {
                    return res.json({ allowed: true });
                }
            } catch (error) {
                // Invalid token, treat as anonymous
                console.log('Invalid token:', error);
            }
        }

        // Initialize session if not exists
        if (!req.session.postsRead) {
            req.session.postsRead = [];
        }

        // Get today's reads
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const postsReadToday = req.session.postsRead.filter(read => new Date(read.readAt) >= today).length;
        
        console.log('Session ID:', req.sessionID);
        console.log('Posts read today (non-logged-in):', postsReadToday);
        console.log('Session posts read:', req.session.postsRead);
        
        // For non-logged-in users, check if they've reached the limit (5 posts)
        if (postsReadToday >= 5) {
            return res.status(403).json({
                allowed: false,
                reason: 'reading_limit',
                message: 'You have reached your daily reading limit. Please log in and subscribe to continue reading.'
            });
        }

        // Record the read
        if (user) {
            const postRead = new PostRead({
                userId: user._id,
                postId: req.params.id,
                readAt: new Date()
            });
            await postRead.save();
        } else {
            req.session.postsRead.push({
                postId: req.params.id,
                readAt: new Date()
            });
            // Explicitly save the session to ensure it's persisted
            await new Promise((resolve) => req.session.save(resolve));
        }

        res.json({ allowed: true });
    } catch (error) {
        console.error('Error checking post access:', error);
        res.status(500).json({ message: 'Error checking post access' });
    }
});

// Search posts
router.get("/search", async (req, res) => {
    try {
        // Get the query parameter safely
        const query = req.query.query || '';
        
        // If no query provided, return all posts
        if (!query.trim()) {
            const posts = await Post.find()
                .sort({ createdAt: -1 })
                .populate('userId', 'username email')
                .limit(10); // Limit results for performance
            
            return res.json(posts);
        }

        // Create a search regex pattern that is case insensitive
        // Escape special regex characters to prevent ReDoS attacks
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchPattern = new RegExp(escapedQuery, 'i');

        // Search in title, content, and category
        const posts = await Post.find({
            $or: [
                { title: searchPattern },
                { content: searchPattern },
                { category: searchPattern }
            ]
        })
        .sort({ createdAt: -1 })
        .populate('userId', 'username email')
        .limit(20); // Limit results for performance
        
        if (posts.length === 0) {
            return res.json({ posts: [], message: 'No posts found matching your search.' });
        }

        // Sort comments if present
        posts.forEach(post => {
            if (post.comments && post.comments.length > 0) {
                post.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        });

        res.json({ posts, count: posts.length });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: "Error searching posts: " + error.message });
    }
});

// Get single post
router.get("/:id", async (req, res) => {
    try {
        // First check if post exists
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check reading limits
        const token = req.headers['authorization']?.split(' ')[1];
        let userId = null;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (error) {
                console.log('Invalid token:', error);
            }
        }

        const { allowed, postsRead, maxFreePosts } = await checkReadingLimit(userId, req.session);

        // First check if this post is already read today
        const postId = req.params.id;
        let alreadyRead = false;
        
        if (userId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            alreadyRead = await PostRead.exists({
                userId,
                postId,
                readAt: { $gte: today }
            });
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            alreadyRead = req.session.postsRead.some(read => 
                read.postId === postId && new Date(read.readAt) >= today
            );
        }

        // If already read today, don't count against limit
        if (!alreadyRead && !allowed) {
            return res.status(403).json({
                message: 'You have reached your daily reading limit.',
                reason: 'reading_limit',
                postsRead,
                maxFreePosts
            });
        }

        // Record the read if not already read today
        if (!alreadyRead) {
            if (userId) {
                const postRead = new PostRead({
                    userId,
                    postId,
                    readAt: new Date()
                });
                await postRead.save();
            } else {
                req.session.postsRead.push({
                    postId,
                    readAt: new Date()
                });
                await new Promise((resolve) => req.session.save(resolve));
            }
        }

        // Populate post details after access check
        const populatedPost = await Post.findById(post._id)
            .populate('userId', 'username')
            .populate('likes', 'username')
            .populate({
                path: 'comments',
                populate: {
                    path: 'userId',
                    select: 'username'
                }
            });

        res.json(populatedPost);
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ message: "Error fetching post" });
    }
});

// Create post
router.post("/", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = new Post({
            title: req.body.title,
            content: req.body.content,
            userId: req.user.id,
            author: req.user.username,
            category: req.body.category
        });

        const newPost = await post.save();
        await newPost.populate('userId', 'username');
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update post
router.put("/:id", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Only allow author or admin to update
        if (post.userId.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this post' });
        }

        Object.assign(post, req.body);
        await post.save();
        
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Error updating post" });
    }
});

// Delete post
router.delete("/:id", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Only allow author or admin to delete
        if (post.userId.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting post" });
    }
});

// Get all comments for a post
router.get("/:id/comments", [checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Sort comments by date
        if (post.comments) {
            post.comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        
        res.json(post.comments || []);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create comment
router.post("/:id/comment", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = {
            content: req.body.content,
            author: req.user.username,
            userId: req.user.id,
            postId: req.params.id,
            createdAt: new Date(),
            status: 'Pending'
        };

        // Add comment to post's comments array
        post.comments.push(comment);
        await post.save();

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete comment
router.delete("/:postId/comment/:commentId", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Find the comment index
        const commentIndex = post.comments.findIndex(comment => comment._id.toString() === req.params.commentId);
        
        if (commentIndex === -1) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if user is the author of the comment or an admin
        if (post.comments[commentIndex].userId.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        // Remove the comment
        post.comments.splice(commentIndex, 1);
        await post.save();

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: error.message });
    }
});

// Like post
router.post("/:id/like", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if user has already liked the post
        const hasLiked = post.likes.includes(req.user.id);
        
        if (hasLiked) {
            // Remove like
            post.likes = post.likes.filter(like => like.toString() !== req.user.id);
            await post.save();
            res.json({ message: 'Post unliked' });
        } else {
            // Add like
            post.likes.push(req.user.id);
            await post.save();
            res.json({ message: 'Post liked' });
        }
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: error.message });
    }
});

// Share post
router.post("/:id/share", [auth, checkReadingLimits], async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Increment share count
        post.shareCount = post.shareCount ? post.shareCount + 1 : 1;
        await post.save();

        res.json({ message: 'Post shared' });
    } catch (error) {
        console.error('Error sharing post:', error);
        res.status(500).json({ message: error.message });
    }
});



// Test endpoint to check posts
router.get("/test", [checkReadingLimits], async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        console.log('Total posts in database:', posts.length);
        res.json({ 
            count: posts.length,
            posts: posts.map(p => ({
                id: p._id,
                title: p.title,
                author: p.userId?.username,
                createdAt: p.createdAt
            }))
        });
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add a comment to a post
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Print the comment structure for debugging
        console.log('Adding comment:', { 
            content, 
            userId: userId,
            author: req.user.username,
            postId: postId
        });

        const newComment = {
            content,
            author: req.user.username,
            userId,
            postId,
            createdAt: new Date(),
            status: 'Pending' // Default status
        };

        post.comments.push(newComment);
        await post.save();

        // Return the updated post with the new comment
        res.status(201).json({ 
            message: 'Comment added successfully', 
            comment: {
                ...newComment,
                _id: post.comments[post.comments.length - 1]._id
            }
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
});

module.exports = router;
