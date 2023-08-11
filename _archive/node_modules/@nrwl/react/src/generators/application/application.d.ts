import { Schema } from './schema';
import { GeneratorCallback, Tree } from '@nrwl/devkit';
export declare function applicationGenerator(host: Tree, schema: Schema): Promise<GeneratorCallback>;
export default applicationGenerator;
export declare const applicationSchematic: (generatorOptions: Schema) => (tree: any, context: any) => Promise<any>;
