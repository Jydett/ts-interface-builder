"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.Compiler = void 0;
const commander = require("commander");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const ts = require("typescript");
// Default format to use for `format` option
const defaultFormat = "ts";
// Default suffix appended to generated files. Abbreviation for "ts-interface".
const defaultSuffix = "-ti";
const defaultIndentSize = 2;
// Default header prepended to the generated module.
const defaultHeader = `/**
 * This module was automatically generated by \`ts-interface-builder-wl\`
 */
`;
const ignoreNode = "";
// The main public interface is `Compiler.compile`.
class Compiler {
    constructor(checker, options, topNode) {
        this.checker = checker;
        this.options = options;
        this.topNode = topNode;
        this.exportedNames = [];
    }
    static compile(filePath, options = {}) {
        const createProgramOptions = { target: ts.ScriptTarget.Latest, module: ts.ModuleKind.CommonJS };
        const program = ts.createProgram([filePath], createProgramOptions);
        const checker = program.getTypeChecker();
        const topNode = program.getSourceFile(filePath);
        if (!topNode) {
            throw new Error(`Can't process ${filePath}: ${collectDiagnostics(program)}`);
        }
        options = Object.assign({ format: defaultFormat, ignoreGenerics: false, ignoreIndexSignature: false, inlineImports: false, indentSize: defaultIndentSize }, options);
        console.log(`Starting with options '${JSON.stringify(options)}'`);
        return new Compiler(checker, options, topNode).compileNode(topNode);
    }
    getName(id, prefix = 'TI') {
        const symbol = this.checker.getSymbolAtLocation(id);
        return symbol ? prefix + symbol.getName() : "unknown";
    }
    indent(content) {
        return content.replace(/\n/g, "\n" + " ".repeat(this.options.indentSize));
    }
    compileNode(node) {
        switch (node.kind) {
            case ts.SyntaxKind.Identifier: return this._compileIdentifier(node);
            case ts.SyntaxKind.Parameter: return this._compileParameterDeclaration(node);
            case ts.SyntaxKind.PropertySignature: return this._compilePropertySignature(node);
            case ts.SyntaxKind.MethodSignature: return this._compileMethodSignature(node);
            case ts.SyntaxKind.TypeReference: return this._compileTypeReferenceNode(node);
            case ts.SyntaxKind.FunctionType: return this._compileFunctionTypeNode(node);
            case ts.SyntaxKind.TypeLiteral: return this._compileTypeLiteralNode(node);
            case ts.SyntaxKind.ArrayType: return this._compileArrayTypeNode(node);
            case ts.SyntaxKind.TupleType: return this._compileTupleTypeNode(node);
            case ts.SyntaxKind.RestType: return this._compileRestTypeNode(node);
            case ts.SyntaxKind.UnionType: return this._compileUnionTypeNode(node);
            case ts.SyntaxKind.IntersectionType: return this._compileIntersectionTypeNode(node);
            case ts.SyntaxKind.LiteralType: return this._compileLiteralTypeNode(node);
            case ts.SyntaxKind.OptionalType: return this._compileOptionalTypeNode(node);
            case ts.SyntaxKind.EnumDeclaration: return this._compileEnumDeclaration(node);
            case ts.SyntaxKind.InterfaceDeclaration:
                return this._compileInterfaceDeclaration(node);
            case ts.SyntaxKind.TypeAliasDeclaration:
                return this._compileTypeAliasDeclaration(node);
            case ts.SyntaxKind.ExpressionWithTypeArguments:
                return this._compileExpressionWithTypeArguments(node);
            case ts.SyntaxKind.ParenthesizedType:
                return this._compileParenthesizedTypeNode(node);
            case ts.SyntaxKind.ExportDeclaration:
            case ts.SyntaxKind.ImportDeclaration:
                return this._compileImportDeclaration(node);
            case ts.SyntaxKind.SourceFile: return this._compileSourceFile(node);
            case ts.SyntaxKind.AnyKeyword: return '"any"';
            case ts.SyntaxKind.NumberKeyword: return '"number"';
            case ts.SyntaxKind.ObjectKeyword: return '"object"';
            case ts.SyntaxKind.BooleanKeyword: return '"boolean"';
            case ts.SyntaxKind.StringKeyword: return '"string"';
            case ts.SyntaxKind.SymbolKeyword: return '"symbol"';
            case ts.SyntaxKind.ThisKeyword: return '"this"';
            case ts.SyntaxKind.VoidKeyword: return '"void"';
            case ts.SyntaxKind.UndefinedKeyword: return '"undefined"';
            case ts.SyntaxKind.UnknownKeyword: return '"unknown"';
            case ts.SyntaxKind.NullKeyword: return '"null"';
            case ts.SyntaxKind.NeverKeyword: return '"never"';
            case ts.SyntaxKind.BigIntKeyword: return '"bigint"';
            case ts.SyntaxKind.IndexSignature:
                return this._compileIndexSignatureDeclaration(node);
        }
        // Skip top-level statements that we haven't handled.
        if (ts.isSourceFile(node.parent)) {
            return "";
        }
        throw new Error(`Node ${ts.SyntaxKind[node.kind]} not supported by ts-interface-builder-wl: ` +
            node.getText());
    }
    compileOptType(typeNode) {
        return typeNode ? this.compileNode(typeNode) : '"any"';
    }
    _compileIdentifier(node) {
        return `"${node.getText()}"`;
    }
    _compileParameterDeclaration(node) {
        const name = this.getName(node.name);
        const isOpt = node.questionToken ? ", true" : "";
        return `t.param("${name}", ${this.compileOptType(node.type)}${isOpt})`;
    }
    _compilePropertySignature(node) {
        const name = this.getName(node.name, '');
        const prop = this.compileOptType(node.type);
        const value = node.questionToken ? `t.opt(${prop})` : prop;
        return `"${name}": ${value}`;
    }
    _compileMethodSignature(node) {
        const name = this.getName(node.name);
        const params = node.parameters.map(this.compileNode, this);
        const items = [this.compileOptType(node.type)].concat(params);
        return `"${name}": t.func(${items.join(", ")})`;
    }
    _compileTypeReferenceNode(node) {
        if (!node.typeArguments) {
            if (node.typeName.kind === ts.SyntaxKind.QualifiedName) {
                const typeNode = this.checker.getTypeFromTypeNode(node);
                if (typeNode.flags & ts.TypeFlags.EnumLiteral) {
                    return `t.enumlit("${node.typeName.left.getText()}", "${node.typeName.right.getText()}")`;
                }
            }
            return `"TI${node.typeName.getText()}"`;
        }
        else if (node.typeName.getText() === "Promise") {
            // Unwrap Promises.
            return this.compileNode(node.typeArguments[0]);
        }
        else if (node.typeName.getText() === "Array") {
            return `t.array(${this.compileNode(node.typeArguments[0])})`;
        }
        else if (this.options.ignoreGenerics) {
            return '"any"';
        }
        else {
            throw new Error(`Generics are not yet supported by ts-interface-builder-wl: ` + node.getText());
        }
    }
    _compileFunctionTypeNode(node) {
        const params = node.parameters.map(this.compileNode, this);
        const items = [this.compileOptType(node.type)].concat(params);
        return `t.func(${items.join(", ")})`;
    }
    _compileTypeLiteralNode(node) {
        const members = node.members
            .map(n => this.compileNode(n))
            .filter(n => n !== ignoreNode)
            .map(n => " ".repeat(this.options.indentSize) + this.indent(n) + ",\n");
        return `t.iface([], {\n${members.join("")}})`;
    }
    _compileArrayTypeNode(node) {
        return `t.array(${this.compileNode(node.elementType)})`;
    }
    _compileTupleTypeNode(node) {
        const members = node.elementTypes.map(this.compileNode, this);
        return `t.tuple(${members.join(", ")})`;
    }
    _compileRestTypeNode(node) {
        if (node.parent.kind != ts.SyntaxKind.TupleType) {
            throw new Error("Rest type currently only supported in tuples");
        }
        return `t.rest(${this.compileNode(node.type)})`;
    }
    _compileUnionTypeNode(node) {
        const members = node.types.map(this.compileNode, this);
        return `t.union(${members.join(", ")})`;
    }
    _compileIntersectionTypeNode(node) {
        const members = node.types.map(this.compileNode, this);
        return `t.intersection(${members.join(", ")})`;
    }
    _compileLiteralTypeNode(node) {
        return `t.lit(${node.getText()})`;
    }
    _compileOptionalTypeNode(node) {
        return `t.opt(${this.compileNode(node.type)})`;
    }
    _compileEnumDeclaration(node) {
        const name = this.getName(node.name);
        const members = node.members.map(m => " ".repeat(this.options.indentSize) + `"${this.getName(m.name, '')}": ${getTextOfConstantValue(this.checker.getConstantValue(m))},\n`);
        this.exportedNames.push(name);
        return this._formatExport(name, `t.enumtype({\n${members.join("")}})`);
    }
    _compileInterfaceDeclaration(node) {
        const name = this.getName(node.name);
        const members = node.members
            .map(n => this.compileNode(n))
            .filter(n => n !== ignoreNode)
            .map(n => " ".repeat(this.options.indentSize) + this.indent(n) + ",\n");
        const extend = [];
        if (node.heritageClauses) {
            for (const h of node.heritageClauses) {
                extend.push(...h.types.map(this.compileNode, this));
            }
        }
        this.exportedNames.push(name);
        return this._formatExport(name, `t.iface([${extend.join(", ")}], {\n${members.join("")}})`);
    }
    _compileTypeAliasDeclaration(node) {
        const name = this.getName(node.name);
        this.exportedNames.push(name);
        const compiled = this.compileNode(node.type);
        // Turn string literals into explicit `name` nodes, as expected by ITypeSuite.
        const fullType = compiled.startsWith('"') ? `t.name(${compiled})` : compiled;
        return this._formatExport(name, fullType);
    }
    _compileExpressionWithTypeArguments(node) {
        return this.compileNode(node.expression);
    }
    _compileParenthesizedTypeNode(node) {
        return this.compileNode(node.type);
    }
    _compileImportDeclaration(node) {
        if (this.options.inlineImports) {
            const importedSym = this.checker.getSymbolAtLocation(node.moduleSpecifier);
            if (importedSym && importedSym.declarations) {
                // this._compileSourceFile will get called on every imported file when traversing imports.
                // it's important to check that _compileSourceFile is being run against the topNode
                // before adding the file wrapper for this reason.
                return importedSym.declarations.map(declaration => this.compileNode(declaration)).join("");
            }
        }
        return '';
    }
    _compileSourceFileStatements(node) {
        return node.statements.map(this.compileNode, this).filter((s) => s).join("\n\n");
    }
    _compileSourceFile(node) {
        // for imported source files, skip the wrapper
        if (node !== this.topNode) {
            return this._compileSourceFileStatements(node);
        }
        // wrap the top node with a default export
        if (this.options.format === "js:cjs") {
            return `const t = require("ts-interface-checker");\n\n` +
                "module.exports = {\n" +
                this._compileSourceFileStatements(node) + "\n" +
                "};\n";
        }
        const prefix = `import * as t from "ts-interface-checker";\n` +
            (this.options.format === "ts" ? "// tslint:disable:object-literal-key-quotes\n" : "") +
            "\n";
        return prefix +
            this._compileSourceFileStatements(node) + "\n\n" +
            "const exportedTypeSuite" + (this.options.format === "ts" ? ": t.ITypeSuite" : "") + " = {\n" +
            this.exportedNames.map((n) => " ".repeat(this.options.indentSize) + `${n},\n`).join("") +
            "};\n" +
            "export default exportedTypeSuite;\n";
    }
    _compileIndexSignatureDeclaration(node) {
        // This option is supported for backward compatibility.
        if (this.options.ignoreIndexSignature) {
            return ignoreNode;
        }
        if (!node.type) {
            throw new Error(`Node ${ts.SyntaxKind[node.kind]} must have a type`);
        }
        const type = this.compileNode(node.type);
        return `[t.indexKey]: ${type}`;
    }
    _formatExport(name, expression) {
        return this.options.format === "js:cjs"
            ? " ".repeat(this.options.indentSize) + `TI${name}: ${this.indent(expression)},`
            : `export const ${name} = ${expression};`;
    }
}
exports.Compiler = Compiler;
function getTextOfConstantValue(value) {
    // Typescript has methods to escape values, but doesn't seem to expose them at all. Here I am
    // casting `ts` to access this private member rather than implementing my own.
    return value === undefined ? "undefined" : ts.getTextOfConstantValue(value);
}
function collectDiagnostics(program) {
    const diagnostics = ts.getPreEmitDiagnostics(program);
    return ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory() { return process.cwd(); },
        getCanonicalFileName(fileName) { return fileName; },
        getNewLine() { return "\n"; },
    });
}
function needsUpdate(srcPath, outPath) {
    if (!fs.existsSync(outPath)) {
        return true;
    }
    const lastBuildTime = fs.statSync(outPath).mtime;
    const lastCodeTime = fs.statSync(srcPath).mtime;
    return lastBuildTime < lastCodeTime;
}
/**
 * Main entry point when used from the command line.
 */
function main() {
    commander
        .description("Create runtime validator module from TypeScript interfaces")
        .usage("[options] <typescript-file...>")
        .option("-f, --format <format>", `Format to use for output; options are 'ts' (default), 'js:esm', 'js:cjs'`)
        .option("-g, --ignore-generics", `Ignores generics`)
        .option("-z, --indent-size <size>", `Size of indent (default ${defaultIndentSize})`, v => parseInt(v), defaultIndentSize)
        .option("-i, --ignore-index-signature", `Ignores index signature`)
        .option("-m, --inline-imports", `Traverses the full import tree and inlines all types into output`)
        .option("-s, --suffix <suffix>", `Suffix to append to generated files (default ${defaultSuffix})`, defaultSuffix)
        .option("-o, --outDir <path>", `Directory for output files; same as source file if omitted`)
        .option("-v, --verbose", "Produce verbose output")
        .option("-c, --changed-only", "Skip the build if the output file exists with a newer timestamp")
        .parse(process.argv);
    const files = commander.args;
    const verbose = commander.verbose;
    const changedOnly = commander.changedOnly;
    const suffix = commander.suffix;
    const outDir = commander.outDir;
    const options = {
        format: commander.format || defaultFormat,
        ignoreGenerics: commander.ignoreGenerics,
        ignoreIndexSignature: commander.ignoreIndexSignature,
        inlineImports: commander.inlineImports,
        indentSize: commander.indentSize,
    };
    if (files.length === 0) {
        commander.outputHelp();
        process.exit(1);
        return;
    }
    // perform expansion and find all matching files ourselves
    const globFiles = [].concat(...files.map(p => glob.sync(p)));
    for (const filePath of globFiles) {
        // Read and parse the source file.
        const ext = path.extname(filePath);
        const dir = outDir || path.dirname(filePath);
        const fileName = path.basename(filePath, ext);
        if (fileName.endsWith("-ti")) {
            fs.unlinkSync(filePath);
            continue;
        }
        const outPath = path.join(dir, fileName + suffix + (options.format === "ts" ? ".ts" : ".js"));
        if (changedOnly && !needsUpdate(filePath, outPath)) {
            if (verbose) {
                console.log(`Skipping ${filePath} because ${outPath} is newer`);
            }
            continue;
        }
        if (verbose) {
            console.log(`Compiling ${filePath} -> ${outPath}`);
        }
        const generatedCode = defaultHeader + Compiler.compile(filePath, options);
        fs.writeFileSync(outPath, generatedCode);
    }
}
exports.main = main;
