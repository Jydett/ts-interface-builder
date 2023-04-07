"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.macro = void 0;
// @ts-ignore
const path = require("path");
const babel_plugin_macros_1 = require("babel-plugin-macros");
const getCallPaths_1 = require("./macro/getCallPaths");
const RequirementRegistry_1 = require("./macro/RequirementRegistry");
const getGetArgValue_1 = require("./macro/getGetArgValue");
const compileTypeSuite_1 = require("./macro/compileTypeSuite");
const errors_1 = require("./macro/errors");
const tsInterfaceCheckerIdentifier = "t";
const onceIdentifier = "once";
/**
 * This macro handler is called for each file that imports the macro module.
 * `params.references` is an object where each key is the name of a variable imported from the macro module,
 * and each value is an array of references to that that variable.
 * Said references come in the form of Babel `NodePath`s,
 * which have AST (Abstract Syntax Tree) data and methods for manipulating it.
 * For more info: https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md#function-api
 *
 * This macro handler needs to replace each call to `getTypeSuite` or `getCheckers`
 * with the code that fulfills that function's behavior as documented in `macro.d.ts` (in root of repo).
 */
const macroHandler = (params) => {
    const { references, babel, state } = params;
    const callPaths = getCallPaths_1.getCallPaths(references);
    const somePath = callPaths.getTypeSuite[0] || callPaths.getCheckers[0];
    if (!somePath) {
        return;
    }
    const programPath = somePath.findParent((path) => path.isProgram());
    const registry = new RequirementRegistry_1.RequirementRegistry();
    const toReplace = [
        ...callPaths.getTypeSuite.map((callPath, index) => {
            const compilerArgs = getCompilerArgs(callPath, "getTypeSuite", index);
            const typeSuiteId = registry.requireTypeSuite(compilerArgs);
            return { callPath, id: typeSuiteId };
        }),
        ...callPaths.getCheckers.map((callPath, index) => {
            const compilerArgs = getCompilerArgs(callPath, "getCheckers", index);
            const checkerSuiteId = registry.requireCheckerSuite(compilerArgs);
            return { callPath, id: checkerSuiteId };
        }),
    ];
    // Begin mutations
    programPath.scope.rename(tsInterfaceCheckerIdentifier);
    programPath.scope.rename(onceIdentifier);
    toReplace.forEach(({ callPath, id }) => {
        scopeRenameRecursive(callPath.scope, id);
    });
    const toPrepend = `
    import * as ${tsInterfaceCheckerIdentifier} from "ts-interface-checker";
    function ${onceIdentifier}(fn) {
      var result;
      return function () {
        return result || (result = fn());
      };
    }
    ${registry.typeSuites
        .map(({ compilerArgs, id }) => `
          var ${id} = ${onceIdentifier}(function(){
            return ${compileTypeSuite_1.compileTypeSuite(compilerArgs)};
          });
        `)
        .join("")}
    ${registry.checkerSuites
        .map(({ typeSuiteId, id }) => `
          var ${id} = ${onceIdentifier}(function(){
            return ${tsInterfaceCheckerIdentifier}.createCheckers(${typeSuiteId}());
          });
        `)
        .join("")}
  `;
    parseStatements(toPrepend).reverse().forEach(prependProgramStatement);
    const { identifier, callExpression } = babel.types;
    toReplace.forEach(({ callPath, id }) => {
        callPath.replaceWith(callExpression(identifier(id), []));
    });
    // Done mutations (only helper functions below)
    function getCompilerArgs(callPath, functionName, callIndex) {
        const callDescription = `${functionName} call ${callIndex + 1}`;
        const getArgValue = getGetArgValue_1.getGetArgValue(callPath, callDescription);
        const basename = getArgValue(0) || path.basename(state.filename);
        const file = path.resolve(state.filename, "..", basename);
        // Get the user config passed to us by babel-plugin-macros, for use as default options
        // Note: `config` property is missing in `babelPluginMacros.MacroParams` type definition
        const defaultOptions = params.config;
        const options = Object.assign(Object.assign(Object.assign({}, (defaultOptions || {})), (getArgValue(1) || {})), { format: "js:cjs" });
        return [file, options];
    }
    function scopeRenameRecursive(scope, oldName) {
        scope.rename(oldName);
        if (scope.parent) {
            scopeRenameRecursive(scope.parent, oldName);
        }
    }
    function parseStatements(code) {
        const parsed = babel.parse(code, { configFile: false });
        if (!parsed || parsed.type !== "File")
            throw errors_1.macroInternalError();
        return parsed.program.body;
    }
    function prependProgramStatement(statement) {
        programPath.get("body.0").insertBefore(statement);
    }
};
const macroParams = { configName: "ts-interface-builder-wl" };
exports.macro = () => babel_plugin_macros_1.createMacro(macroHandler, macroParams);
