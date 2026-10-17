const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/data.js', 'utf8').replaceAll('export ', '');
const context = vm.createContext({ Intl });
vm.runInContext(source + '\nglobalThis.testData = { initialRoutes, filterRoutes, vehicles, money, palettes };', context);
const { initialRoutes, filterRoutes, vehicles, money } = context.testData;
assert.equal(filterRoutes(initialRoutes, 'cordoba', 'all').length, 2);
assert.equal(filterRoutes(initialRoutes, '  CÓRDOBA ', 'active').length, 1);
assert.equal(filterRoutes(initialRoutes, '', 'inactive').length, 1);
assert.equal(filterRoutes(initialRoutes, 'inexistente', 'all').length, 0);
assert.equal(new Set(initialRoutes.map(r => r.id)).size, initialRoutes.length);
assert(vehicles.every(v => v.seats % 4 === 0));
assert(money(32500).includes('32.500'));
assert(fs.existsSync(__dirname + '/prototype.js'));
const { palettes } = context.testData;
const css = fs.readFileSync(__dirname + '/palettes.css', 'utf8');
function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
assert.equal(new Set(palettes.map(p => p.id)).size, 4);
for (const p of palettes) {
  assert(css.includes(`[data-palette="${p.id}"]`));
  assert(1.05 / (luminance(p.primary) + .05) >= 4.5, p.name + ': white on primary');
  assert((luminance(p.accent) + .05) / (luminance(p.ink) + .05) >= 4.5, p.name + ': active navigation');
}
console.log('Prototype checks passed: route filters, data, currency, bundled output.');
console.log('Four palettes checked: CSS selectors, primary and active navigation contrast.');
