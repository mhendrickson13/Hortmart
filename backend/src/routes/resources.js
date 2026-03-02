"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET /resources/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await (0, db_js_1.queryOne)('SELECT * FROM resources WHERE id = ?', [id]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        const lesson = await (0, db_js_1.queryOne)('SELECT id, title FROM lessons WHERE id = ?', [resource.lessonId]);
        res.json({ resource: { ...resource, lesson } });
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
        const resource = await (0, db_js_1.queryOne)('SELECT * FROM resources WHERE id = ?', [id]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        // Check ownership: resource -> lesson -> module -> course -> creatorId
        const lesson = await (0, db_js_1.queryOne)('SELECT moduleId FROM lessons WHERE id = ?', [resource.lessonId]);
        const mod = await (0, db_js_1.queryOne)('SELECT courseId FROM modules WHERE id = ?', [lesson?.moduleId]);
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const { title, type, url, fileSize } = req.body;
        const sets = [];
        const params = [];
        if (title !== undefined) {
            sets.push('title = ?');
            params.push(title);
        }
        if (type !== undefined) {
            sets.push('type = ?');
            params.push(type);
        }
        if (url !== undefined) {
            sets.push('url = ?');
            params.push(url);
        }
        if (fileSize !== undefined) {
            sets.push('fileSize = ?');
            params.push(fileSize);
        }
        if (sets.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        params.push(id);
        await (0, db_js_1.execute)(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`, params);
        const updated = await (0, db_js_1.queryOne)('SELECT * FROM resources WHERE id = ?', [id]);
        res.json({ resource: updated });
    }
    catch (error) {
        console.error('Update resource error:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});
// DELETE /resources/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await (0, db_js_1.queryOne)('SELECT * FROM resources WHERE id = ?', [id]);
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        const lesson = await (0, db_js_1.queryOne)('SELECT moduleId FROM lessons WHERE id = ?', [resource.lessonId]);
        const mod = await (0, db_js_1.queryOne)('SELECT courseId FROM modules WHERE id = ?', [lesson?.moduleId]);
        const course = await (0, db_js_1.queryOne)('SELECT creatorId FROM courses WHERE id = ?', [mod?.courseId]);
        if (!course || (course.creatorId !== req.user.id && req.user.role !== 'ADMIN')) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await (0, db_js_1.execute)('DELETE FROM resources WHERE id = ?', [id]);
        res.json({ message: 'Resource deleted successfully' });
    }
    catch (error) {
        console.error('Delete resource error:', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});
exports.default = router;
//# sourceMappingURL=resources.js.map