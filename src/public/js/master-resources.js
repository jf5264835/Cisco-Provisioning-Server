const wallpaperGrid = document.getElementById('wallpaperGrid');
const wallpaperForm = document.getElementById('wallpaperForm');
const wallpaperStatus = document.getElementById('wallpaperStatus');
const ringtoneGrid = document.getElementById('ringtoneGrid');
const ringtoneForm = document.getElementById('ringtoneForm');
const ringtoneStatus = document.getElementById('ringtoneStatus');
const dialRuleRows = document.getElementById('dialRuleRows');

function setWallpaperStatus(message, isError = false) {
    wallpaperStatus.innerText = message || '';
    wallpaperStatus.classList.toggle('error', isError);
}

function setRingtoneStatus(message, isError = false) {
    ringtoneStatus.innerText = message || '';
    ringtoneStatus.classList.toggle('error', isError);
}

function wallpaperCard(background) {
    const card = document.createElement('article');
    card.className = 'resourceCard wallpaperCard';

    const image = document.createElement('img');
    image.src = background.thumbnailUrl;
    image.alt = background.name;
    image.loading = 'lazy';

    const name = document.createElement('h3');
    name.innerText = background.name;

    const meta = document.createElement('p');
    meta.innerText = background.resolution;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const open = document.createElement('a');
    open.href = background.imageUrl;
    open.target = '_blank';
    open.innerHTML = '<i class="icmn-image2"></i> Open';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.innerHTML = '<i class="icmn-bin"></i> Delete';
    remove.addEventListener('click', () => deleteWallpaper(background.uuid));

    actions.append(open, remove);
    card.append(image, name, meta, actions);
    return card;
}

function ringtoneCard(ringtone) {
    const card = document.createElement('article');
    card.className = 'resourceCard ringtoneCard';

    const icon = document.createElement('div');
    icon.className = 'resourceIcon';
    icon.innerHTML = '<i class="icmn-music"></i>';

    const name = document.createElement('h3');
    name.innerText = ringtone.displayName || ringtone.name;

    const meta = document.createElement('p');
    const source = ringtone.convertedFrom ? `converted from ${ringtone.convertedFrom.toUpperCase()}` : 'direct upload';
    meta.innerText = `${ringtone.type === 'wideband' ? '8800 wideband' : 'Classic narrowband'} · ${source} · ${ringtone.fileName}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const open = document.createElement('a');
    open.href = ringtone.fileUrl;
    open.target = '_blank';
    open.innerHTML = '<i class="icmn-file-music"></i> Open';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.innerHTML = '<i class="icmn-bin"></i> Delete';
    remove.addEventListener('click', () => deleteRingtone(ringtone.uuid));

    actions.append(open, remove);
    card.append(icon, name, meta, actions);
    return card;
}

async function loadWallpapers() {
    setWallpaperStatus('Loading wallpapers...');
    wallpaperGrid.innerHTML = '';

    try {
        const response = await fetch('/api/backgrounds');
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to load wallpapers.');
        }

        if (payload.backgrounds.length === 0) {
            setWallpaperStatus('No wallpapers uploaded yet.');
            return;
        }

        setWallpaperStatus('');
        payload.backgrounds.forEach((background) => {
            wallpaperGrid.appendChild(wallpaperCard(background));
        });
    } catch (error) {
        setWallpaperStatus(error.message, true);
    }
}

async function deleteWallpaper(uuid) {
    if (!confirm('Delete this wallpaper?')) return;

    try {
        const response = await fetch(`/api/backgrounds/${uuid}`, { method: 'DELETE' });
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to delete wallpaper.');
        }

        await loadWallpapers();
    } catch (error) {
        setWallpaperStatus(error.message, true);
    }
}

async function loadRingtones() {
    setRingtoneStatus('Loading ringtones...');
    ringtoneGrid.innerHTML = '';

    try {
        const response = await fetch('/api/ringtones');
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to load ringtones.');
        }

        if (payload.ringtones.length === 0) {
            setRingtoneStatus('No ringtones uploaded yet.');
            return;
        }

        setRingtoneStatus('');
        payload.ringtones.forEach((ringtone) => {
            ringtoneGrid.appendChild(ringtoneCard(ringtone));
        });
    } catch (error) {
        setRingtoneStatus(error.message, true);
    }
}

async function deleteRingtone(uuid) {
    if (!confirm('Delete this ringtone?')) return;

    try {
        const response = await fetch(`/api/ringtones/${uuid}`, { method: 'DELETE' });
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to delete ringtone.');
        }

        await loadRingtones();
    } catch (error) {
        setRingtoneStatus(error.message, true);
    }
}

wallpaperForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setWallpaperStatus('Uploading wallpaper...');

    try {
        const formData = new FormData(wallpaperForm);
        const response = await fetch('/api/backgrounds', {
            method: 'POST',
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to upload wallpaper.');
        }

        wallpaperForm.reset();
        await loadWallpapers();
    } catch (error) {
        setWallpaperStatus(error.message, true);
    }
});

ringtoneForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setRingtoneStatus('Uploading ringtone...');

    try {
        const formData = new FormData(ringtoneForm);
        const response = await fetch('/api/ringtones', {
            method: 'POST',
            body: formData,
        });
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
            throw new Error(payload.message || 'Unable to upload ringtone.');
        }

        ringtoneForm.reset();
        await loadRingtones();
    } catch (error) {
        setRingtoneStatus(error.message, true);
    }
});

loadWallpapers();
loadRingtones();

function escapeXmlAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addDialRule(rule = {}) {
    const row = document.createElement('div');
    row.className = 'dialRuleRow';
    row.innerHTML = '<label><span>Common rule</span><select class="dialPreset"><option value="">Custom</option><option value="911|0">Emergency 911</option><option value="933|0">Emergency test 933</option><option value="\\*97|0">Voicemail *97</option><option value="\\*98|0">Voicemail login *98</option><option value="...|1">3-digit extensions</option><option value="....|1">4-digit extensions</option><option value=".......|1">7-digit local</option><option value="..........|1">10-digit NANP</option><option value="1..........|1">11-digit NANP</option><option value="*|3">Catch-all</option></select></label><label><span>Match pattern</span><input class="dialMatch" placeholder="3.." required></label><label><span>Timeout</span><input class="dialTimeout" type="number" min="0" max="60" value="5"></label><label><span>Rewrite</span><input class="dialRewrite" placeholder="Optional"></label><label><span>Line</span><input class="dialLine" type="number" min="1" placeholder="All"></label><button type="button" class="removeDialRule"><i class="icmn-bin"></i> Remove</button>';
    row.querySelector('.dialMatch').value = rule.match || '';
    row.querySelector('.dialTimeout').value = rule.timeout ?? '5';
    row.querySelector('.dialRewrite').value = rule.rewrite || '';
    row.querySelector('.dialLine').value = rule.line || '';
    const presetValue = `${rule.match || ''}|${rule.timeout ?? '5'}`;
    if (Array.from(row.querySelector('.dialPreset').options).some((option) => option.value === presetValue)) row.querySelector('.dialPreset').value = presetValue;
    row.querySelector('.dialPreset').addEventListener('change', (event) => {
        if (!event.target.value) return;
        const separator = event.target.value.lastIndexOf('|');
        row.querySelector('.dialMatch').value = event.target.value.slice(0, separator);
        row.querySelector('.dialTimeout').value = event.target.value.slice(separator + 1);
    });
    row.querySelector('.removeDialRule').addEventListener('click', () => row.remove());
    dialRuleRows.appendChild(row);
}

async function loadXmlResource(name) {
    const response = await fetch(`/api/static-resources/${name}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message);
    return payload.xml;
}

async function saveXmlResource(name, xml, statusElement) {
    statusElement.textContent = 'Validating and saving...';
    const response = await fetch(`/api/static-resources/${name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ xml }) });
    const payload = await response.json();
    statusElement.textContent = payload.message;
    statusElement.classList.toggle('error', !response.ok);
}

async function initializeDialResources() {
    try {
        const dialXml = await loadXmlResource('DialTemplate');
        const documentXml = new DOMParser().parseFromString(dialXml, 'application/xml');
        document.getElementById('dialVersionStamp').value = documentXml.querySelector('versionStamp')?.textContent || '';
        documentXml.querySelectorAll('TEMPLATE').forEach((template) => addDialRule({ match: template.getAttribute('match'), timeout: template.getAttribute('timeout'), rewrite: template.getAttribute('rewrite'), line: template.getAttribute('line') }));
        if (!dialRuleRows.children.length) addDialRule();
        document.getElementById('appDialRulesXml').value = await loadXmlResource('AppDialRules');
    } catch (error) {
        document.getElementById('dialTemplateStatus').textContent = error.message;
    }
}

document.getElementById('addDialRule').addEventListener('click', () => addDialRule());
document.getElementById('generateVersionStamp').addEventListener('click', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    document.getElementById('dialVersionStamp').value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
});
document.getElementById('saveDialTemplate').addEventListener('click', () => {
    const rules = Array.from(dialRuleRows.children).map((row) => {
        const attributes = [`match="${escapeXmlAttribute(row.querySelector('.dialMatch').value)}"`, `timeout="${escapeXmlAttribute(row.querySelector('.dialTimeout').value)}"`];
        if (row.querySelector('.dialRewrite').value) attributes.push(`rewrite="${escapeXmlAttribute(row.querySelector('.dialRewrite').value)}"`);
        if (row.querySelector('.dialLine').value) attributes.push(`line="${escapeXmlAttribute(row.querySelector('.dialLine').value)}"`);
        return `  <TEMPLATE ${attributes.join(' ')}/>`;
    });
    const versionStamp = escapeXmlAttribute(document.getElementById('dialVersionStamp').value.trim());
    saveXmlResource('DialTemplate', `<?xml version="1.0" encoding="UTF-8"?>\n<dialTemplate>\n  <versionStamp>${versionStamp}</versionStamp>\n${rules.join('\n')}\n</dialTemplate>\n`, document.getElementById('dialTemplateStatus'));
});
document.getElementById('saveAppDialRules').addEventListener('click', () => saveXmlResource('AppDialRules', document.getElementById('appDialRulesXml').value, document.getElementById('appDialRulesStatus')));
initializeDialResources();

document.querySelectorAll('[data-resource-tab]').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('[data-resource-tab]').forEach((candidate) => candidate.classList.toggle('active', candidate === tab));
    document.querySelectorAll('[data-resource-panel]').forEach((panel) => { panel.hidden = panel.id !== tab.dataset.resourceTab; });
}));
