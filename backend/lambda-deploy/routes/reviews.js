"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const updateReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5).optional(),
    comment: zod_1.z.string().optional(),
});
// GET /reviews/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const review = await app_js_1.prisma.review.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, image: true },
                },
                course: {
                    select: { id: true, title: true },
                },
            },
        });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json({ review });
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
        const review = await app_js_1.prisma.review.findUnique({ where: { id } });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateReviewSchema.parse(req.body);
        const updated = await app_js_1.prisma.review.update({
            where: { id },
            data,
        });
        res.json({ review: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});
// DELETE /reviews/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const review = await app_js_1.prisma.review.findUnique({ where: { id } });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.review.delete({ where: { id } });
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});
exports.default = router;
//# sourceMappingURL=reviews.js.map