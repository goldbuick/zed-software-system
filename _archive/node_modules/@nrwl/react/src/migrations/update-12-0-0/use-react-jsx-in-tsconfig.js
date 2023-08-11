"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReactJsxInTsconfig = void 0;
const tslib_1 = require("tslib");
const devkit_1 = require("@nrwl/devkit");
function useReactJsxInTsconfig(host) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const projects = (0, devkit_1.getProjects)(host);
        projects.forEach((p) => {
            const tsConfigPath = `${p.root}/tsconfig.json`;
            if (host.exists(tsConfigPath)) {
                (0, devkit_1.updateJson)(host, tsConfigPath, (json) => {
                    var _a;
                    if (((_a = json.compilerOptions) === null || _a === void 0 ? void 0 : _a.jsx) === 'react') {
                        // JSX is handled by babel
                        json.compilerOptions.jsx = 'react-jsx';
                    }
                    return json;
                });
            }
        });
        yield (0, devkit_1.formatFiles)(host);
    });
}
exports.useReactJsxInTsconfig = useReactJsxInTsconfig;
exports.default = useReactJsxInTsconfig;
//# sourceMappingURL=use-react-jsx-in-tsconfig.js.map