"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const updateQuestionSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
});
const createAnswerSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
});
// GET /questions/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const question = await app_js_1.prisma.question.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
                answers: {
                    include: {
                        user: {
                            select: { id: true, name: true, image: true },
                        },
                    },
                    orderBy: [
                        { isAccepted: 'desc' },
                        { createdAt: 'asc' },
                    ],
                },
                lesson: {
                    select: { id: true, title: true },
                },
            },
        });
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json({ question });
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
        const question = await app_js_1.prisma.question.findUnique({ where: { id } });
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (question.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateQuestionSchema.parse(req.body);
        const updated = await app_js_1.prisma.question.update({
            where: { id },
            data,
        });
        res.json({ question: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update question error:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});
// DELETE /questions/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const question = await app_js_1.prisma.question.findUnique({ where: { id } });
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (question.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.question.delete({ where: { id } });
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
        const data = createAnswerSchema.parse(req.body);
        const question = await app_js_1.prisma.question.findUnique({ where: { id } });
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        const answer = await app_js_1.prisma.answer.create({
            data: {
                content: data.content,
                userId: req.user.id,
                questionId: id,
            },
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
            },
        });
        res.status(201).json({ answer });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Create answer error:', error);
        res.status(500).json({ error: 'Failed to create answer' });
    }
});
exports.default = router;
//# sourceMappingURL=questions.js.map