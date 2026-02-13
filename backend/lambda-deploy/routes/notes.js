"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const app_js_1 = require("../app.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const updateNoteSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).optional(),
    timestampSeconds: zod_1.z.number().int().min(0).optional(),
});
// GET /notes/:id
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const note = await app_js_1.prisma.note.findUnique({
            where: { id },
        });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        // Only owner can view
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json({ note });
    }
    catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({ error: 'Failed to get note' });
    }
});
// PATCH /notes/:id
router.patch('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const note = await app_js_1.prisma.note.findUnique({ where: { id } });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const data = updateNoteSchema.parse(req.body);
        const updated = await app_js_1.prisma.note.update({
            where: { id },
            data,
        });
        res.json({ note: updated });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});
// DELETE /notes/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const note = await app_js_1.prisma.note.findUnique({ where: { id } });
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await app_js_1.prisma.note.delete({ where: { id } });
        res.json({ message: 'Note deleted successfully' });
    }
    catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map