import { References } from "babel-plugin-macros";
import { NodePath, types } from "@babel/core";
export declare function getCallPaths({ getTypeSuite, getCheckers, ...rest }: References): {
    getTypeSuite: NodePath<types.CallExpression>[];
    getCheckers: NodePath<types.CallExpression>[];
};
