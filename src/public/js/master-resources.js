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
    row.innerHTML = '<label>Match<input class="dialMatch" placeholder="3.." required></label><label>Timeout<input class="dialTimeout" type="number" min="0" max="60" value="5"></label><label>Rewrite<input class="dialRewrite" placeholder="Optional"></label><label>Line<input class="dialLine" type="number" min="1" placeholder="All"></label><button type="button" class="removeDialRule"><i class="icmn-bin"></i> Remove</button>';
    row.querySelector('.dialMatch').value = rule.match || '';
    row.querySelector('.dialTimeout').value = rule.timeout ?? '5';
    row.querySelector('.dialRewrite').value = rule.rewrite || '';
    row.querySelector('.dialLine').value = rule.line || '';
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
        documentXml.querySelectorAll('TEMPLATE').forEach((template) => addDialRule({ match: template.getAttribute('match'), timeout: template.getAttribute('timeout'), rewrite: template.getAttribute('rewrite'), line: template.getAttribute('line') }));
        if (!dialRuleRows.children.length) addDialRule();
        document.getElementById('appDialRulesXml').value = await loadXmlResource('AppDialRules');
    } catch (error) {
        document.getElementById('dialTemplateStatus').textContent = error.message;
    }
}

document.getElementById('addDialRule').addEventListener('click', () => addDialRule());
document.getElementById('saveDialTemplate').addEventListener('click', () => {
    const rules = Array.from(dialRuleRows.children).map((row) => {
        const attributes = [`match="${escapeXmlAttribute(row.querySelector('.dialMatch').value)}"`, `timeout="${escapeXmlAttribute(row.querySelector('.dialTimeout').value)}"`];
        if (row.querySelector('.dialRewrite').value) attributes.push(`rewrite="${escapeXmlAttribute(row.querySelector('.dialRewrite').value)}"`);
        if (row.querySelector('.dialLine').value) attributes.push(`line="${escapeXmlAttribute(row.querySelector('.dialLine').value)}"`);
        return `  <TEMPLATE ${attributes.join(' ')}/>`;
    });
    saveXmlResource('DialTemplate', `<?xml version="1.0" encoding="UTF-8"?>\n<dialTemplate>\n${rules.join('\n')}\n</dialTemplate>\n`, document.getElementById('dialTemplateStatus'));
});
document.getElementById('saveAppDialRules').addEventListener('click', () => saveXmlResource('AppDialRules', document.getElementById('appDialRulesXml').value, document.getElementById('appDialRulesStatus')));
initializeDialResources();
