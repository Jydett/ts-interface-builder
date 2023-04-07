"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCallPaths = void 0;
const errors_1 = require("./errors");
function getCallPaths(_a) {
    var { getTypeSuite = [], getCheckers = [] } = _a, rest = __rest(_a, ["getTypeSuite", "getCheckers"]);
    const restKeys = Object.keys(rest);
    if (restKeys.length) {
        throw errors_1.macroError(`Reference(s) to unknown export(s): ${restKeys.join(", ")}`);
    }
    const callPaths = {
        getTypeSuite: [],
        getCheckers: [],
    };
    getTypeSuite.forEach((path, index) => {
        if (!path.parentPath.isCallExpression()) {
            throw errors_1.macroError(`Reference ${index + 1} to getTypeSuite not used for a call expression`);
        }
        callPaths.getTypeSuite.push(path.parentPath);
    });
    getCheckers.forEach((path, index) => {
        if (!path.parentPath.isCallExpression()) {
            throw errors_1.macroError(`Reference ${index + 1} to getCheckers not used for a call expression`);
        }
        callPaths.getCheckers.push(path.parentPath);
    });
    return callPaths;
}
exports.getCallPaths = getCallPaths;
