const express = require("express");
const router = express.Router();
const Post = require("../models/Post"); // Assuming you have a Post model

// Get all posts
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Get a specific post by ID
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Create a new post
router.post("/", async (req, res) => {
    const { title, content } = req.body;

    try {
        const newPost = new Post({ title, content });
        await newPost.save();

        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Update a post
router.put("/:id", async (req, res) => {
    try {
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedPost) return res.status(404).json({ message: "Post not found" });

        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Delete a post
router.delete("/:id", async (req, res) => {
    try {
        const deletedPost = await Post.findByIdAndDelete(req.params.id);

        if (!deletedPost) return res.status(404).json({ message: "Post not found" });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
