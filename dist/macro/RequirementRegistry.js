"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementRegistry = void 0;
// @ts-ignore
const util_1 = require("util");
class RequirementRegistry {
    constructor() {
        this.typeSuites = [];
        this.checkerSuites = [];
    }
    requireTypeSuite(compilerArgs) {
        let index = this.typeSuites.findIndex((typeSuite) => util_1.isDeepStrictEqual(typeSuite.compilerArgs, compilerArgs));
        if (index === -1) {
            index = this.typeSuites.length;
            this.typeSuites.push({
                compilerArgs,
                id: `typeSuite${index}`,
            });
        }
        return this.typeSuites[index].id;
    }
    requireCheckerSuite(compilerArgs) {
        const typeSuiteId = this.requireTypeSuite(compilerArgs);
        let index = this.checkerSuites.findIndex((checkerSuite) => checkerSuite.typeSuiteId === typeSuiteId);
        if (index === -1) {
            index = this.checkerSuites.length;
            this.checkerSuites.push({
                typeSuiteId,
                id: `checkerSuite${index}`,
            });
        }
        return this.checkerSuites[index].id;
    }
}
exports.RequirementRegistry = RequirementRegistry;
