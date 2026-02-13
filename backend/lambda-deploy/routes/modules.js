"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const updateModuleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    position: zod_1.z.number().int().min(0).optional(),
});
// GET /modules/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const module = await app_js_1.prisma.module.findUnique({
            where: { id },
            include: {
                lessons: {
                    orderBy: { position: 'asc' },
                },
                course: {
                    select: { id: true, title: true, creatorId: true },
                },
            },
        });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        res.json({ module });
    }
    catch (error) {
        console.error('Get module error:', error);
        res.status(500).json({ error: 'Failed to get module' });
    }
});
// PATCH /modules/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const module = await app_js_1.prisma.module.findUnique({
            where: { id },
            include: {
                course: { select: { creatorId: true } },
            },
        });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        if (module.course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateModuleSchema.parse(req.body);
        const updated = await app_js_1.prisma.module.update({
            where: { id },
            data,
        });
        res.json({ module: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update module error:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});
// DELETE /modules/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const module = await app_js_1.prisma.module.findUnique({
            where: { id },
            include: {
                course: { select: { creatorId: true } },
            },
        });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        if (module.course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.module.delete({ where: { id } });
        res.json({ message: 'Module deleted successfully' });
    }
    catch (error) {
        console.error('Delete module error:', error);
        res.status(500).json({ error: 'Failed to delete module' });
    }
});
// PATCH /modules/:id/reorder - Reorder lessons within module
router.patch('/:id/reorder', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { lessonOrder } = req.body;
        if (!Array.isArray(lessonOrder)) {
            return res.status(400).json({ error: 'lessonOrder must be an array' });
        }
        const module = await app_js_1.prisma.module.findUnique({
            where: { id },
            include: {
                course: { select: { creatorId: true } },
            },
        });
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        if (module.course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await Promise.all(lessonOrder.map((lessonId, index) => app_js_1.prisma.lesson.update({
            where: { id: lessonId },
            data: { position: index },
        })));
        res.json({ message: 'Lessons reordered' });
    }
    catch (error) {
        console.error('Reorder lessons error:', error);
        res.status(500).json({ error: 'Failed to reorder lessons' });
    }
});
exports.default = router;
//# sourceMappingURL=modules.js.map