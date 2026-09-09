/* eslint-env node */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const gamepad = require('../src/control/gamepad/logic');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const buttons = (pressed) => Array.apply(null, Array(18)).map((unused, index) => ({
  pressed: pressed.indexOf(index) !== -1,
  value: pressed.indexOf(index) !== -1 ? 1 : 0,
}));
const pad = (pressed, axes) => ({
  buttons: buttons(pressed || []),
  axes: axes || [0, 0],
});

const mapping = gamepad.readGamepad(pad([14, 13, 0, 4, 9]));
assert.strictEqual(mapping.left, true, 'D-pad left maps to move left');
assert.strictEqual(mapping.down, true, 'D-pad down maps to soft drop');
assert.strictEqual(mapping.rotate, true, 'A maps to clockwise rotation');
assert.strictEqual(mapping.drop, true, 'shoulder maps to hard drop');
assert.strictEqual(mapping.pause, true, 'Start maps to pause');
assert.strictEqual(gamepad.readGamepad(pad([1])).rotate, true, 'B maps to clockwise rotation');
assert.strictEqual(gamepad.readGamepad(pad([2])).drop, true, 'X maps to hard drop');
assert.strictEqual(gamepad.readGamepad(pad([3])).drop, true, 'Y maps to hard drop');
assert.strictEqual(gamepad.readGamepad(pad([], [-0.8, 0])).left, true, 'left stick maps left');
assert.strictEqual(gamepad.readGamepad(pad([], [0.8, 0])).right, true, 'left stick maps right');
assert.strictEqual(gamepad.readGamepad(pad([], [0, -0.8])).rotate, true, 'stick up rotates');
assert.strictEqual(gamepad.readGamepad(pad([], [0, 0.8])).down, true, 'stick down soft drops');
assert.strictEqual(gamepad.readGamepad(pad([14, 15])).left, false, 'opposite directions cancel');
assert.strictEqual(gamepad.readGamepad(pad([14, 15])).right, false, 'opposite directions cancel');

let state = gamepad.createControlState();
let step = gamepad.advanceControl(state, gamepad.readGamepad(pad([14, 0, 2, 9])), 0);
assert.deepStrictEqual(step.actions, ['left', 'rotate', 'drop', 'pause'], 'initial presses fire once');
state = step.state;
step = gamepad.advanceControl(state, gamepad.readGamepad(pad([14, 0, 2, 9])), 100);
assert.deepStrictEqual(step.actions, [], 'held one-shot buttons do not repeat');
state = step.state;
step = gamepad.advanceControl(state, gamepad.readGamepad(pad([14, 0, 2, 9])), 180);
assert.deepStrictEqual(step.actions, ['left'], 'held horizontal input repeats after its delay');
state = step.state;
step = gamepad.advanceControl(state, gamepad.readGamepad(pad([14, 0, 2, 9])), 1000);
assert.deepStrictEqual(step.actions, ['left'], 'late frames emit one repeat, not an action flood');
state = gamepad.advanceControl(step.state, gamepad.emptyPressed(), 1010).state;
step = gamepad.advanceControl(state, gamepad.readGamepad(pad([0, 2, 9])), 1020);
assert.deepStrictEqual(step.actions, ['rotate', 'drop', 'pause'], 'one-shot actions re-arm after release');

const manifest = JSON.parse(read('src/resource/pwa/manifest.json'));
assert.strictEqual(manifest.start_url, './');
assert.strictEqual(manifest.scope, './');
assert.strictEqual(manifest.display, 'standalone');

const pngSize = (file) => {
  const data = fs.readFileSync(path.join(root, file));
  assert.strictEqual(data.toString('ascii', 1, 4), 'PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};
manifest.icons.forEach(icon => {
  const file = `src/resource/pwa/${icon.src.replace('./', '')}`;
  const expected = icon.sizes.split('x').map(Number);
  assert.deepStrictEqual(pngSize(file), expected, `${file} dimensions match manifest`);
});

const workerSource = read('src/resource/pwa/service-worker.js');
new vm.Script(workerSource, { filename: 'service-worker.js' });
const assetsSource = workerSource.match(/var STATIC_ASSETS = (\[[\s\S]*?\]);/);
assert(assetsSource, 'service worker has an explicit static asset list');
const staticAssets = vm.runInNewContext(assetsSource[1]);
const outputNames = {
  './app-1.0.1.js': true,
  './css-1.0.1.css': true,
  './index.html': true,
};
staticAssets.forEach(asset => {
  assert(asset.indexOf('./') === 0, `${asset} is same-origin and scope-relative`);
  const builtName = asset === './' ? 'index.html' : asset.slice(2);
  assert(fs.existsSync(path.join(root, 'docs', builtName)), `${asset} exists in the production build`);
  if (asset === './' || outputNames[asset]) {
    return;
  }
  const name = asset.slice(2);
  const source = name === 'icon.png' ? `src/resource/image/icon.png` :
    (name === 'music.mp3' ? `src/resource/music/${name}` :
      (name === 'loader.css' ? `src/resource/css/${name}` : `src/resource/pwa/${name}`));
  assert(fs.existsSync(path.join(root, source)), `${asset} has a source asset`);
});
assert(read('docs/css-1.0.1.css').indexOf('icon.png') !== -1,
  'production CSS loads the local handheld sprite');
['docs/index.html', 'docs/css-1.0.1.css', 'docs/app-1.0.1.js'].forEach(file => {
  const source = read(file);
  assert(source.indexOf('img.alicdn.com') === -1, `${file} does not use Ali CDN assets`);
  assert(source.indexOf('ghbtns.com') === -1, `${file} does not embed external GitHub assets`);
});
assert(workerSource.indexOf("event.request.method !== 'GET'") !== -1,
  'service worker never intercepts mutation requests');
assert(workerSource.indexOf("LEGACY_CACHE_PREFIX = 'tetris-v'") !== -1,
  'service worker removes the previous deployment cache');
assert(workerSource.indexOf("event.request.mode === 'navigate'") !== -1,
  'navigations use a network-first offline fallback');

const template = read('server/index.tmpl.html');
assert(template.indexOf('rel="manifest" href="./manifest.json"') !== -1,
  'HTML links the manifest');
assert(read('src/index.js').indexOf("register('./service-worker.js')") !== -1,
  'application registers the root-scoped service worker');
assert(read('src/control/index.js').indexOf("32: 'space'") !== -1,
  'Space remains mapped to hard drop');

const runtimeFiles = [
  'server/index.tmpl.html',
  'src/containers/index.less',
  'src/components/guide/index.js',
];
runtimeFiles.forEach(file => {
  const source = read(file);
  assert(!/(?:src|href)=["']\/\//.test(source), `${file} has no protocol-relative asset`);
  assert(!/(?:src)=["']https?:/.test(source), `${file} has no external runtime asset`);
  assert(!/url\(["']?(?:https?:)?\/\//.test(source), `${file} has no external CSS asset`);
});
assert(read('src/containers/index.less').indexOf("url('../resource/image/icon.png')") !== -1,
  'handheld sprite is served locally');
assert(read('README.md').indexOf('personal-use adaptation') !== -1,
  'README documents the personal adaptation');
assert(fs.existsSync(path.join(root, 'LICENSE')), 'Apache-2.0 license exists');
assert(fs.existsSync(path.join(root, 'docs', 'LICENSE')), 'production build includes the license');
assert.strictEqual(read('docs/sw.js'), read('docs/service-worker.js'),
  'legacy worker URL upgrades existing installed clients');

console.log('All controller and PWA tests passed.');
