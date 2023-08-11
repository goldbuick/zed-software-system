"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobPatternsForDependencies = void 0;
const generate_globs_1 = require("@nrwl/workspace/src/utilities/generate-globs");
/**
 * Generates a set of glob patterns based off the source root of the app and its dependencies
 * @param dirPath workspace relative directory path that will be used to infer the parent project and dependencies
 * @param fileGlobPattern pass a custom glob pattern to be used
 */
function createGlobPatternsForDependencies(dirPath, fileGlobPattern = '/**/!(*.stories|*.spec).{tsx,jsx,js,html}') {
    try {
        return (0, generate_globs_1.createGlobPatternsForDependencies)(dirPath, fileGlobPattern);
    }
    catch (_a) {
        /**
         * It should not be possible to reach this point when the utility is invoked as part of the normal
         * lifecycle of Nx executors. However, other tooling, such as the VSCode Tailwind IntelliSense plugin
         * or JetBrains editors such as WebStorm, may execute the tailwind.config.js file in order to provide
         * autocomplete features, for example.
         *
         * In order to best support that use-case, we therefore do not hard error when the ProjectGraph is
         * fundamently unavailable in this tailwind-specific context.
         */
        console.warn('\n[createGlobPatternsForDependencies] WARNING: There was no ProjectGraph available to read from, returning an empty array of glob patterns\n');
        return [];
    }
}
exports.createGlobPatternsForDependencies = createGlobPatternsForDependencies;
//# sourceMappingURL=tailwind.js.map