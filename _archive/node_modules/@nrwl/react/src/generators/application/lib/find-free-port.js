"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFreePort = void 0;
const devkit_1 = require("@nrwl/devkit");
function findFreePort(host) {
    var _a, _b, _c;
    const projects = (0, devkit_1.getProjects)(host);
    let port = -Infinity;
    for (const [, p] of projects.entries()) {
        const curr = (_c = (_b = (_a = p.targets) === null || _a === void 0 ? void 0 : _a.serve) === null || _b === void 0 ? void 0 : _b.options) === null || _c === void 0 ? void 0 : _c.port;
        if (typeof curr === 'number') {
            port = Math.max(port, curr);
        }
    }
    return port > 0 ? port + 1 : 4200;
}
exports.findFreePort = findFreePort;
//# sourceMappingURL=find-free-port.js.map