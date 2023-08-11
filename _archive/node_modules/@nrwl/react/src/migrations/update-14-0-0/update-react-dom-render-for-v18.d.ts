import { StringChange, Tree } from '@nrwl/devkit';
import * as ts from 'typescript';
export declare function update(tree: Tree): Promise<void>;
export declare function migrateReactDomRender(sourcePath: string, source: ts.SourceFile): StringChange[];
export default update;
