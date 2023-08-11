import { Tree } from '@nrwl/devkit';
import { Schema } from './schema';
export declare function hookGenerator(host: Tree, schema: Schema): Promise<void>;
export default hookGenerator;
export declare const hookSchematic: (generatorOptions: Schema) => (tree: any, context: any) => Promise<any>;
