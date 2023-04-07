import { ICompilerArgs } from "./compileTypeSuite";
export interface IRequiredTypeSuite {
    compilerArgs: ICompilerArgs;
    id: string;
}
export interface IRequiredCheckerSuite {
    typeSuiteId: string;
    id: string;
}
export declare class RequirementRegistry {
    typeSuites: IRequiredTypeSuite[];
    checkerSuites: IRequiredCheckerSuite[];
    requireTypeSuite(compilerArgs: ICompilerArgs): string;
    requireCheckerSuite(compilerArgs: ICompilerArgs): string;
}
