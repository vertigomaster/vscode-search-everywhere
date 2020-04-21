import * as vscode from "vscode";
import * as sinon from "sinon";
import Cache from "../../cache";
import Utils from "../../utils";
import WorkspaceData from "../../interface/workspaceData";
import QuickPickItem from "../../interface/quickPickItem";
import Item from "../../interface/item";

export function getExtensionContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: {
      get: () => {},
      update: () => Promise.resolve(),
    },
    globalState: {
      get: () => {},
      update: () => Promise.resolve(),
    },
    extensionPath: "",
    storagePath: "",
    globalStoragePath: "",
    logPath: "",
    asAbsolutePath: (relativePath: string) => relativePath,
  } as vscode.ExtensionContext;
}

export function getCacheStub(): Cache {
  const cacheStubTemp: any = sinon.createStubInstance(Cache);
  cacheStubTemp.extensionContext = getExtensionContext();
  return cacheStubTemp as Cache;
}

export function getUtilsStub(): Utils {
  return sinon.createStubInstance(Utils);
}

export const getWorkspaceFoldersChangeEvent = (flag: boolean) => {
  return flag
    ? {
        added: [
          {
            uri: vscode.Uri.file("#"),
            name: "test workspace folder",
            index: 1,
          },
        ],
        removed: [],
      }
    : {
        added: [],
        removed: [],
      };
};

export const getConfigurationChangeEvent = (flag: boolean) => ({
  affectsConfiguration: () => flag,
});

export const getTextDocumentChangeEvent = async (
  shouldContentBeChanged: boolean = false
): Promise<vscode.TextDocumentChangeEvent> => {
  const itemUntitled = getUntitledItem();
  const textDocumentChangeEvent = {
    document: await vscode.workspace.openTextDocument(itemUntitled),
    contentChanges: [],
  };
  shouldContentBeChanged &&
    (textDocumentChangeEvent as any).contentChanges.push("test change");

  return textDocumentChangeEvent;
};

export const getFileWatcherStub = () => {
  return {
    ignoreCreateEvents: false,
    ignoreChangeEvents: false,
    ignoreDeleteEvents: false,
    onDidChange: sinon.stub(),
    onDidCreate: sinon.stub(),
    onDidDelete: sinon.stub(),
    dispose: () => {},
  };
};

export const getWorkspaceData = (items: vscode.Uri[] = []): WorkspaceData => {
  const itemsMap = new Map<string, Item>();
  items.forEach((item: vscode.Uri) =>
    itemsMap.set(item.fsPath, {
      uri: item,
      elements: [item],
    })
  );
  return {
    items: itemsMap,
    count: items.length,
  };
};

export const getDirectory = (path: string): vscode.Uri => {
  return vscode.Uri.file(path);
};

export const getUntitledItem = (): vscode.Uri => {
  const itemUntitledUri = vscode.Uri.file("./fake/fake-1.ts");
  (itemUntitledUri as any).scheme = "untitled";
  return itemUntitledUri;
};

export const getItem = (
  path: string = "/./fake/",
  suffix: string | number = 1,
  fixPrivateFsPathProperty: boolean = false
): vscode.Uri => {
  const item = vscode.Uri.file(`${path}fake-${suffix ? `${suffix}` : ""}.ts`);
  fixPrivateFsPathProperty && ((item as any)._fsPath = item.fsPath);
  return item;
};

export const getItems = (
  count: number = 2,
  path: string = "/./fake/",
  suffixStartOffset: number = 0,
  fixPrivateFsPathProperty: boolean = false
): vscode.Uri[] => {
  const array: vscode.Uri[] = [];
  for (let i = 1; i <= count; i++) {
    array.push(getItem(path, i + suffixStartOffset, fixPrivateFsPathProperty));
  }
  return array;
};

export const getQpItem = (
  path: string = "/./fake/",
  suffix: string | number = 1
): QuickPickItem => {
  const qpItem = {
    label: `fake-${suffix ? `${suffix}` : ""}.ts`,
    description: "File",
    detail: `${path}fake-${suffix ? `${suffix}` : ""}.ts`,
    uri: vscode.Uri.file(`${path}fake-${suffix ? `${suffix}` : ""}.ts`),
    symbolKind: 0,
    range: {
      start: new vscode.Position(0, 0),
      end: new vscode.Position(0, 0),
    },
  };
  const qpItemAny = qpItem as any;
  qpItemAny.uri._fsPath = qpItemAny.uri.fsPath;
  qpItemAny.detail = qpItemAny.uri.fsPath;

  return qpItem;
};

export const getUntitledQpItem = (): QuickPickItem => {
  return {
    label: "fake-1.ts",
    uri: getUntitledItem(),
    symbolKind: 0,
  };
};

export const getQpItems = (
  count: number = 2,
  path: string = "/./fake/",
  suffixStartOffset: number = 0
): QuickPickItem[] => {
  const array: QuickPickItem[] = [];
  for (let i = 1; i <= count; i++) {
    array.push(getQpItem(path, i + suffixStartOffset));
  }
  return array;
};

export const getDocumentSymbolItemSingleLine = (
  suffix?: string | number,
  withChild: boolean = false
): vscode.DocumentSymbol => {
  return {
    name: `test name${suffix ? ` ${suffix}` : ""}`,
    detail: `test details${suffix ? ` ${suffix}` : ""}`,
    kind: 1,
    range: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    ),
    selectionRange: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0)
    ),
    children: withChild
      ? [
          {
            name: `test child name${suffix ? ` ${suffix}` : ""}`,
            detail: `test child details${suffix ? ` ${suffix}` : ""}`,
            kind: 1,
            range: new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            ),
            selectionRange: new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(0, 0)
            ),
            children: [],
          },
        ]
      : [],
  };
};

export const getDocumentSymbolItemSingleLineArray = (
  count: number = 0,
  withChild: boolean = false
): vscode.DocumentSymbol[] => {
  const array: vscode.DocumentSymbol[] = [];
  for (let i = 1; i <= count; i++) {
    array.push(getDocumentSymbolItemSingleLine(i, withChild));
  }
  return array;
};

export const getDocumentSymbolItemMultiLine = (
  withEmptyParent: boolean = false
): vscode.DocumentSymbol => {
  return {
    name: `${withEmptyParent ? "" : "test parent"}§&§test name`,
    detail: "test details",
    kind: 1,
    range: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(3, 0)
    ),
    selectionRange: new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(3, 0)
    ),
    children: [],
  };
};

export const getDocumentSymbolQpItemMultiLine = (
  withEmptyParent: boolean = false
): QuickPickItem => {
  const qpItem = {
    label: "test name",
    description: `Module at lines: 1 - 3${
      withEmptyParent ? "" : " in test parent"
    }`,
    detail: "/./fake/fake-1.ts",
    uri: vscode.Uri.file("./fake/fake-1.ts"),
    symbolKind: 1,
    range: {
      start: new vscode.Position(0, 0),
      end: new vscode.Position(3, 0),
    },
  };
  const qpItemAny = qpItem as any;
  qpItemAny.uri._fsPath = qpItemAny.uri.fsPath;
  qpItemAny.detail = qpItemAny.uri.fsPath;

  return qpItem;
};

export const getQpItemsSymbolAndUri = (path: string = "/./fake/") => {
  const qpItemsSymbolAndUri: QuickPickItem[] = [
    {
      label: "fake-2.ts",
      description: "File",
      detail: `${path}fake-2.ts`,
      uri: vscode.Uri.file(`${path}fake-2.ts`),
      symbolKind: 0,
      range: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0),
      },
    },
    {
      label: "test symbol name",
      description: "Module at lines: 1 - 3 in test parent",
      detail: `${path}fake-2.ts`,
      uri: vscode.Uri.file(`${path}fake-2.ts`),
      symbolKind: 1,
      range: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(3, 0),
      },
    },
  ];

  qpItemsSymbolAndUri.forEach((qpItem: any) => {
    qpItem.uri._fsPath = qpItem.uri.fsPath;
    qpItem.detail = qpItem.uri.fsPath;
  });

  return qpItemsSymbolAndUri;
};

export const getQpItemsSymbolAndUriExt = (path: string = "/./fake/") => {
  const qpItemsSymbolAndUriExt: QuickPickItem[] = [
    {
      label: "fake-1.ts",
      description: "File",
      detail: "/./fake/fake-1.ts",
      uri: vscode.Uri.file("/./fake/fake-1.ts"),
      symbolKind: 0,
      range: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0),
      },
    },
    {
      label: "fake-2.ts",
      description: "File",
      detail: `${path}fake-2.ts`,
      uri: vscode.Uri.file(`${path}fake-2.ts`),
      symbolKind: 0,
      range: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0),
      },
    },
    {
      label: "test symbol name",
      description: "Module at lines: 1 - 3 in test parent",
      detail: `${path}fake-2.ts`,
      uri: vscode.Uri.file(`${path}fake-2.ts`),
      symbolKind: 1,
      range: {
        start: new vscode.Position(0, 0),
        end: new vscode.Position(3, 0),
      },
    },
  ];

  qpItemsSymbolAndUriExt.forEach((qpItem: any) => {
    qpItem.uri._fsPath = qpItem.uri.fsPath;
    qpItem.detail = qpItem.uri.fsPath;
  });

  return qpItemsSymbolAndUriExt;
};
