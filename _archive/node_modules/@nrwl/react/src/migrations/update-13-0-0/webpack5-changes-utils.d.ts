import { Tree } from '@nrwl/devkit';
import ts = require('typescript');
export declare function migrateToWebPack5(tree: Tree): Promise<void>;
export declare function workspaceHasStorybookForReact(packageJson: any): string | undefined;
export declare function allReactProjectsWithStorybookConfiguration(tree: Tree): {
    projectName: string;
    storybookConfigPath: string;
}[];
export declare function editProjectMainJs(tree: Tree, projectMainJsFile: string, projectName: string): void;
export declare function checkMainJsForOldSyntax(nodeList: ts.Node[], fileContent: string): string | undefined;
export declare function getTsSourceFile(host: Tree, path: string): ts.SourceFile;
