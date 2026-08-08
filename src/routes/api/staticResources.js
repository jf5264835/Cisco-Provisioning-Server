const fs = require('fs');
const path = require('path');
const { Parser } = require('xml2js');

const resourceDirectory = path.join(__dirname, '../../data/misc');
const resources = {
    AppDialRules: { fileName: 'AppDialRules.xml', roots: ['DialRules', 'dialRules'] },
    DialTemplate: { fileName: 'DialTemplate.xml', roots: ['dialTemplate'] }
};

function resourceFor(name) {
    return Object.prototype.hasOwnProperty.call(resources, name) ? resources[name] : null;
}

async function validateXml(resource, xml) {
    if (typeof xml !== 'string' || xml.trim() === '') throw new Error('XML cannot be empty.');
    const parsed = await new Parser({ explicitArray: false }).parseStringPromise(xml);
    const root = Object.keys(parsed || {})[0];
    if (!resource.roots.includes(root)) throw new Error(`Expected <${resource.roots[0]}> as the root element.`);
    if (root === 'dialTemplate') {
        const versionStamp = parsed[root].versionStamp;
        if (typeof versionStamp !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(versionStamp)) throw new Error('Dial template versionStamp must be a UUID.');
        const templates = parsed[root].TEMPLATE === undefined ? [] : [].concat(parsed[root].TEMPLATE);
        for (const template of templates) {
            const attributes = template.$ || {};
            if (attributes.match === undefined) throw new Error('Every <TEMPLATE> requires a match attribute.');
            if (attributes.timeout !== undefined && (!/^\d+$/.test(attributes.timeout) || Number(attributes.timeout) > 60)) throw new Error('Template timeout must be an integer from 0 through 60.');
            if (attributes.line !== undefined && (!/^\d+$/.test(attributes.line) || Number(attributes.line) < 1)) throw new Error('Template line must be a positive integer.');
        }
    }
}

module.exports = function (app) {
    Object.values(resources).forEach((resource) => {
        app.get(`/${resource.fileName}`, (req, res) => res.sendFile(path.join(resourceDirectory, resource.fileName)));
    });

    app.get('/api/static-resources/:name', (req, res) => {
        if (req.session.loggedIn !== true) return res.status(401).json({ code: 1, message: 'Not logged in' });
        const resource = resourceFor(req.params.name);
        if (!resource) return res.status(404).json({ code: 1, message: 'Static resource not found.' });
        const xml = fs.readFileSync(path.join(resourceDirectory, resource.fileName), 'utf8');
        res.json({ code: 0, name: req.params.name, fileName: resource.fileName, xml });
    });

    app.put('/api/static-resources/:name', async (req, res) => {
        if (req.session.loggedIn !== true) return res.status(401).json({ code: 1, message: 'Not logged in' });
        if (req.session.a_permissions !== '*') return res.status(403).json({ code: 1, message: 'Administrator permission is required.' });
        const resource = resourceFor(req.params.name);
        if (!resource) return res.status(404).json({ code: 1, message: 'Static resource not found.' });
        try {
            await validateXml(resource, req.body.xml);
            const target = path.join(resourceDirectory, resource.fileName);
            const temporary = `${target}.${process.pid}.tmp`;
            fs.writeFileSync(temporary, req.body.xml, 'utf8');
            fs.renameSync(temporary, target);
            res.json({ code: 0, message: `${resource.fileName} saved.` });
        } catch (error) {
            res.status(400).json({ code: 1, message: error.message });
        }
    });
};
