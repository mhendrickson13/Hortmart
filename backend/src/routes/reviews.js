"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /reviews/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const review = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE id = ?', [id]);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [review.userId]);
        const course = await (0, db_js_1.queryOne)('SELECT id, title FROM courses WHERE id = ?', [review.courseId]);
        res.json({ review: { ...review, user, course } });
    }
    catch (error) {
        console.error('Get review error:', error);
        res.status(500).json({ error: 'Failed to get review' });
    }
});
// PATCH /reviews/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const review = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE id = ?', [id]);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { rating, comment } = req.body;
        const sets = [];
        const params = [];
        if (rating !== undefined) {
            if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
                return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
            }
            sets.push('rating = ?');
            params.push(rating);
        }
        if (comment !== undefined) {
            sets.push('comment = ?');
            params.push(comment);
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE reviews SET ${sets.join(', ')} WHERE id = ?`, params);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE id = ?', [id]);
        res.json({ review: updated });
    }
    catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});
// DELETE /reviews/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const review = await (0, db_js_1.queryOne)('SELECT * FROM reviews WHERE id = ?', [id]);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('DELETE FROM reviews WHERE id = ?', [id]);
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map