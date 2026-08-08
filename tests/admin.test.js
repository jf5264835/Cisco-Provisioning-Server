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
    assert.doesNotMatch(view, /return '<input type="checkbox" class="checkbox">'/);
});

test('device actions remain inside authenticated management routes', () => {
    const view = fs.readFileSync('src/views/devices.ejs', 'utf8');
    assert.match(view, /astat=duplicate&data=/);
    assert.doesNotMatch(view, /title="Duplicate Device" href="\/"/);
    assert.match(view, /Config Missing/);
});

test('device IP is optional but validated when supplied', () => {
    const route = fs.readFileSync('src/routes/api/dmod.js', 'utf8');
    assert.match(route, /json\.cust\.deviceIP && !net\.isIP/);
    assert.match(route, /PBX server IP must be a valid IPv4 or IPv6 address/);
});

test('device edits atomically replace the provisioning file used on refresh', () => {
    const route = fs.readFileSync('src/routes/api/dmod.js', 'utf8');
    assert.match(route, /provisioningFile = `SEP\$\{json\.meta\.deviceMAC\}\.cnf\.xml`/);
    assert.match(route, /saveProvisioningFile\(provisioningFile, xml\);\s*serverData\.save\(cache\);/);
    assert.match(route, /fs\.writeFileSync\(temporaryFile, contents, 'utf8'\);\s*fs\.renameSync\(temporaryFile, destination\);/);
    assert.doesNotMatch(route, /fs\.writeFile\(path\.join\(__dirname, `\.\.\/\.\.\/data\/config\/SEP/);
});

test('critical provisioning defaults and global XML resources are present', () => {
    const template = fs.readFileSync('src/routes/api/template.xml', 'utf8');
    assert.match(template, /<member priority="0">/);
    assert.match(fs.readFileSync('src/data/misc/DialTemplate.xml', 'utf8'), /<dialTemplate>/);
    assert.match(fs.readFileSync('src/data/misc/DialTemplate.xml', 'utf8'), /<versionStamp>[0-9a-f-]+<\/versionStamp>/);
    assert.match(fs.readFileSync('src/data/misc/AppDialRules.xml', 'utf8'), /<DialRules>/);
});

test('resource tabs hide inactive panels', () => {
    const styles = fs.readFileSync('src/public/scss/master-resources.scss', 'utf8');
    const view = fs.readFileSync('src/views/resources.ejs', 'utf8');
    assert.match(styles, /\.tabBody\[hidden\]\s*{\s*display:\s*none/);
    assert.match(view, /id="dialTemplate" data-resource-panel hidden/);
    assert.match(view, /id="appDialRules" data-resource-panel hidden/);
});

test('resource tabs render each dialing editor once and keep global resources media-only', () => {
    const view = fs.readFileSync('src/views/resources.ejs', 'utf8');
    assert.equal((view.match(/id="dialTemplate" data-resource-panel/g) || []).length, 1);
    assert.equal((view.match(/id="appDialRules" data-resource-panel/g) || []).length, 1);

    const globalResources = view.slice(view.indexOf('id="globalResources"'), view.indexOf('id="dialTemplate" data-resource-panel'));
    assert.match(globalResources, /id="wallpaperForm"/);
    assert.match(globalResources, /id="ringtoneForm"/);
    assert.doesNotMatch(globalResources, /DialTemplate|AppDialRules|Global Dialing Resources/);
});

test('legacy provisioning hostname is absent from generated defaults and sample configuration', () => {
    const defaults = fs.readFileSync('src/routes/api/dmod.js', 'utf8');
    const sampleConfig = fs.readFileSync('src/data/config/SEP00BB609D65B6.cnf.xml', 'utf8');
    assert.doesNotMatch(defaults, /provisioning\.centurate\.com/i);
    assert.doesNotMatch(sampleConfig, /provisioning\.centurate\.com/i);
});

test('container publication workflow and deployment files exist', () => {
    for (const file of ['Dockerfile', 'compose.yaml', '.github/workflows/container.yml']) {
        assert.equal(fs.existsSync(file), true, `${file} should exist`);
    }
});

test('call manager XML orders ports before processNodeName and omits invalid CAPF default', () => {
    const template = fs.readFileSync('src/routes/api/template.xml', 'utf8');
    const callManager = template.slice(template.indexOf('<callManager>'), template.indexOf('</callManager>'));
    assert.ok(callManager.indexOf('<ports>') < callManager.indexOf('<processNodeName>'));
    assert.doesNotMatch(fs.readFileSync('src/routes/api/dmod.js', 'utf8'), /capfAuthMode:\s*["']0["']/);
});

test('configuration validation removes blanks and restricts CAPF modes', () => {
    const { replaceOptionalXmlPlaceholders, validatePhoneSettings } = require('../src/routes/api/configValidation');
    const defaults = { capfAuthMode: '', timerT1: '500', encrConfig: 'false' };
    assert.deepEqual(validatePhoneSettings({ capfAuthMode: '2', timerT1: '600', unused: '' }, defaults).value, { capfAuthMode: '2', timerT1: '600' });
    assert.match(validatePhoneSettings({ capfAuthMode: '0' }, defaults).error, /1, 2, or 3/);
    assert.match(validatePhoneSettings({ timerT1: 'fast' }, defaults).error, /integer/);
    assert.deepEqual(validatePhoneSettings({ capfAuthMode: 2, timerT1: 600 }, defaults).value, { capfAuthMode: '2', timerT1: '600' });
    assert.equal(replaceOptionalXmlPlaceholders('<device>\n  <capfAuthMode><!--capfAuthMode--></capfAuthMode>\n</device>', { capfAuthMode: '' }), '<device>\n</device>');
});

test('common provisioning validation accepts boolean dropdown values', () => {
    const { validateCommonProvisioning } = require('../src/routes/api/configValidation');
    assert.deepEqual(validateCommonProvisioning({ disableSpeakerphone: 'false', disableSpeakerphoneAndHeadset: true, enableMuteFeature: false }).value, {
        disableSpeakerphone: 'false',
        disableSpeakerphoneAndHeadset: 'true',
        enableMuteFeature: 'false'
    });
    assert.match(validateCommonProvisioning({ disableSpeakerphone: '0' }).error, /true or false/);
});

test('provisioning validation rejects concatenated XML documents', async () => {
    const { validateProvisioningXml } = require('../src/routes/api/dmod');
    assert.equal((await validateProvisioningXml('<device><fullConfig>true</fullConfig></device>')).valid, true);
    const duplicated = await validateProvisioningXml('<device></device><device></device>');
    assert.equal(duplicated.valid, false);
});

test('device editor tolerates optional elements omitted from XML', () => {
    const editor = fs.readFileSync('src/public/js/master-addDevicePopup.js', 'utf8');
    assert.match(editor, /const xmlValue = \(path, fallback = ''\)/);
    assert.match(editor, /const phoneLabel = xmlValue/);
    assert.doesNotMatch(editor, /const phoneLabel = responseJSONObject[^;]+phoneLabel\[0\]/);
});

test('line defaults use binary call waiting and extension contact', () => {
    const route = fs.readFileSync('src/routes/api/dmod.js', 'utf8');
    assert.match(route, /<callWaiting>1<\/callWaiting>/);
    assert.match(route, /<contact>\$\{escapeXml\(line\.lineName \?\? ""\)\}<\/contact>/);
    const lineEditor = fs.readFileSync('src/public/js/addDevicePopup-registrationImport.js', 'utf8');
    assert.match(lineEditor, /<select id="callWaiting_\$\{selectID\}">/);
    assert.match(lineEditor, /<option value="1"[^>]*>Enabled<\/option>/);
    assert.match(lineEditor, /<option value="0"[^>]*>Disabled<\/option>/);
});

test('8845 model filtering and conditional settings are applied', () => {
    const route = fs.readFileSync('src/routes/api/dmod.js', 'utf8');
    const template = fs.readFileSync('src/routes/api/template.xml', 'utf8');
    assert.match(route, /String\(json\.cust\.deviceModel\) === "6"/);
    for (const element of ['wifi', 'sdio', 'webAdmin', 'cdpEnable', 'outOfRangeAlert', 'scanningMode', 'appButtonTimer', 'appButtonPriority', 'sendKeyAction', 'powerOffWhenCharging', 'homeScreen', 'accessContacts', 'accessFavorites', 'accessVoicemail', 'accessApps']) {
        assert.match(route, new RegExp(`"${element}"`));
    }
    assert.match(route, /phoneSettings\.sshAccess === "0"/);
    assert.match(route, /xmlTemplate\.replace\("<!--versionStamp-->", randomUUID\(\)\)/);
    assert.match(template, /<versionStamp><!--versionStamp--><\/versionStamp>/);
    assert.doesNotMatch(template, /<userLocale>|<networkLocaleInfo>/);
    assert.match(route, /if \(!phoneSettings\.softKeyFile\) phoneSettings\.softkeyControl = ""/);
    assert.match(template, /<softkeyControl><!--softkeyControl--><\/softkeyControl>/);
    assert.doesNotMatch(template, /softKeyControl/);
});

test('XML element filtering removes unsupported model settings', () => {
    const { removeXmlElements } = require('../src/routes/api/configValidation');
    const xml = '<vendorConfig>\n  <wifi>1</wifi>\n  <sdio>1</sdio>\n  <pcPort>0</pcPort>\n</vendorConfig>';
    assert.equal(removeXmlElements(xml, ['wifi', 'sdio']), '<vendorConfig>\n  <pcPort>0</pcPort>\n</vendorConfig>');
});
