"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /answers/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const answer = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        if (!answer) {
            return res.status(404).json({ error: 'Answer not found' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [answer.userId]);
        const question = await (0, db_js_1.queryOne)('SELECT id, content FROM questions WHERE id = ?', [answer.questionId]);
        answer.isAccepted = !!answer.isAccepted;
        res.json({ answer: { ...answer, user, question } });
    }
    catch (error) {
        console.error('Get answer error:', error);
        res.status(500).json({ error: 'Failed to get answer' });
    }
});
// PATCH /answers/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const answer = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        if (!answer) {
            return res.status(404).json({ error: 'Answer not found' });
        }
        if (answer.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }
        await (0, db_js_1.execute)('UPDATE answers SET content = ?, updatedAt = ? WHERE id = ?', [content, (0, db_js_1.now)(), id]);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        updated.isAccepted = !!updated.isAccepted;
        res.json({ answer: updated });
    }
    catch (error) {
        console.error('Update answer error:', error);
        res.status(500).json({ error: 'Failed to update answer' });
    }
});
// DELETE /answers/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const answer = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        if (!answer) {
            return res.status(404).json({ error: 'Answer not found' });
        }
        if (answer.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('DELETE FROM answers WHERE id = ?', [id]);
        res.json({ message: 'Answer deleted successfully' });
    }
    catch (error) {
        console.error('Delete answer error:', error);
        res.status(500).json({ error: 'Failed to delete answer' });
    }
});
// POST /answers/:id/accept
router.post('/:id/accept', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const answer = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        if (!answer) {
            return res.status(404).json({ error: 'Answer not found' });
        }
        const question = await (0, db_js_1.queryOne)('SELECT * FROM questions WHERE id = ?', [answer.questionId]);
        if (!question || question.userId !== req.user.id) {
            return res.status(403).json({ error: 'Only question author can accept answers' });
        }
        const ts = (0, db_js_1.now)();
        // Unaccept any other accepted answers for this question
        await (0, db_js_1.execute)('UPDATE answers SET isAccepted = false, updatedAt = ? WHERE questionId = ? AND isAccepted = true', [ts, answer.questionId]);
        // Accept this answer
        await (0, db_js_1.execute)('UPDATE answers SET isAccepted = true, updatedAt = ? WHERE id = ?', [ts, id]);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [id]);
        updated.isAccepted = !!updated.isAccepted;
        res.json({ answer: updated });
    }
    catch (error) {
        console.error('Accept answer error:', error);
        res.status(500).json({ error: 'Failed to accept answer' });
    }
});
exports.default = router;
//# sourceMappingURL=answers.js.map