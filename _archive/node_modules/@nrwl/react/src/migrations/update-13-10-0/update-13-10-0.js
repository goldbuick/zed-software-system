"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateToReact18 = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
// Putting this here because React Native 0.67 is incompatible with React 18.
// Waiting for 0.68 to come out with support for React 18.
// TODO(jack): For Nx 14 let's add another migration for React 18 in migrations.json because by then React Native 0.68.0 should be released.
function updateToReact18(host) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { dependencies } = (0, devkit_1.readJson)(host, 'package.json');
        if (dependencies['react-native'] &&
            !dependencies['react-native'].match(/[\^~]?0.68/)) {
            devkit_1.logger.info(`React Native ${dependencies['react-native']} is incompatible with React 18. Skipping update until React Native 0.68.0 is released.`);
        }
        else {
            return (0, devkit_1.addDependenciesToPackageJson)(host, {
                react: '18.0.0',
                'react-dom': '18.0.0',
                'react-is': '18.0.0',
            }, {
                'react-test-renderer': '18.0.0',
            });
        }
    });
}
exports.updateToReact18 = updateToReact18;
exports.default = updateToReact18;
//# sourceMappingURL=update-13-10-0.js.map