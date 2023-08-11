"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateModuleFederationE2eProject = void 0;
const devkit_1 = require("@nrwl/devkit");
function updateModuleFederationE2eProject(host, options) {
    try {
        let projectConfig = (0, devkit_1.readProjectConfiguration)(host, options.e2eProjectName);
        projectConfig.targets.e2e.options = Object.assign(Object.assign({}, projectConfig.targets.e2e.options), { baseUrl: `http://localhost:${options.devServerPort}` });
        (0, devkit_1.updateProjectConfiguration)(host, options.e2eProjectName, projectConfig);
    }
    catch (_a) {
        // nothing
    }
}
exports.updateModuleFederationE2eProject = updateModuleFederationE2eProject;
//# sourceMappingURL=update-module-federation-e2e-project.js.map