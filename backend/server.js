const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("./db"); // MongoDB connection file
require("dotenv").config();

const User = require("./models/User");
const Post = require("./models/Post");

console.log("MongoDB URI:", process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY; // Fetch from .env file

app.use(express.json()); // To parse JSON in requests
app.use(cors()); // Enable CORS
app.use(express.urlencoded({ extended: true }));  // 👈 Parses URL-encoded bodies

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend/public")));


/* --------------------- Blog Post Routes --------------------- */

// Get all blog posts
app.get("/posts", async (req, res) => {
    try {
        const posts = await Blog.find();
        res.json(posts);  // ✅ Keep JSON response, but make sure frontend handles it
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch posts" });
    }
});

// Get a specific blog post by ID
app.get("/posts/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Create a new blog post (Only authenticated users)
app.post("/posts", authenticateToken, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

        const newPost = new Post({ title, content, author: req.user.id });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a blog post (Only authenticated users)
app.delete("/posts/:id", authenticateToken, async (req, res) => {
    try {
        const post = await Post.findByIdAndDelete(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

/* --------------------- User Authentication Routes --------------------- */

// Signup
app.post("/signup", async (req, res) => {
    try {
        console.log("Signup Request Received:", req.body); // Debugging

        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        console.log("New User Saved:", newUser); // Debugging

        res.status(201).json({ message: "Signup successful!" });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// Login
app.post("/login", async (req, res) => {
    try {
        const { email_or_username, password } = req.body;

        if (!email_or_username || !password) {
            return res.status(400).json({ message: "Email or Username and password are required" });
        }

        // Find user by email or username
        const user = await User.findOne({
            $or: [{ email: email_or_username }, { username: email_or_username }]
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or username" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                username: user.username,
                profilePic: user.profilePic // Send only safe fields
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});



/* --------------------- Middleware --------------------- */

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(403).json({ message: "Access denied" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = user;
        next();
    });
}

/* --------------------- Serve Frontend Pages --------------------- */
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/about.html")));
app.get("/categories", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/categories.html")));
app.get("/popular-posts", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/popular-posts.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/contact.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/login.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/signup.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "../frontend/public/admin.html")));

/* --------------------- Start Server --------------------- */
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
