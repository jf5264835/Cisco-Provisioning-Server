module.exports = function(app) {
    const fs = require('fs');
    const path = require('path');
    const renderData = (req, extra = {}) => ({ username: req.session.a_username, name: req.session.a_name || req.session.a_username, permissions: req.session.a_permissions, ...extra });
    app.get('/dashboard', (req, res) => {
        if (!req.session.loggedIn) {
            res.redirect('/login');
            return;
        }

        res.render('dashboard', {
            username: req.session.a_username,
            createdAt: req.session.a_createdAt,
            createdBy: req.session.a_createdBy,
            lastLogin: req.session.a_lastLogin,
            peEnabled: req.session.a_peEnabled,
            permissions: req.session.a_permissions
            
        });
        
    });

    app.get('/dashboard/devices', (req, res) => {
        if (!req.session.loggedIn) {
            res.redirect('/login');
            return;
        }

        const data = require('../../server/jdata');
        const cache = data.get();

        //console.log("The current data cache is: " + JSON.stringify(cache.devices));
        

        res.render('devices', {
            username: req.session.a_username,
            createdAt: req.session.a_createdAt,
            createdBy: req.session.a_createdBy,
            lastLogin: req.session.a_lastLogin,
            peEnabled: req.session.a_peEnabled,
            permissions: req.session.a_permissions,
            devices: cache.devices.map((device) => ({ ...device, configurationHealthy: fs.existsSync(path.join(__dirname, '../../data/config', device.provisioningFile || `SEP${device.mac}.cnf.xml`)) }))
        });
    });

    app.get('/dashboard/resources', (req, res) => {
        if (!req.session.loggedIn) {
            res.redirect('/login');
            return;
        }

        res.render('resources', {
            username: req.session.a_username,
            createdAt: req.session.a_createdAt,
            createdBy: req.session.a_createdBy,
            lastLogin: req.session.a_lastLogin,
            peEnabled: req.session.a_peEnabled,
            permissions: req.session.a_permissions,
        });

    });

    app.get('/dashboard/settings', (req, res) => {
        if (!req.session.loggedIn) return res.redirect('/login');
        res.render('settings', renderData(req));
    });

    app.get('/dashboard/users', (req, res) => {
        if (!req.session.loggedIn) return res.redirect('/login');
        if (req.session.a_permissions !== '*') return res.status(403).send('Administrator permission is required.');
        const accounts = require('../../server/jdata').get().accounts.map(({ password, ...account }) => account);
        res.render('users', renderData(req, { accounts }));
    });

    app.get('/dashboard/templates', (req, res) => {
        if (!req.session.loggedIn) return res.redirect('/login');
        const templates = require('../../server/jdata').get().templates || [];
        res.render('templates', renderData(req, { templates }));
    });

    app.get('/dashboard/action', (req, res) => {
        if (!req.session.loggedIn) {
            res.status(403).send('<!DOCTYPE html><style>* {font-family: sans-serif;}</style><h1>403 Forbidden</h1><p>You do not have permission to access this page.<br>Please log in with an authorized account to continue your action.</p><hr>');
            return;
        }
        res.render('actionPopup');
    });

    app.get('/dashboard/addDevice', (req, res) => {
        if (!req.session.loggedIn) {
            res.status(403).send('<!DOCTYPE html><style>* {font-family: sans-serif;}</style><h1>403 Forbidden</h1><p>You do not have permission to access this page.<br>Please log in with an authorized account to continue your action.</p><hr>');
            return;
        }
        res.render('addDevicePopup');
    });

    app.get('/dashboard/remoteProvision', (req, res) => {
        if (!req.session.loggedIn) {
            res.status(403).send('<!DOCTYPE html><style>* {font-family: sans-serif;}</style><h1>403 Forbidden</h1><p>You do not have permission to access this page.<br>Please log in with an authorized account to continue your action.</p><hr>');
            return;
        }
        res.render('rmtProvision');
    });
}
