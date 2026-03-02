"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /notes/:id
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const note = await (0, db_js_1.queryOne)('SELECT * FROM notes WHERE id = ?', [id]);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
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
        const note = await (0, db_js_1.queryOne)('SELECT * FROM notes WHERE id = ?', [id]);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { content, timestampSeconds } = req.body;
        const sets = [];
        const params = [];
        if (content !== undefined) {
            sets.push('content = ?');
            params.push(content);
        }
        if (timestampSeconds !== undefined) {
            sets.push('timestampSeconds = ?');
            params.push(timestampSeconds);
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, params);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM notes WHERE id = ?', [id]);
        res.json({ note: updated });
    }
    catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});
// DELETE /notes/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const note = await (0, db_js_1.queryOne)('SELECT * FROM notes WHERE id = ?', [id]);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (note.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('DELETE FROM notes WHERE id = ?', [id]);
        res.json({ message: 'Note deleted successfully' });
    }
    catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map