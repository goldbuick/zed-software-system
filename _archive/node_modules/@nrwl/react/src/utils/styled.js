"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSS_IN_JS_DEPENDENCIES = void 0;
const versions_1 = require("./versions");
exports.CSS_IN_JS_DEPENDENCIES = {
    'styled-components': {
        dependencies: {
            'react-is': versions_1.reactIsVersion,
            'styled-components': versions_1.styledComponentsVersion,
        },
        devDependencies: {
            '@types/styled-components': versions_1.typesStyledComponentsVersion,
            '@types/react-is': versions_1.typesReactIsVersion,
            'babel-plugin-styled-components': versions_1.babelPluginStyledComponentsVersion,
        },
    },
    '@emotion/styled': {
        dependencies: {
            '@emotion/styled': versions_1.emotionStyledVersion,
            '@emotion/react': versions_1.emotionReactVersion,
        },
        devDependencies: {
            '@emotion/babel-plugin': versions_1.emotionBabelPlugin,
        },
    },
    'styled-jsx': {
        dependencies: {
            'styled-jsx': versions_1.styledJsxVersion,
        },
        devDependencies: {},
    },
};
//# sourceMappingURL=styled.js.map