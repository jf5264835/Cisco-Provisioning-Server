const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ejs = require('ejs');

const views = ['settings', 'users', 'templates'];
const locals = {
    username: 'admin',
    name: 'Administrator',
    permissions: '*',
    accounts: [{ username: 'admin', name: 'Administrator', permissions: '*', enabled: true }],
    templates: [{ uuid: 'template-id', name: 'Base', description: 'Defaults', phoneSettings: { sipPort: '5060' } }]
};

for (const view of views) {
    test(`${view} view renders`, async () => {
        const output = await ejs.renderFile(`src/views/${view}.ejs`, locals, { root: 'src/views' });
        assert.match(output, /<!doctype html>/i);
        assert.doesNotMatch(output, /<%/);
    });
}

test('device selection exposes stable UUID values', () => {
    const view = fs.readFileSync('src/views/devices.ejs', 'utf8');
    assert.match(view, /class="device-selection"/);
    assert.match(view, /data-device-uuid=/);
});

test('container publication workflow and deployment files exist', () => {
    for (const file of ['Dockerfile', 'compose.yaml', '.github/workflows/container.yml']) {
        assert.equal(fs.existsSync(file), true, `${file} should exist`);
    }
});
