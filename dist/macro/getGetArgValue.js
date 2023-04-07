"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGetArgValue = void 0;
const errors_1 = require("./errors");
function getGetArgValue(callPath, callDescription) {
    const argPaths = callPath.get("arguments");
    if (!Array.isArray(argPaths))
        throw errors_1.macroInternalError();
    return (argIndex) => {
        const argPath = argPaths[argIndex];
        if (!argPath) {
            return null;
        }
        const { confident, value } = argPath.evaluate();
        if (!confident) {
            /**
             * TODO: Could not get following line to work:
             * const lineSuffix = argPath.node.loc ? ` on line ${argPath.node.loc.start.line}` : ""
             * Line number displayed is for the intermediary js produced by typescript.
             * Even with `inputSourceMap: true`, Babel doesn't seem to parse inline sourcemaps in input.
             * Maybe babel-plugin-macros doesn't support "input -> TS -> babel -> output" pipeline?
             * Or maybe I'm doing that pipeline wrong?
             */
            throw errors_1.macroError(`Unable to evaluate argument ${argIndex + 1} of ${callDescription}`);
        }
        return value;
    };
}
exports.getGetArgValue = getGetArgValue;
