/**
 * Lists inline anonymous callbacks, which CLAUDE.md rule 4 bans.
 *
 * Usage: tsx scripts/lint/findInlineCallbacks.ts [paths...]   (defaults to src and scripts)
 * Exits 1 when any callback needs a name.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

type CallbackKind = 'argument' | 'jsx' | 'handler-property' | 'object-property' | 'returned';

interface Finding {
  location: string;
  kind: CallbackKind;
  snippet: string;
}

const SOURCE_FILE = /\.tsx?$/;
const TEST_STRUCTURE = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)(\.\w+)?$/;
const SNIPPET_LENGTH = 60;

function listSourceFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) return SOURCE_FILE.test(path) ? [path] : [];
  const toChildFiles = (name: string): string[] => (name === 'node_modules' ? [] : listSourceFiles(join(path, name)));
  return readdirSync(path).flatMap(toChildFiles);
}

function toKind(node: ts.Node, parent: ts.Node): CallbackKind | null {
  if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.arguments?.includes(node as ts.Expression)) {
    return 'argument';
  }
  if (ts.isJsxExpression(parent)) return 'jsx';
  if (
    ts.isBinaryExpression(parent) &&
    parent.right === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    ts.isPropertyAccessExpression(parent.left)
  ) {
    return 'handler-property';
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) return 'object-property';
  if (ts.isReturnStatement(parent) || (ts.isArrowFunction(parent) && parent.body === node)) return 'returned';
  return null;
}

function isExempt(node: ts.ArrowFunction | ts.FunctionExpression, source: ts.SourceFile): boolean {
  if (ts.isFunctionExpression(node) && node.name) return true;
  const { parent } = node;
  if (ts.isCallExpression(parent) && TEST_STRUCTURE.test(parent.expression.getText(source))) return true;
  // A closure returned by a named handler creator: const createX = (id) => () => ...
  return ts.isArrowFunction(parent) && parent.body === node && ts.isVariableDeclaration(parent.parent);
}

function findInFile(file: string): Finding[] {
  const text = readFileSync(file, 'utf8');
  const scriptKind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
  const findings: Finding[] = [];

  const visit = (node: ts.Node): void => {
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && !isExempt(node, source)) {
      const kind = toKind(node, node.parent);
      if (kind) {
        const start = node.getStart(source);
        const { line } = source.getLineAndCharacterOfPosition(start);
        const snippet = text.slice(start, start + SNIPPET_LENGTH).replace(/\s+/g, ' ');
        findings.push({ location: `${file}:${line + 1}`, kind, snippet });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

const printFinding = ({ location, kind, snippet }: Finding): void => console.log(`${location}\t${kind}\t${snippet}`);

const roots = process.argv.length > 2 ? process.argv.slice(2) : ['src', 'scripts'];
const findings = roots.flatMap(listSourceFiles).flatMap(findInFile);
findings.forEach(printFinding);
if (findings.length > 0) {
  console.error(`${findings.length} inline callbacks need names (CLAUDE.md rule 4)`);
  process.exit(1);
}
