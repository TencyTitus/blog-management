const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blog-management";

mongoose.connect(MONGO_URI)
   .then(() => console.log("MongoDB connected successfully!"))
   .catch(err => {
       console.error("MongoDB connection error:", err.message);
       process.exit(1);
   });

module.exports = mongoose;

