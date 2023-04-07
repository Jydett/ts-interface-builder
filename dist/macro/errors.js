"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.macroInternalError = exports.macroError = void 0;
const babel_plugin_macros_1 = require("babel-plugin-macros");
function macroError(message) {
    return new babel_plugin_macros_1.MacroError(`ts-interface-builder-wl/macro: ${message}`);
}
exports.macroError = macroError;
function macroInternalError(message) {
    return macroError(`Internal Error: ${message || "Check stack trace"}`);
}
exports.macroInternalError = macroInternalError;
