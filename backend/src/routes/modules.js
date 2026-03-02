"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /modules/:id
router.get('/:id', auth_js_1.optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [id]);
        if (!mod) {
            return res.status(404).json({ error: 'Module not found' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT id, title, creatorId, status FROM courses WHERE id = ?', [mod.courseId]);
        // Block access to draft course modules for non-owners
        if (course && course.status !== 'PUBLISHED') {
            if (!req.user || (req.user.id !== course.creatorId && req.user.role !== 'ADMIN')) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        const lessons = await (0, db_js_1.query)('SELECT * FROM lessons WHERE moduleId = ? ORDER BY position ASC', [id]);
        // Convert boolean fields
        lessons.forEach(l => { l.isLocked = !!l.isLocked; l.isFreePreview = !!l.isFreePreview; });
        res.json({ module: { ...mod, lessons, course } });
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
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [id]);
        if (!mod) {
            return res.status(404).json({ error: 'Module not found' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { title, position } = req.body;
        const sets = [];
        const params = [];
        if (title !== undefined) {
            sets.push('title = ?');
            params.push(title);
        }
        if (position !== undefined) {
            sets.push('position = ?');
            params.push(position);
        }
        sets.push('updatedAt = ?');
        params.push((0, db_js_1.now)());
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE modules SET ${sets.join(', ')} WHERE id = ?`, params);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [id]);
        res.json({ module: updated });
    }
    catch (error) {
        console.error('Update module error:', error);
        res.status(500).json({ error: 'Failed to update module' });
    }
});
// DELETE /modules/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [id]);
        if (!mod) {
            return res.status(404).json({ error: 'Module not found' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Cascade: delete lesson_progress and resources for lessons in this module
        const moduleLessons = await (0, db_js_1.query)('SELECT id FROM lessons WHERE moduleId = ?', [id]);
        for (const lesson of moduleLessons) {
            await (0, db_js_1.execute)('DELETE FROM lesson_progress WHERE lessonId = ?', [lesson.id]);
            await (0, db_js_1.execute)('DELETE FROM resources WHERE lessonId = ?', [lesson.id]);
            await (0, db_js_1.execute)('DELETE FROM notes WHERE lessonId = ?', [lesson.id]);
            await (0, db_js_1.execute)('DELETE FROM questions WHERE lessonId = ?', [lesson.id]);
        }
        await (0, db_js_1.execute)('DELETE FROM lessons WHERE moduleId = ?', [id]);
        await (0, db_js_1.execute)('DELETE FROM modules WHERE id = ?', [id]);
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
        const mod = await (0, db_js_1.queryOne)('SELECT * FROM modules WHERE id = ?', [id]);
        if (!mod) {
            return res.status(404).json({ error: 'Module not found' });
        }
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const ts = (0, db_js_1.now)();
        await Promise.all(lessonOrder.map((lessonId, index) => (0, db_js_1.execute)('UPDATE lessons SET position = ?, updatedAt = ? WHERE id = ?', [index, ts, lessonId])));
        res.json({ message: 'Lessons reordered' });
    }
    catch (error) {
        console.error('Reorder lessons error:', error);
        res.status(500).json({ error: 'Failed to reorder lessons' });
    }
});
exports.default = router;
//# sourceMappingURL=modules.js.map