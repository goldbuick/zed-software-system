"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeReactReduxTypesFromPackageJson = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
function removeReactReduxTypesFromPackageJson(host) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return (0, devkit_1.removeDependenciesFromPackageJson)(host, ['@types/react-redux'], ['@types/react-redux']);
    });
}
exports.removeReactReduxTypesFromPackageJson = removeReactReduxTypesFromPackageJson;
exports.default = removeReactReduxTypesFromPackageJson;
//# sourceMappingURL=remove-react-redux-types-package.js.map