import { ICompilerOptions } from "../index";
export type ICompilerArgs = [string, ICompilerOptions];
export declare function compileTypeSuite(args: ICompilerArgs): string;
