"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateStorybookToWebPack5 = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
const webpack5_changes_utils_1 = require("./webpack5-changes-utils");
let needsInstall = false;
function migrateStorybookToWebPack5(tree) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const packageJson = (0, devkit_1.readJson)(tree, 'package.json');
        if ((0, webpack5_changes_utils_1.workspaceHasStorybookForReact)(packageJson)) {
            (0, devkit_1.updateJson)(tree, 'package.json', (json) => {
                json.dependencies = json.dependencies || {};
                json.devDependencies = json.devDependencies || {};
                if (!json.dependencies['@storybook/builder-webpack5'] &&
                    !json.devDependencies['@storybook/builder-webpack5']) {
                    needsInstall = true;
                    json.devDependencies['@storybook/builder-webpack5'] =
                        (0, webpack5_changes_utils_1.workspaceHasStorybookForReact)(packageJson);
                }
                if (!json.dependencies['@storybook/manager-webpack5'] &&
                    !json.devDependencies['@storybook/manager-webpack5']) {
                    needsInstall = true;
                    json.devDependencies['@storybook/manager-webpack5'] =
                        (0, webpack5_changes_utils_1.workspaceHasStorybookForReact)(packageJson);
                }
                return json;
            });
            yield (0, webpack5_changes_utils_1.migrateToWebPack5)(tree);
            if (needsInstall) {
                devkit_1.logger.info('Please make sure to run npm install or yarn install to get the latest packages added by this migration');
            }
        }
    });
}
exports.migrateStorybookToWebPack5 = migrateStorybookToWebPack5;
exports.default = migrateStorybookToWebPack5;
//# sourceMappingURL=migrate-storybook-to-webpack-5.js.map