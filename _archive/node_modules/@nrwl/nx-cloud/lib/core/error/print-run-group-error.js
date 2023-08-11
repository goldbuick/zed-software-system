"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printRunGroupError = void 0;
const { output } = require('../../utilities/nx-imports');
function printRunGroupError() {
    output.error({
        title: `Unable to determine NX_RUN_GROUP`,
        bodyLines: [
            '- Agents run tasks for a given run group (which often corresponds to a run in CI).',
            "- Nx tried to determine the run group automatically but wasn't able to do it.",
            '- Use the NX_RUN_GROUP env variable to set the run group manually.',
        ],
    });
}
exports.printRunGroupError = printRunGroupError;
//# sourceMappingURL=print-run-group-error.js.map