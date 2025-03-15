const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Assuming you have a User model
const bcrypt = require("bcrypt");


// Signup Route
router.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user exists
        if (await User.findOne({ email })) {
            return res.status(400).json({ message: "Email already exists!" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to database
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// Login Route
router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "User not found" });
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  
      res.json({ message: "Login successful", user });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  module.exports = router;
