const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jdata = require('../../server/jdata');
const { defaultPhoneSettings } = require('./dmod');
const { validateTemplatePayload } = require('./configValidation');

function loggedIn(req, res) {
    if (req.session.loggedIn === true) return true;
    res.status(401).json({ code: 1, message: 'Not logged in' });
    return false;
}

function administrator(req, res) {
    if (!loggedIn(req, res)) return false;
    if (req.session.a_permissions === '*') return true;
    res.status(403).json({ code: 1, message: 'Administrator permission is required.' });
    return false;
}

module.exports = function (app) {
    app.get('/api/templates', (req, res) => {
        if (!loggedIn(req, res)) return;
        res.json(jdata.get().templates || []);
    });

    app.post('/api/templates', (req, res) => {
        if (!administrator(req, res)) return;
        const cache = jdata.get();
        cache.templates ||= [];
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ code: 1, message: 'Template name is required.' });
        const validation = validateTemplatePayload(req.body, defaultPhoneSettings);
        if (validation.error) return res.status(400).json({ code: 1, message: validation.error });
        const { cpa, phoneSettings, pbxServerIP } = validation.value;
        const uuid = String(req.body.uuid || crypto.randomUUID());
        const template = { uuid, name, description: String(req.body.description || '').trim(), pbxServerIP, cpa, phoneSettings, updatedAt: new Date().toISOString(), updatedBy: req.session.a_username };
        const index = cache.templates.findIndex((item) => item.uuid === uuid);
        if (index >= 0) cache.templates[index] = { ...cache.templates[index], ...template };
        else cache.templates.push({ ...template, createdAt: new Date().toISOString() });
        jdata.save(cache);
        res.json({ code: 0, template });
    });

    app.delete('/api/templates/:uuid', (req, res) => {
        if (!administrator(req, res)) return;
        const cache = jdata.get();
        const before = (cache.templates || []).length;
        cache.templates = (cache.templates || []).filter((item) => item.uuid !== req.params.uuid);
        if (cache.templates.length === before) return res.status(404).json({ code: 1, message: 'Template not found.' });
        jdata.save(cache);
        res.json({ code: 0, message: 'Template deleted.' });
    });

    app.post('/api/users', async (req, res) => {
        if (!administrator(req, res)) return;
        const cache = jdata.get();
        const username = String(req.body.username || '').trim();
        const name = String(req.body.name || '').trim();
        const password = String(req.body.password || '');
        if (!/^[A-Za-z0-9._-]{3,64}$/.test(username)) return res.status(400).json({ code: 1, message: 'Username must be 3-64 letters, numbers, dots, underscores, or hyphens.' });
        if (!name) return res.status(400).json({ code: 1, message: 'Name is required.' });
        const existing = cache.accounts.find((item) => item.username === username);
        if (!existing && password.length < 10) return res.status(400).json({ code: 1, message: 'New users require a password of at least 10 characters.' });
        if (password && password !== req.body.confirmPassword) return res.status(400).json({ code: 1, message: 'Passwords do not match.' });
        const account = existing || { username, createdAt: new Date().toISOString(), createdBy: req.session.a_username, lastLogin: null };
        account.name = name;
        account.enabled = req.body.enabled !== false;
        account.permissions = req.body.permissions === '*' ? '*' : '';
        if (password) { account.password = await bcrypt.hash(password, 12); account.peEnable = true; }
        if (!existing) cache.accounts.push(account);
        jdata.save(cache);
        res.json({ code: 0, message: existing ? 'User updated.' : 'User created.' });
    });

    app.delete('/api/users/:username', (req, res) => {
        if (!administrator(req, res)) return;
        if (req.params.username === req.session.a_username) return res.status(400).json({ code: 1, message: 'You cannot delete your current account.' });
        const cache = jdata.get();
        const before = cache.accounts.length;
        cache.accounts = cache.accounts.filter((item) => item.username !== req.params.username);
        if (cache.accounts.length === before) return res.status(404).json({ code: 1, message: 'User not found.' });
        jdata.save(cache);
        res.json({ code: 0, message: 'User deleted.' });
    });
};
