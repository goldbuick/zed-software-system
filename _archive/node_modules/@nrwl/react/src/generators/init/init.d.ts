import { GeneratorCallback, Tree } from '@nrwl/devkit';
import { InitSchema } from './schema';
export declare function reactInitGenerator(host: Tree, schema: InitSchema): Promise<GeneratorCallback>;
export default reactInitGenerator;
export declare const reactInitSchematic: (generatorOptions: InitSchema) => (tree: any, context: any) => Promise<any>;
