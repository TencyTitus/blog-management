const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const session = require('express-session');
const jwt = require("jsonwebtoken");
require("dotenv").config();
require("./db"); // MongoDB connection file

const User = require("./models/User");
const Post = require("./models/Post");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

console.log("MongoDB URI:", process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'blog-session-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // set to true in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Save session for each request
app.use((req, res, next) => {
    const oldEnd = res.end;
    res.end = function() {
        res.end = oldEnd;
        if (req.session) {
            req.session.save();
        }
        return res.end.apply(this, arguments);
    };
    next();
});

// Initialize session.postsRead for new sessions
app.use((req, res, next) => {
    if (!req.session.postsRead) {
        req.session.postsRead = [];
    }
    next();
});

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id || decoded._id,
            username: decoded.username,
            email: decoded.email,
            isAdmin: decoded.isAdmin
        };
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin", adminRoutes);

console.log('Routes registered: /api/auth, /api/posts, /api/admin');

app.use("/api/subscription", subscriptionRoutes);

// API health check
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        mongodb: mongoose.connection.readyState === 1 
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Handle HTML file requests
app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/login.html"));
});

app.get("/signup.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/signup.html"));
});

app.get("/my-posts.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/my-posts.html"));
});

app.get("/write.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/write.html"));
});

app.get("/edit-profile.html", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/edit-profile.html"));
});

// Catch-all route for the frontend - this should be last
app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Check if this is an API request
    if (req.path.startsWith('/api')) {
        res.status(500).json({ 
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } else {
        // For non-API requests, serve the frontend
        res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
