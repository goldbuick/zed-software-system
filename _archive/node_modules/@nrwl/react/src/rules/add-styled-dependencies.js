"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStyledModuleDependencies = void 0;
const styled_1 = require("../utils/styled");
const devkit_1 = require("@nrwl/devkit");
function addStyledModuleDependencies(host, styledModule) {
    const extraDependencies = styled_1.CSS_IN_JS_DEPENDENCIES[styledModule];
    if (extraDependencies) {
        return (0, devkit_1.addDependenciesToPackageJson)(host, extraDependencies.dependencies, extraDependencies.devDependencies);
    }
    else {
        return () => { };
    }
}
exports.addStyledModuleDependencies = addStyledModuleDependencies;
//# sourceMappingURL=add-styled-dependencies.js.map