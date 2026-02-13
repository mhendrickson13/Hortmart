"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /questions/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const question = await (0, db_js_1.queryOne)('SELECT * FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const user = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [question.userId]);
        const lesson = await (0, db_js_1.queryOne)('SELECT id, title FROM lessons WHERE id = ?', [question.lessonId]);
        const answers = await (0, db_js_1.query)(`SELECT a.*, u.id as u_id, u.name as u_name, u.image as u_image
       FROM answers a LEFT JOIN users u ON a.userId = u.id
       WHERE a.questionId = ?
       ORDER BY a.isAccepted DESC, a.createdAt ASC`, [id]);
        const formattedAnswers = answers.map(a => ({
            id: a.id, content: a.content, userId: a.userId, questionId: a.questionId,
            isAccepted: !!a.isAccepted, createdAt: a.createdAt, updatedAt: a.updatedAt,
            user: { id: a.u_id, name: a.u_name, image: a.u_image },
        }));
        res.json({ question: { ...question, user, lesson, answers: formattedAnswers } });
    }
    catch (error) {
        console.error('Get question error:', error);
        res.status(500).json({ error: 'Failed to get question' });
    }
});
// PATCH /questions/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const question = await (0, db_js_1.queryOne)('SELECT * FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (question.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }
        await (0, db_js_1.execute)('UPDATE questions SET content = ?, updatedAt = ? WHERE id = ?', [content, (0, db_js_1.now)(), id]);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM questions WHERE id = ?', [id]);
        res.json({ question: updated });
    }
    catch (error) {
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});
// DELETE /questions/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const question = await (0, db_js_1.queryOne)('SELECT * FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (question.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('DELETE FROM questions WHERE id = ?', [id]);
        res.json({ message: 'Question deleted successfully' });
    }
    catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});
// POST /questions/:id/answers
router.post('/:id/answers', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'content is required' });
        }
        const question = await (0, db_js_1.queryOne)('SELECT id FROM questions WHERE id = ?', [id]);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const answerId = (0, db_js_1.genId)();
        const ts = (0, db_js_1.now)();
        await (0, db_js_1.execute)('INSERT INTO answers (id, content, userId, questionId, isAccepted, updatedAt) VALUES (?, ?, ?, ?, false, ?)', [answerId, content, req.user.id, id, ts]);
        const answer = await (0, db_js_1.queryOne)('SELECT * FROM answers WHERE id = ?', [answerId]);
        const user = await (0, db_js_1.queryOne)('SELECT id, name, image FROM users WHERE id = ?', [req.user.id]);
        answer.isAccepted = !!answer.isAccepted;
        res.status(201).json({ answer: { ...answer, user } });
    }
    catch (error) {
        console.error('Create answer error:', error);
        res.status(500).json({ error: 'Failed to create answer' });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map