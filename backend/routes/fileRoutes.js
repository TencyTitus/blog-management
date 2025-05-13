const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Function to get files and folders recursively
async function getFilesAndFolders(dirPath) {
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const result = await Promise.all(items.map(async item => {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                const children = await getFilesAndFolders(fullPath);
                return {
                    name: item.name,
                    type: 'folder',
                    path: fullPath,
                    children
                };
            }
            return {
                name: item.name,
                type: 'file',
                path: fullPath
            };
        }));
        return result;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
}

// Route to get file structure
router.get('/list', async (req, res) => {
    try {
        const rootDir = path.join(__dirname, '../../frontend/public');
        const files = await getFilesAndFolders(rootDir);
        res.json(files);
    } catch (error) {
        console.error('Error getting file list:', error);
        res.status(500).json({ message: 'Error getting file list' });
    }
});

module.exports = router; 