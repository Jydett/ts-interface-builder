import { NodePath, types } from "@babel/core";
export declare function getGetArgValue(callPath: NodePath<types.CallExpression>, callDescription: string): (argIndex: number) => any;
