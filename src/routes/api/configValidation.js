const net = require('net');

const CAPF_AUTH_MODES = new Set(['1', '2', '3']);
const BOOLEAN_VALUES = new Set(['true', 'false']);
const CPA_KEYS = new Set(['dateTemplate', 'timeZone', 'ntpName', 'ntpMode', 'sipPort', 'phoneLabel', 'disableSpeakerphone', 'disableSpeakerphoneAndHeadset', 'enableMuteFeature', 'voipControlPort']);
const CPA_BOOLEAN_KEYS = new Set(['disableSpeakerphone', 'disableSpeakerphoneAndHeadset', 'enableMuteFeature']);
const PORT_KEYS = new Set(['sipPort', 'voipControlPort']);

function isBlank(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validateScalar(value, label) {
    if (!['string', 'number', 'boolean'].includes(typeof value)) return `${label} must be a string, number, boolean, or blank.`;
    const text = String(value);
    if (text.length > 2048) return `${label} must not exceed 2048 characters.`;
    if (/[^\t\r\n\x20-\uD7FF\uE000-\uFFFD]/u.test(text)) return `${label} contains characters that are not valid in XML.`;
    return null;
}

function cleanObject(input, allowedKeys, label) {
    if (input === undefined || input === null) return { value: {} };
    if (typeof input !== 'object' || Array.isArray(input)) return { error: `${label} must be a JSON object.` };
    const value = {};
    for (const [key, candidate] of Object.entries(input)) {
        if (isBlank(candidate)) continue;
        if (allowedKeys && !allowedKeys.has(key)) return { error: `${label}.${key} is not a supported setting.` };
        const error = validateScalar(candidate, `${label}.${key}`);
        if (error) return { error };
        value[key] = String(candidate).trim();
    }
    return { value };
}

function validateCommonProvisioning(input) {
    const result = cleanObject(input, CPA_KEYS, 'cpa');
    if (result.error) return result;
    for (const key of PORT_KEYS) {
        if (result.value[key] !== undefined && (!/^\d+$/.test(result.value[key]) || Number(result.value[key]) < 1 || Number(result.value[key]) > 65535)) {
            return { error: `cpa.${key} must be an integer from 1 to 65535.` };
        }
    }
    if (result.value.ntpMode !== undefined && !['unicast', 'directedbroadcast', 'broadcast', 'multicast', 'anycast'].includes(result.value.ntpMode)) return { error: 'cpa.ntpMode is not supported.' };
    for (const key of CPA_BOOLEAN_KEYS) if (result.value[key] !== undefined && !BOOLEAN_VALUES.has(result.value[key])) return { error: `cpa.${key} must be true or false.` };
    return result;
}

function validatePhoneSettings(input, defaults) {
    const result = cleanObject(input, new Set(Object.keys(defaults)), 'phoneSettings');
    if (result.error) return result;
    for (const [key, value] of Object.entries(result.value)) {
        const defaultValue = defaults[key];
        if (key === 'capfAuthMode' && !CAPF_AUTH_MODES.has(value)) return { error: 'phoneSettings.capfAuthMode must be one of the supported values: 1, 2, or 3.' };
        if (BOOLEAN_VALUES.has(defaultValue) && !BOOLEAN_VALUES.has(value)) return { error: `phoneSettings.${key} must be true or false.` };
        if (/^-?\d+$/.test(defaultValue) && !/^-?\d+$/.test(value)) return { error: `phoneSettings.${key} must be an integer.` };
    }
    return result;
}

function validateTemplatePayload(body, defaults) {
    const cpa = validateCommonProvisioning(body.cpa);
    if (cpa.error) return cpa;
    const phoneSettings = validatePhoneSettings(body.phoneSettings, defaults);
    if (phoneSettings.error) return phoneSettings;
    const pbxServerIP = String(body.pbxServerIP || '').trim();
    if (pbxServerIP && !net.isIP(pbxServerIP)) return { error: 'PBX server IP must be a valid IPv4 or IPv6 address when provided.' };
    return { value: { cpa: cpa.value, phoneSettings: phoneSettings.value, pbxServerIP } };
}

function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function removeXmlElements(xml, elementNames) {
    for (const name of elementNames) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        xml = xml.replace(new RegExp(`^[ \\t]*<${escapedName}(?:\\s[^>]*)?>[^<]*</${escapedName}>[ \\t]*\\r?\\n?`, 'gm'), '');
    }
    return xml;
}

function replaceOptionalXmlPlaceholders(xml, values) {
    for (const [key, candidate] of Object.entries(values)) {
        const placeholder = `<!--${key}-->`;
        if (isBlank(candidate)) {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            xml = xml.replace(new RegExp(`^[ \\t]*<([A-Za-z][\\w:.-]*)>\\s*<!--${escapedKey}-->\\s*</\\1>\\s*\\r?\\n?`, 'gm'), '');
        } else {
            xml = xml.split(placeholder).join(escapeXml(candidate));
        }
    }
    return xml;
}

module.exports = { CAPF_AUTH_MODES, cleanObject, escapeXml, removeXmlElements, replaceOptionalXmlPlaceholders, validateCommonProvisioning, validatePhoneSettings, validateTemplatePayload };
