"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmotionSetup = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
function updateEmotionSetup(host) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const projects = (0, devkit_1.getProjects)(host);
        projects.forEach((p) => {
            let hasEmotion = false;
            const babelrcPath = `${p.root}/.babelrc`;
            const tsConfigPath = `${p.root}/tsconfig.json`;
            if (host.exists(babelrcPath)) {
                const babelrc = (0, devkit_1.readJson)(host, babelrcPath);
                if (babelrc.presets) {
                    for (const [idx, preset] of babelrc.presets.entries()) {
                        if (Array.isArray(preset)) {
                            if (!preset[0].includes('@nrwl/react/babel'))
                                continue;
                            const emotionOptions = preset[1];
                            hasEmotion = emotionOptions.importSource === '@emotion/react';
                            break;
                        }
                    }
                }
            }
            if (hasEmotion && host.exists(tsConfigPath)) {
                (0, devkit_1.updateJson)(host, tsConfigPath, (json) => {
                    json.compilerOptions.jsxImportSource = '@emotion/react';
                    return json;
                });
            }
        });
        yield (0, devkit_1.formatFiles)(host);
    });
}
exports.updateEmotionSetup = updateEmotionSetup;
exports.default = updateEmotionSetup;
//# sourceMappingURL=update-emotion-setup.js.map