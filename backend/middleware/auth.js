const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ message: "Access denied" });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};
