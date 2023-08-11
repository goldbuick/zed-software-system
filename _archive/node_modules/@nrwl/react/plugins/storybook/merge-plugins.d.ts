import { ResolvePluginInstance, RuleSetRule, WebpackPluginInstance } from 'webpack';
export declare const mergeRules: (...args: RuleSetRule[]) => (RuleSetRule | WebpackPluginInstance)[];
export declare const mergePlugins: (...args: (WebpackPluginInstance | ResolvePluginInstance)[]) => (WebpackPluginInstance | ResolvePluginInstance)[];
