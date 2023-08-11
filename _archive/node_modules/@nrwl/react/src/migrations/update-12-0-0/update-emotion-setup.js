"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmotionSetup = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
function updateEmotionSetup(host) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const projects = (0, devkit_1.getProjects)(host);
        projects.forEach((p) => {
            const babelrcPath = `${p.root}/.babelrc`;
            const oldPreset = '@emotion/babel-preset-css-prop';
            const newPlugin = '@emotion/babel-plugin';
            if (host.exists(babelrcPath)) {
                (0, devkit_1.updateJson)(host, babelrcPath, (json) => {
                    var _a;
                    if (!json.presets)
                        return json;
                    let emotionPresetIdx = -1;
                    let emotionOptions = null;
                    for (const [idx, preset] of json.presets.entries()) {
                        if (Array.isArray(preset)) {
                            if (!preset[0].includes(oldPreset))
                                continue;
                            emotionOptions = preset[1];
                            emotionPresetIdx = idx;
                            break;
                        }
                        else {
                            if (!preset.includes(oldPreset))
                                continue;
                            emotionPresetIdx = idx;
                            break;
                        }
                    }
                    if (emotionPresetIdx !== -1) {
                        // Remove preset
                        json.presets.splice(emotionPresetIdx, 1);
                        // Add new plugin
                        (_a = json.plugins) !== null && _a !== void 0 ? _a : (json.plugins = []);
                        json.plugins.push(emotionOptions ? [newPlugin, emotionOptions] : newPlugin);
                        return json;
                    }
                    else {
                        return json;
                    }
                });
            }
        });
        (0, devkit_1.updateJson)(host, 'package.json', (json) => {
            var _a, _b;
            if ((_a = json.devDependencies) === null || _a === void 0 ? void 0 : _a['@emotion/babel-preset-css-prop']) {
                delete json.devDependencies['@emotion/babel-preset-css-prop'];
                json.devDependencies['@emotion/babel-plugin'] = '11.2.0';
            }
            // Just in case someone moved it to `dependencies`
            else if ((_b = json.dependencies) === null || _b === void 0 ? void 0 : _b['@emotion/babel-preset-css-prop']) {
                delete json.dependencies['@emotion/babel-preset-css-prop'];
                json.dependencies['@emotion/babel-plugin'] = '11.2.0';
            }
            return json;
        });
        yield (0, devkit_1.formatFiles)(host);
    });
}
exports.updateEmotionSetup = updateEmotionSetup;
exports.default = updateEmotionSetup;
//# sourceMappingURL=update-emotion-setup.js.map