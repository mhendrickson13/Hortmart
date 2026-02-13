"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const updateResourceSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    type: zod_1.z.string().min(1).optional(),
    url: zod_1.z.string().url().optional(),
    fileSize: zod_1.z.number().int().min(0).optional(),
});
// GET /resources/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await app_js_1.prisma.resource.findUnique({
            where: { id },
            include: {
                lesson: {
                    select: { id: true, title: true },
                },
            },
        });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        res.json({ resource });
    }
    catch (error) {
        console.error('Get resource error:', error);
        res.status(500).json({ error: 'Failed to get resource' });
    }
});
// PATCH /resources/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await app_js_1.prisma.resource.findUnique({
            where: { id },
            include: {
                lesson: {
                    include: {
                        module: {
                            include: {
                                course: { select: { creatorId: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        if (resource.lesson.module.course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateResourceSchema.parse(req.body);
        const updated = await app_js_1.prisma.resource.update({
            where: { id },
            data,
        });
        res.json({ resource: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update resource error:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});
// DELETE /resources/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await app_js_1.prisma.resource.findUnique({
            where: { id },
            include: {
                lesson: {
                    include: {
                        module: {
                            include: {
                                course: { select: { creatorId: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        if (resource.lesson.module.course.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.resource.delete({ where: { id } });
        res.json({ message: 'Resource deleted successfully' });
    }
    catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});
exports.default = router;
//# sourceMappingURL=resources.js.map