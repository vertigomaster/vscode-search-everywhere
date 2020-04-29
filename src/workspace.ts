import * as vscode from "vscode";
import Cache from "./cache";
import Utils from "./utils";
import DataService from "./dataService";
import DataConverter from "./dataConverter";
import QuickPickItem from "./interface/quickPickItem";
import { appConfig } from "./appConfig";
import ActionType from "./enum/actionType";
import Action from "./interface/action";
import ActionProcessor from "./actionProcessor";

const debounce = require("debounce");

class Workspace {
  private dataService: DataService;
  private dataConverter: DataConverter;
  private actionProcessor: ActionProcessor;

  private urisForDirectoryPathUpdate?: vscode.Uri[];
  private directoryUriBeforePathUpdate?: vscode.Uri;
  private fileSymbolKind: number = 0;

  constructor(
    private cache: Cache,
    private utils: Utils,
    private onDidChangeRemoveCreateCallback: Function
  ) {
    this.dataService = new DataService(this.cache, this.utils);
    this.dataConverter = new DataConverter(this.utils);
    this.actionProcessor = new ActionProcessor(onDidChangeRemoveCreateCallback);
  }

  async index() {
    await this.registerAction(
      ActionType.Rebuild,
      this.indexWorkspace.bind(this),
      "index"
    );
  }

  private async indexWorkspace(): Promise<void> {
    this.cache.clear();
    const qpData = await this.downloadData();
    this.cache.updateData(qpData);
  }

  async registerEventListeners(): Promise<void> {
    vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration);
    vscode.workspace.onDidChangeWorkspaceFolders(
      this.onDidChangeWorkspaceFolders
    );
    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument);

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      appConfig.globPattern
    );
    fileWatcher.onDidChange(this.onDidFileSave);
    fileWatcher.onDidCreate(debounce(this.onDidFileFolderCreate, 260));
    fileWatcher.onDidDelete(this.onDidFileFolderDelete);
  }

  getData(): QuickPickItem[] | undefined {
    return this.cache.getData();
  }

  private async downloadData(uris?: vscode.Uri[]): Promise<QuickPickItem[]> {
    const data = await this.dataService.fetchData(uris);
    const qpData = this.dataConverter.convertToQpData(data);
    return qpData;
  }

  private async updateCacheByPath(uri: vscode.Uri): Promise<void> {
    try {
      const isUriExistingInWorkspace = await this.dataService.isUriExistingInWorkspace(
        uri
      );
      let data: QuickPickItem[];

      if (isUriExistingInWorkspace) {
        this.cleanDirectoryRenamingData();

        await this.removeFromCacheByPath(uri);
        data = await this.downloadData([uri]);
        data = this.mergeWithDataFromCache(data);
        this.cache.updateData(data);
      } else {
        if (
          this.urisForDirectoryPathUpdate &&
          this.urisForDirectoryPathUpdate.length
        ) {
          const urisWithNewDirectoryName = this.updateUrisWithNewDirectoryName(
            this.urisForDirectoryPathUpdate,
            this.directoryUriBeforePathUpdate!,
            uri
          );
          data = await this.downloadData(urisWithNewDirectoryName);
          data = this.mergeWithDataFromCache(data);
          this.cache.updateData(data);
        }
        this.cleanDirectoryRenamingData();
      }
    } catch (error) {
      this.utils.printErrorMessage(error);
      await this.registerAction(
        ActionType.Rebuild,
        this.indexWorkspace.bind(this),
        "on error catch"
      );
    }
  }

  private async removeFromCacheByPath(uri: vscode.Uri): Promise<void> {
    let data = this.getData();
    const isUriExistingInWorkspace = await this.dataService.isUriExistingInWorkspace(
      uri
    );
    if (data) {
      if (isUriExistingInWorkspace) {
        data = data.filter(
          (qpItem: QuickPickItem) => qpItem.uri.fsPath !== uri.fsPath
        );
      } else {
        this.directoryUriBeforePathUpdate = uri;
        this.urisForDirectoryPathUpdate = this.getUrisForDirectoryPathUpdate(
          data,
          uri
        );
        data = data.filter(
          (qpItem: QuickPickItem) => !qpItem.uri.fsPath.includes(uri.fsPath)
        );
      }
      this.cache.updateData(data);
    }
  }

  private getUrisForDirectoryPathUpdate(
    data: QuickPickItem[],
    uri: vscode.Uri
  ): vscode.Uri[] {
    return data
      .filter(
        (qpItem: QuickPickItem) =>
          qpItem.uri.fsPath.includes(uri.fsPath) &&
          qpItem.symbolKind === this.fileSymbolKind
      )
      .map((qpItem: QuickPickItem) => qpItem.uri);
  }

  private mergeWithDataFromCache(data: QuickPickItem[]): QuickPickItem[] {
    const dataFromCache = this.getData();
    if (dataFromCache) {
      return dataFromCache.concat(data);
    }
    return data;
  }

  private updateUrisWithNewDirectoryName(
    uris: vscode.Uri[],
    oldDirectoryUri: vscode.Uri,
    newDirectoryUri: vscode.Uri
  ): vscode.Uri[] {
    return uris.map((oldUri: vscode.Uri) => {
      const path = oldUri.fsPath.replace(
        oldDirectoryUri.fsPath,
        newDirectoryUri.fsPath
      );
      return vscode.Uri.file(path);
    });
  }

  private cleanDirectoryRenamingData() {
    this.directoryUriBeforePathUpdate = undefined;
    this.urisForDirectoryPathUpdate = undefined;
  }

  private async registerAction(
    type: ActionType,
    fn: Function,
    comment: string,
    uri?: vscode.Uri
  ): Promise<void> {
    const action: Action = {
      type,
      fn,
      comment,
    };
    await this.actionProcessor.register(action);
  }

  private onDidChangeConfiguration = async (
    event: vscode.ConfigurationChangeEvent
  ): Promise<void> => {
    if (this.utils.hasConfigurationChanged(event)) {
      await this.registerAction(
        ActionType.Rebuild,
        this.indexWorkspace.bind(this),
        "onDidChangeConfiguration"
      );
    }
  };

  private onDidChangeWorkspaceFolders = async (
    event: vscode.WorkspaceFoldersChangeEvent
  ): Promise<void> => {
    if (this.utils.hasWorkspaceChanged(event)) {
      await this.registerAction(
        ActionType.Rebuild,
        this.indexWorkspace.bind(this),
        "onDidChangeWorkspaceFolders"
      );
    }
  };

  private onDidChangeTextDocument = async (
    event: vscode.TextDocumentChangeEvent
  ) => {
    const uri = event.document.uri;
    const isUriExistingInWorkspace = await this.dataService.isUriExistingInWorkspace(
      uri
    );

    if (isUriExistingInWorkspace && event.contentChanges.length) {
      await this.registerAction(
        ActionType.Update,
        this.updateCacheByPath.bind(this, uri),
        "onDidChangeTextDocument"
      );
    }
  };

  private onDidFileSave = async (uri: vscode.Uri) => {
    const isUriExistingInWorkspace = await this.dataService.isUriExistingInWorkspace(
      uri
    );
    if (isUriExistingInWorkspace) {
      await this.registerAction(
        ActionType.Update,
        this.updateCacheByPath.bind(this, uri),
        "onDidFileSave"
      );
    }
  };

  private onDidFileFolderCreate = async (uri: vscode.Uri) => {
    // necessary to invoke updateCacheByPath after removeCacheByPath
    // TODO: check if necessary
    // await this.utils.sleep(1);

    await this.registerAction(
      ActionType.Update,
      this.updateCacheByPath.bind(this, uri),
      "onDidFileFolderCreate"
    );
  };

  private onDidFileFolderDelete = async (uri: vscode.Uri) => {
    await this.registerAction(
      ActionType.Remove,
      this.removeFromCacheByPath.bind(this, uri),
      "onDidFileFolderDelete"
    );
  };
}

export default Workspace;
