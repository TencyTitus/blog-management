const mongoose = require("mongoose");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");

async function migrateData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-management');

        console.log("Starting migration...");

        // Migrate comments
        const posts = await Post.find();
        
        for (const post of posts) {
            // Migrate comments
            if (post.comments && post.comments.length > 0) {
                console.log(`Migrating ${post.comments.length} comments for post: ${post._id}`);
                
                for (const comment of post.comments) {
                    const newComment = new Comment({
                        content: comment.content,
                        author: comment.author,
                        userId: comment.author,
                        postId: post._id,
                        createdAt: comment.createdAt || new Date()
                    });
                    
                    await newComment.save();
                }
            }

            // Migrate likes
            if (post.likes && post.likes.length > 0) {
                console.log(`Migrating ${post.likes.length} likes for post: ${post._id}`);
                
                for (const userId of post.likes) {
                    const newLike = new Like({
                        user: userId,
                        post: post._id,
                        createdAt: new Date()
                    });
                    
                    await newLike.save();
                }
            }
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
}

migrateData();
