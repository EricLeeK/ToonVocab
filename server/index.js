import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGroups, getGroup, saveGroup, deleteGroup } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, 'images');

// Ensure images directory exists
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images

// Serve static images
app.use('/images', express.static(imagesDir));

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to save base64 image to file
const saveBase64Image = (base64Data, groupId) => {
    // Extract the image format and data
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid base64 image format');
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const imageData = matches[2];
    const fileName = `${groupId}_${Date.now()}.${extension}`;
    const filePath = path.join(imagesDir, fileName);

    // Write the file
    fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));

    // Return the URL path (relative to server)
    return `/images/${fileName}`;
};

// Helper to delete old image file
const deleteImageFile = (imageUrl) => {
    if (imageUrl && imageUrl.startsWith('/images/')) {
        const fileName = imageUrl.replace('/images/', '');
        const filePath = path.join(imagesDir, fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

// GET all groups
app.get('/api/groups', (req, res) => {
    try {
        const groups = getGroups();
        // Sort by created date descending
        groups.sort((a, b) => b.createdAt - a.createdAt);
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// GET single group
app.get('/api/groups/:id', (req, res) => {
    try {
        const group = getGroup(req.params.id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
});

// POST create new group
app.post('/api/groups', (req, res) => {
    try {
        const { id, title, createdAt, imageUrl, passed, words } = req.body;
        const groupId = id || generateId();

        let finalImageUrl = undefined;
        // If imageUrl is base64, save it as a file
        if (imageUrl && imageUrl.startsWith('data:image/')) {
            finalImageUrl = saveBase64Image(imageUrl, groupId);
        } else if (imageUrl) {
            finalImageUrl = imageUrl;
        }

        const group = {
            id: groupId,
            title: title || 'New Day',
            createdAt: createdAt || Date.now(),
            imageUrl: finalImageUrl,
            passed: passed || false,
            words: words || []
        };

        saveGroup(group);
        res.status(201).json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// PUT update group
app.put('/api/groups/:id', (req, res) => {
    try {
        const existing = getGroup(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Group not found' });
        }

        let finalImageUrl = existing.imageUrl;

        // If new imageUrl is base64, save it as a file and delete old one
        if (req.body.imageUrl && req.body.imageUrl.startsWith('data:image/')) {
            // Delete old image file if exists
            deleteImageFile(existing.imageUrl);
            // Save new image
            finalImageUrl = saveBase64Image(req.body.imageUrl, req.params.id);
        } else if (req.body.imageUrl !== undefined) {
            finalImageUrl = req.body.imageUrl;
        }

        // Handle imageUrls array (for compressed images)
        let finalImageUrls = existing.imageUrls || [];
        if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
            // Delete old image files
            if (existing.imageUrls && Array.isArray(existing.imageUrls)) {
                existing.imageUrls.forEach(url => deleteImageFile(url));
            }

            // Convert base64 images to files
            finalImageUrls = req.body.imageUrls.map((imgUrl, idx) => {
                if (imgUrl && imgUrl.startsWith('data:image/')) {
                    return saveBase64Image(imgUrl, `${req.params.id}_img${idx}`);
                }
                return imgUrl;
            });
        }

        const updated = {
            ...existing,
            ...req.body,
            id: req.params.id, // Ensure ID doesn't change
            imageUrl: finalImageUrl,
            imageUrls: finalImageUrls
        };

        saveGroup(updated);
        res.json(updated);
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ error: 'Failed to update group' });
    }
});

// DELETE group
app.delete('/api/groups/:id', (req, res) => {
    try {
        const existing = getGroup(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Delete main image file
        deleteImageFile(existing.imageUrl);

        // Delete all additional images
        if (existing.imageUrls && Array.isArray(existing.imageUrls)) {
            existing.imageUrls.forEach(url => deleteImageFile(url));
        }

        deleteGroup(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

// POST add additional image to group
app.post('/api/groups/:id/images', (req, res) => {
    try {
        const existing = getGroup(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const { image } = req.body;
        if (!image || !image.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image data' });
        }

        // Save the image file
        const imageUrl = saveBase64Image(image, req.params.id);

        // Add to imageUrls array
        const imageUrls = existing.imageUrls || [];
        imageUrls.push(imageUrl);

        const updated = {
            ...existing,
            imageUrls
        };

        saveGroup(updated);
        res.status(201).json(updated);
    } catch (error) {
        console.error('Error adding image:', error);
        res.status(500).json({ error: 'Failed to add image' });
    }
});

// DELETE additional image from group
app.delete('/api/groups/:id/images/:index', (req, res) => {
    try {
        const existing = getGroup(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const index = parseInt(req.params.index);
        const imageUrls = existing.imageUrls || [];

        if (index < 0 || index >= imageUrls.length) {
            return res.status(400).json({ error: 'Invalid image index' });
        }

        // Delete the image file
        deleteImageFile(imageUrls[index]);

        // Remove from array
        imageUrls.splice(index, 1);

        const updated = {
            ...existing,
            imageUrls
        };

        saveGroup(updated);
        res.json(updated);
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// POST import JSON (batch create)
app.post('/api/groups/import', (req, res) => {
    try {
        const { title, words } = req.body;

        if (!title || !words || !Array.isArray(words)) {
            return res.status(400).json({
                error: 'Invalid format. Expected: { title: string, words: [...] }'
            });
        }

        // Generate IDs for words if not provided
        const wordsWithIds = words.map((word) => ({
            id: word.id || generateId(),
            term: word.term || '',
            meaningCn: word.meaningCn || '',
            meaningEn: word.meaningEn || '',
            meaningJp: word.meaningJp || '',
            meaningJpReading: word.meaningJpReading || ''
        }));

        // Pad to 10 words if less
        while (wordsWithIds.length < 10) {
            wordsWithIds.push({
                id: generateId(),
                term: '',
                meaningCn: '',
                meaningEn: '',
                meaningJp: '',
                meaningJpReading: ''
            });
        }

        const group = {
            id: generateId(),
            title,
            createdAt: Date.now(),
            passed: false,
            words: wordsWithIds
        };

        saveGroup(group);
        res.status(201).json(group);
    } catch (error) {
        console.error('Error importing group:', error);
        res.status(500).json({ error: 'Failed to import group' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ToonVocab API server running at http://localhost:${PORT}`);
    console.log(`📁 Images stored in: ${imagesDir}`);
});
