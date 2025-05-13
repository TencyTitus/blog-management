const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        const user = await User.findById(decoded.id);

        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Admin access required" });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

// Verify admin status
router.get("/verify", authenticateAdmin, (req, res) => {
    res.json({ message: "Admin verified" });
});

// Get dashboard stats
router.get("/stats", authenticateAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all posts to accurately count comments
        const posts = await Post.find();
        
        // Count total comments across all posts
        const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
        
        const [totalUsers, totalPosts, postsToday] = await Promise.all([
            User.countDocuments(),
            Post.countDocuments(),
            Post.countDocuments({ createdAt: { $gte: today } })
        ]);

        const activeUsers = await User.countDocuments({ status: "active" });

        res.json({
            totalUsers,
            totalPosts,
            activeUsers,
            postsToday,
            totalComments
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// Get share data
router.get("/shares", authenticateAdmin, async (req, res) => {
    try {
        console.log('Share data endpoint called');
        
        // First check if there are any posts with shareCount > 0
        const shareCountCheck = await Post.countDocuments({ shareCount: { $gt: 0 } });
        console.log(`Found ${shareCountCheck} posts with shares`);
        
        if (shareCountCheck === 0) {
            console.log('No shared posts found, returning empty array');
            return res.json([]);
        }
        
        const posts = await Post.find({ shareCount: { $gt: 0 } })
            .populate('userId', 'username email')
            .sort({ shareCount: -1 });
            
        console.log(`Retrieved ${posts.length} shared posts from database`);
        
        const shareData = posts.map(post => {
            const data = {
                _id: post._id,
                title: post.title,
                author: post.userId ? {
                    username: post.userId.username,
                    email: post.userId.email,
                    _id: post.userId._id
                } : null,
                shareCount: post.shareCount || 0,
                updatedAt: post.updatedAt,
                createdAt: post.createdAt
            };
            console.log(`Processed shared post: ${post.title} with ${post.shareCount} shares`);
            return data;
        });
        
        console.log('Share data endpoint response:', JSON.stringify(shareData).substring(0, 200) + '...');
        return res.json(shareData);
    } catch (error) {
        console.error('Error fetching share data:', error);
        return res.status(500).json({ message: "Error fetching share data", error: error.message });
    }
});

// Get all users
router.get("/users", authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Get a single user by ID
router.get("/users/:id", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id, { password: 0 });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error(`Error fetching user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error fetching user" });
    }
});

// Update a user
router.patch("/users/:id", authenticateAdmin, async (req, res) => {
    try {
        const { status, fullname, bio } = req.body;
        const updateData = {};
        
        if (status) updateData.status = status;
        if (fullname) updateData.fullname = fullname;
        if (bio) updateData.bio = bio;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user);
    } catch (error) {
        console.error(`Error updating user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error updating user" });
    }
});

// Activate a user
router.put("/users/:id/activate", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "User activated successfully", user });
    } catch (error) {
        console.error(`Error activating user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error activating user" });
    }
});

// Deactivate a user
router.put("/users/:id/deactivate", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'inactive' },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ message: "User deactivated successfully", user });
    } catch (error) {
        console.error(`Error deactivating user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error deactivating user" });
    }
});

// Get user's posts
router.get("/users/:id/posts", authenticateAdmin, async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.params.id })
            .sort({ createdAt: -1 });
        
        res.json(posts);
    } catch (error) {
        console.error(`Error fetching posts for user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error fetching user's posts" });
    }
});

// Get user's comments
router.get("/users/:id/comments", authenticateAdmin, async (req, res) => {
    try {
        // First get all posts to find comments by this user
        const posts = await Post.find().populate('userId', 'username');
        const comments = [];
        
        // Extract comments made by this user
        posts.forEach(post => {
            if (post.comments && post.comments.length > 0) {
                post.comments.forEach(comment => {
                    if (comment.author && comment.author.toString() === req.params.id) {
                        comments.push({
                            _id: comment._id,
                            content: comment.content,
                            createdAt: comment.createdAt,
                            status: comment.status,
                            postId: post._id,
                            postTitle: post.title
                        });
                    }
                });
            }
        });
        
        res.json(comments);
    } catch (error) {
        console.error(`Error fetching comments for user ${req.params.id}:`, error);
        res.status(500).json({ message: "Error fetching user's comments" });
    }
});

// Get all posts with full details
router.get("/posts", authenticateAdmin, async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('userId', 'username email')
            .populate('comments.author', 'username email')
            .populate('likes', 'username email')
            .sort({ createdAt: -1 });
            
        // Debug log to check if shareCount is present in the raw posts
        console.log('Raw posts from database:', posts.map(p => ({
            title: p.title,
            shareCount: p.shareCount
        })));

        // Transform the data to include username information
        const transformedPosts = posts.map(post => {
            return {
                _id: post._id,
                title: post.title,
                content: post.content,
                category: post.category,
                shareCount: post.shareCount || 0, // Ensure shareCount is included
                author: post.userId ? {
                    username: post.userId.username,
                    email: post.userId.email,
                    _id: post.userId._id
                } : null,
                comments: post.comments.map(comment => ({
                    _id: comment._id,
                    content: comment.content,
                    author: comment.author ? {
                        username: comment.author.username,
                        email: comment.author.email,
                        _id: comment.author._id
                    } : { username: 'Unknown User' },
                    createdAt: comment.createdAt,
                    status: comment.status
                })),
                likes: post.likes.map(user => ({
                    username: user.username,
                    email: user.email,
                    _id: user._id
                })),
                shareCount: post.shareCount || 0,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                status: post.status
            };
        });

        res.json(transformedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: "Error fetching posts" });
    }
});

// Get a single post by ID for editing
router.get("/posts/:id", authenticateAdmin, async (req, res) => {
    // Force JSON content type for all responses from this route
    res.setHeader('Content-Type', 'application/json');
    
    try {
        console.log(`Admin requesting post with ID: ${req.params.id} for editing`);
        
        // Validate the ID format first
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            console.log(`Invalid post ID format: ${req.params.id}`);
            return res.status(400).send(JSON.stringify({ message: "Invalid post ID format" }));
        }
        
        const post = await Post.findById(req.params.id)
            .populate('userId', 'username email');
            
        if (!post) {
            console.log(`Post with ID ${req.params.id} not found`);
            return res.status(404).send(JSON.stringify({ message: "Post not found" }));
        }
        
        console.log(`Found post for editing: ${post.title}`);
        
        // Create a clean response object
        const postData = {
            _id: post._id.toString(),
            title: post.title || '',
            content: post.content || '',
            category: post.category || 'Uncategorized',
            status: post.status || 'published',
            shareCount: post.shareCount || 0
        };
        
        // Send JSON response directly as a string to avoid any middleware interference
        return res.status(200).send(JSON.stringify(postData));
    } catch (error) {
        console.error(`Error fetching post ${req.params.id} for editing:`, error);
        return res.status(500).send(JSON.stringify({ message: "Error fetching post", error: error.message }));
    }
});

// Update a post
router.put("/posts/:id", authenticateAdmin, async (req, res) => {
    try {
        const { title, content, category, status } = req.body;
        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            {
                title,
                content,
                category,
                status,
                updatedAt: new Date()
            },
            { new: true }
        ).populate('userId', 'username email')
         .populate('comments.author', 'username email')
         .populate('likes', 'username email');

        if (!updatedPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.json(updatedPost);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: "Error updating post" });
    }
});

// Delete post
router.delete("/posts/:id", authenticateAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: "Error deleting post" });
    }
});

// Get all comments with user details
router.get("/comments", authenticateAdmin, async (req, res) => {
    try {
        // First get all users to have a reference map
        const users = await User.find({}, 'username email');
        const userMap = new Map();
        users.forEach(user => userMap.set(user._id.toString(), user));

        // Get all posts with their comments
        const posts = await Post.find()
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });

        // Print the structure of the first post that has comments
        const postWithComments = posts.find(p => p.comments && p.comments.length > 0);
        if (postWithComments) {
            console.log('Post comment structure example:');
            console.log(JSON.stringify(postWithComments.comments[0], null, 2));
        }

        // Process comments with proper user data
        const comments = [];
        let totalCommentsFound = 0;
        
        for (const post of posts) {
            if (post.comments && post.comments.length > 0) {
                totalCommentsFound += post.comments.length;
                console.log(`Post "${post.title}" has ${post.comments.length} comments`);
                
                for (const comment of post.comments) {
                    try {
                        // Handle both author string and userId reference
                        let authorUsername = 'Unknown User';
                        let authorEmail = '';
                        let authorId = null;
                        
                        // Output each comment for debugging
                        console.log('Processing comment:', {
                            id: comment._id,
                            content: comment.content?.substring(0, 20) + '...',
                            author: typeof comment.author === 'string' ? comment.author : '[object]',
                            userId: comment.userId ? comment.userId.toString() : 'undefined'
                        });
                        
                        // Try to get user info from userId if it exists
                        if (comment.userId) {
                            const userIdStr = typeof comment.userId === 'object' 
                                ? comment.userId.toString() 
                                : comment.userId.toString();
                            const user = userMap.get(userIdStr);
                            if (user) {
                                authorUsername = user.username;
                                authorEmail = user.email;
                                authorId = userIdStr;
                            }
                        }
                        
                        // If author field exists and is a string, use it as username
                        if (typeof comment.author === 'string') {
                            authorUsername = comment.author;
                        }
                        
                        comments.push({
                            _id: comment._id,
                            content: comment.content || 'No content',
                            postId: post._id,
                            postTitle: post.title || 'Untitled Post',
                            postAuthor: post.author || post.userId?.username || 'Unknown',
                            author: {
                                username: authorUsername,
                                email: authorEmail,
                                _id: authorId
                            },
                            createdAt: comment.createdAt,
                            status: comment.status || 'Pending'
                        });
                    } catch (err) {
                        console.error('Error processing comment:', err);
                    }
                }
            }
        }

        console.log(`Found ${comments.length} comments to display out of ${totalCommentsFound} total comments`);
        comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// Get all likes with user details
router.get("/likes", authenticateAdmin, async (req, res) => {
    try {
        // Get all users for reference
        const users = await User.find({}, 'username email');
        const userMap = new Map();
        users.forEach(user => userMap.set(user._id.toString(), user));

        // Get all posts with their likes information
        const posts = await Post.find()
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });

        // Print the structure of the first post that has likes
        const postWithLikes = posts.find(p => p.likes && p.likes.length > 0);
        if (postWithLikes) {
            console.log('Post likes structure example:');
            console.log(JSON.stringify(postWithLikes.likes, null, 2));
        }

        const likes = [];
        let totalLikesFound = 0;
        
        // Process each post and its likes
        for (const post of posts) {
            if (post.likes && post.likes.length > 0) {
                totalLikesFound += post.likes.length;
                console.log(`Post "${post.title}" has ${post.likes.length} likes`);
                
                for (const likeUserId of post.likes) {
                    try {
                        // Convert userId to string, handling different possible formats
                        const userIdStr = typeof likeUserId === 'object' 
                            ? likeUserId.toString() 
                            : String(likeUserId);
                        
                        console.log('Processing like:', {
                            postId: post._id,
                            userId: userIdStr
                        });
                        
                        const user = userMap.get(userIdStr);
                        
                        if (user) {
                            likes.push({
                                _id: `${post._id}-${userIdStr}`,
                                postId: post._id,
                                postTitle: post.title || 'Untitled Post',
                                postAuthor: post.author || post.userId?.username || 'Unknown',
                                user: {
                                    username: user.username || 'Unknown User',
                                    email: user.email || '',
                                    _id: userIdStr
                                },
                                createdAt: post.createdAt
                            });
                        } else {
                            console.log(`User not found for ID: ${userIdStr}`);
                        }
                    } catch (err) {
                        console.error('Error processing like:', err);
                    }
                }
            }
        }

        console.log(`Found ${likes.length} likes to display out of ${totalLikesFound} total likes`);
        likes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(likes);
    } catch (error) {
        console.error('Error fetching likes:', error);
        res.status(500).json({ message: 'Error fetching likes' });
    }
});

// Search functionality
router.get("/search", authenticateAdmin, async (req, res) => {
    try {
        const { type, q } = req.query;
        let results;

        if (type === "users") {
            results = await User.find({
                $or: [
                    { username: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ]
            }, { password: 0 });
        } else if (type === "posts") {
            results = await Post.find({
                $or: [
                    { title: { $regex: q, $options: 'i' } },
                    { content: { $regex: q, $options: 'i' } },
                    { category: { $regex: q, $options: 'i' } }
                ]
            });
        } else if (type === "comments") {
            results = await Post.find({
                'comments.content': { $regex: q, $options: 'i' }
            }).populate('userId', 'username');
        }

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: "Search failed" });
    }
});

// Delete user
router.delete("/users/:id", authenticateAdmin, async (req, res) => {
    try {
        // Delete user's posts
        await Post.deleteMany({ userId: req.params.id });
        // Delete user
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ message: "User and associated content deleted" });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: "Error deleting user" });
    }
});

// Toggle user status
router.put("/users/:id/toggle-status", authenticateAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.status = user.status === "active" ? "suspended" : "active";
        await user.save();

        res.json({ message: "User status updated", status: user.status });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: "Error updating user status" });
    }
});

// Approve a comment
router.put("/comments/:id/approve", authenticateAdmin, async (req, res) => {
    try {
        const post = await Post.findOne({ 'comments._id': req.params.id });
        if (!post) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Update the comment status
        await Post.updateOne(
            { 'comments._id': req.params.id },
            { $set: { 'comments.$.status': 'Approved' } }
        );

        res.json({ message: 'Comment approved successfully' });
    } catch (error) {
        console.error('Error approving comment:', error);
        res.status(500).json({ message: 'Error approving comment' });
    }
});

// Delete a comment
router.delete("/comments/:id", authenticateAdmin, async (req, res) => {
    try {
        const post = await Post.findOne({ 'comments._id': req.params.id });
        if (!post) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Remove the comment
        await Post.updateOne(
            { 'comments._id': req.params.id },
            { $pull: { comments: { _id: req.params.id } } }
        );

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Error deleting comment' });
    }
});

// Delete a like
router.delete("/likes/:id", authenticateAdmin, async (req, res) => {
    try {
        // The ID format is postId-userId
        const [postId, userId] = req.params.id.split('-');
        
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Remove the like
        post.likes = post.likes.filter(id => id.toString() !== userId);
        await post.save();

        res.json({ message: 'Like removed successfully' });
    } catch (error) {
        console.error('Error deleting like:', error);
        res.status(500).json({ message: 'Error deleting like' });
    }
});

// Get analytics data
router.get("/analytics", authenticateAdmin, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [totalPosts, totalComments, totalUsers] = await Promise.all([
            Post.countDocuments(),
            Post.countDocuments({}, { comments: { $size: 1 } }),
            User.countDocuments()
        ]);

        // Get post creation trend
        const postTrend = await Post.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            totalPosts,
            totalComments,
            totalUsers,
            postTrend,
            avgPostsPerDay: (totalPosts / 30).toFixed(2),
            avgCommentsPerPost: (totalComments / totalPosts).toFixed(2)
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: "Error fetching analytics" });
    }
});

// Create or promote admin user
router.post("/create-admin", async (req, res) => {
    try {
        console.log('Admin creation request received:', {
            email: req.body.email,
            hasPassword: !!req.body.password,
            hasAdminSecret: !!req.body.adminSecret
        });

        const { email, password, adminSecret } = req.body;

        // Verify admin secret
        const validAdminSecret = process.env.ADMIN_SECRET || 'your-admin-secret-key';
        console.log('Verifying admin secret...');
        if (adminSecret !== validAdminSecret) {
            console.log('Invalid admin secret provided');
            return res.status(401).json({ message: 'Invalid admin secret key' });
        }
        console.log('Admin secret verified');

        // Check if user exists
        let user = await User.findOne({ email: email.toLowerCase() });
        console.log('Existing user check:', user ? 'User found' : 'No existing user');

        if (user) {
            // Promote existing user to admin
            user.isAdmin = true;
            await user.save();
            console.log('Existing user promoted to admin:', {
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin
            });
            return res.json({ 
                message: 'User promoted to admin successfully',
                user: {
                    email: user.email,
                    username: user.username,
                    isAdmin: user.isAdmin
                }
            });
        }

        // Create new admin user
        if (!password) {
            console.log('Password required for new admin user');
            return res.status(400).json({ message: 'Password is required for new admin user' });
        }

        // Hash password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new admin user
        const username = email.split('@')[0];
        user = new User({
            email: email.toLowerCase(),
            username: username,
            password: hashedPassword,
            isAdmin: true,
            status: 'active'
        });

        console.log('Attempting to save new admin user...');
        await user.save();
        console.log('New admin user created successfully:', {
            email: user.email,
            username: user.username,
            isAdmin: user.isAdmin
        });

        res.status(201).json({ 
            message: 'Admin user created successfully',
            user: {
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        console.error('Admin creation error:', error);
        if (error.code === 11000) {
            // Duplicate key error
            return res.status(400).json({ 
                message: 'Email or username already exists',
                error: error.message 
            });
        }
        res.status(500).json({ 
            message: 'Failed to create admin user',
            error: error.message 
        });
    }
});

module.exports = router; 