const path = require('path');
const { execFileSync } = require('child_process');

function normalizeVersion(value) {
    const version = String(value || '').trim();
    if (/^[0-9a-f]{40}$/i.test(version)) return `git-${version.slice(0, 12)}`;
    return version;
}

function getApplicationVersion() {
    const buildVersion = normalizeVersion(process.env.APP_VERSION);
    if (buildVersion) return buildVersion;

    try {
        const repositoryRoot = path.join(__dirname, '../..');
        const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
            cwd: repositoryRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        });
        return `git-${commit.trim()}`;
    } catch {
        return require('../../package.json').version;
    }
}

module.exports = { getApplicationVersion, normalizeVersion };
