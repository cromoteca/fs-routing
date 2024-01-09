
import reactSwc from '@vitejs/plugin-react-swc';
import type { PluginOption, UserConfigFn } from 'vite';
import { overrideVaadinConfig } from './vite.generated';
import ts, { ModifierLike, NodeArray, SyntaxKind } from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

// Concept from https://github.com/lepikhinb/vite-plugin-watch/blob/master/src/index.ts

function hasModifier(node: ts.Node & { modifiers?: NodeArray<ModifierLike> }, kind: SyntaxKind): boolean {
  return !!node.modifiers?.find(modifier => modifier.kind == kind)
}

function findExports(node: ts.Node) : ViewData | undefined {
  let metaValue: string | undefined = undefined;
  let defaultName: string | undefined = undefined;

  ts.forEachChild(node, (child) => {
    if (ts.isVariableStatement(child)) {
      child.declarationList.declarations.forEach(declaration => {
        const name = declaration.name.getText();
        if (declaration.initializer && "meta" == name) {
          if (metaValue) {
            throw Error("Multiple meta variables?");
          }
          metaValue = declaration.initializer.getText();
        }
      });  
    } else if (ts.isFunctionDeclaration(child)) {
      if (hasModifier(child, ts.SyntaxKind.ExportKeyword)
          && hasModifier(child, ts.SyntaxKind.DefaultKeyword)){
        if (defaultName) {
          throw Error("Multiple default exports?");
        }
        defaultName = child.name?.getText() || '';
      }
    }
  });

  if (defaultName !== undefined)  {
    if (metaValue) {
      return {metaValue, defaultName};
    } else {
      // Avoid explicit metaValue: undefined entry
      return {defaultName};
    }
  }
}

async function processHotUpdate(read: () => string | Promise<string>, file: string) {
  try {
    const oldCurrentViews = JSON.stringify(currentViews);

    const content = await read();
    const relativeLocation = file.substring(viewsDir.length);

    const result = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    const exports = findExports(result);

    if (exports) {
      currentViews[relativeLocation] = exports;
    } else {
      delete currentViews[relativeLocation];
    }

    const newCurrentViews = JSON.stringify(currentViews);

    if (oldCurrentViews != newCurrentViews) {
      writeFiles();
    }
  } catch (error) {
    console.error(error);
  }
}

// https://gist.github.com/lovasoa/8691344
async function* walk(dir: string) {
  for await (const d of await fs.promises.opendir(dir)) {
      const entry = path.join(dir, d.name);
      if (d.isDirectory()) yield* walk(entry);
      else if (d.isFile()) yield entry;
  }
}

interface ViewData {
  metaValue?: string;
  defaultName: string;
}

let currentViews: Record<string, ViewData> = {};
let root: string;
let outDir: string;
let viewsDir: string;

function writeFiles() {
  const logError: fs.NoParamCallback = (err) => { if (err) console.error(err); };

  const viewsJsonName = path.dirname(outDir) + '/views.json';
  fs.writeFile(viewsJsonName, JSON.stringify(currentViews), logError);

  let exports = '';
  for (const view in currentViews) {
    const viewData = currentViews[view];
    const extension = path.extname(view);
    const viewJs = view.substring(0, view.length - extension.length) + ".js";
    exports += `import ${viewData.defaultName} from '../views/${viewJs}'\n`;
  }
  exports += '\n';
  exports += 'const views = {\n';
  for (const view in currentViews) {
    const viewExports = currentViews[view];
    exports += `  '${view}': ${viewExports.defaultName},\n`;
  }
  exports += '};\n';
  exports += 'export default views;';

  fs.writeFile(root + "/generated/views.ts", exports, logError);
}


const viewWatcher: PluginOption = {
  name: "vite-plugin-view-watch",
  async buildStart() {
    for await (const file of walk(root + '/views/')) {
      const relativeLocation = file.substring(viewsDir.length);

      const content = await fs.promises.readFile(file, {encoding: "utf-8"});

      const result  = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
      const exports = findExports(result);
      if (exports) {
        currentViews[relativeLocation] = exports;
      }
    }

    if (Object.keys(currentViews).length != 0) {
      writeFiles();
    }
  },

  configResolved(config) {
    root = config.root;
    outDir = config.build.outDir;
    viewsDir = root + '/views/';
  },

  buildEnd() {
    currentViews = {};
  },

  handleHotUpdate({file, read, server}) {    
    if (!file.startsWith(viewsDir)) {
      return;
    }

    processHotUpdate(read, file);
  }
}

const customConfig: UserConfigFn = (env) => ({
  // Here you can add custom Vite parameters
  // https://vitejs.dev/config/
  plugins: [
    reactSwc({
      tsDecorators: true,
    }),
    viewWatcher,
  ],
});

export default overrideVaadinConfig(customConfig);
