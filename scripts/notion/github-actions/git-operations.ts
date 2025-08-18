import { execSync } from "child_process";
import fs from "node:fs/promises";
import path from "path";
import type { DatabaseState } from "../storage/state-manager";

/**
 * GitHub Actions用のGit操作ユーティリティ
 * 既存PRブランチからのstate読み込みなどを担当
 */

export interface GitOperationOptions {
  workingDir: string;
  stateDir: string;
  verbose: boolean;
}

export class GitOperations {
  private options: GitOperationOptions;

  constructor(options: Partial<GitOperationOptions> = {}) {
    this.options = {
      workingDir: process.cwd(),
      stateDir: "./state",
      verbose: false,
      ...options
    };
  }

  /**
   * 指定ブランチからstate情報を読み込み
   */
  async loadStateFromBranch(branchName: string): Promise<Record<string, DatabaseState> | null> {
    try {
      this.log(`Loading state from branch: ${branchName}`);

      // リモートから最新情報を取得
      await this.fetchRemote();

      // 一時的にブランチをチェックアウト
      const currentBranch = this.getCurrentBranch();
      
      try {
        await this.checkoutBranch(branchName);
        
        // stateディレクトリから全てのJSONファイルを読み込み
        const states = await this.readAllStateFiles();
        
        this.log(`Loaded ${Object.keys(states).length} state files from branch ${branchName}`);
        return states;

      } finally {
        // 元のブランチに戻る
        await this.checkoutBranch(currentBranch);
      }

    } catch (error) {
      this.log(`Failed to load state from branch ${branchName}: ${error}`);
      return null;
    }
  }

  /**
   * 現在のブランチからstate情報を読み込み
   */
  async loadCurrentState(): Promise<Record<string, DatabaseState>> {
    try {
      return await this.readAllStateFiles();
    } catch (error) {
      this.log(`Failed to load current state: ${error}`);
      return {};
    }
  }

  /**
   * stateディレクトリの全JSONファイルを読み込み
   */
  private async readAllStateFiles(): Promise<Record<string, DatabaseState>> {
    const stateAbsPath = path.resolve(this.options.workingDir, this.options.stateDir);
    const states: Record<string, DatabaseState> = {};

    try {
      const files = await fs.readdir(stateAbsPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const jsonFile of jsonFiles) {
        const filePath = path.join(stateAbsPath, jsonFile);
        const databaseId = path.basename(jsonFile, '.json');
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const state = JSON.parse(content) as DatabaseState;
          states[databaseId] = state;
          
          this.log(`Loaded state for database: ${databaseId}`);
        } catch (error) {
          this.log(`Failed to load state file ${jsonFile}: ${error}`);
        }
      }

    } catch (error) {
      this.log(`Failed to read state directory: ${error}`);
    }

    return states;
  }

  /**
   * リモートから最新情報を取得
   */
  private async fetchRemote(): Promise<void> {
    try {
      this.execCommand("git fetch origin", "Fetching remote changes");
    } catch (error) {
      this.log(`Failed to fetch remote: ${error}`);
      throw error;
    }
  }

  /**
   * 指定ブランチをチェックアウト（強制的にリモートから）
   */
  private async checkoutBranch(branchName: string): Promise<void> {
    try {
      // リモートブランチから強制的にローカルブランチを作成/切り替え
      this.execCommand(
        `git checkout -B ${branchName} origin/${branchName}`,
        `Checking out branch: ${branchName}`
      );
    } catch (error) {
      // フォールバック：既存のローカルブランチをチェックアウト
      try {
        this.execCommand(`git checkout ${branchName}`, `Fallback checkout: ${branchName}`);
      } catch (fallbackError) {
        this.log(`Failed to checkout branch ${branchName}: ${error}`);
        throw error;
      }
    }
  }

  /**
   * 現在のブランチ名を取得
   */
  private getCurrentBranch(): string {
    try {
      const result = execSync("git branch --show-current", {
        cwd: this.options.workingDir,
        encoding: "utf-8"
      });
      return result.trim();
    } catch (error) {
      this.log(`Failed to get current branch: ${error}`);
      return "main"; // フォールバック
    }
  }

  /**
   * Gitコマンドの実行
   */
  private execCommand(command: string, description: string): string {
    try {
      this.log(`${description}: ${command}`);
      
      const result = execSync(command, {
        cwd: this.options.workingDir,
        encoding: "utf-8",
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });

      return result.trim();

    } catch (error: any) {
      this.log(`Command failed: ${command}`);
      this.log(`Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * ログ出力
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[GitOperations] ${message}`);
    }
  }

  /**
   * ブランチが存在するかチェック
   */
  async branchExists(branchName: string): Promise<boolean> {
    try {
      this.execCommand(`git show-ref --verify --quiet refs/remotes/origin/${branchName}`, "Checking branch existence");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ワーキングディレクトリの状態確認
   */
  async isWorkingDirectoryClean(): Promise<boolean> {
    try {
      const result = this.execCommand("git status --porcelain", "Checking working directory");
      return result.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * デバッグ用：指定ブランチの最新コミット情報を取得
   */
  async getBranchInfo(branchName: string): Promise<{ hash: string; message: string; date: string } | null> {
    try {
      await this.fetchRemote();
      const result = this.execCommand(
        `git log origin/${branchName} -1 --pretty=format:"%H|%s|%ai"`,
        `Getting branch info: ${branchName}`
      );

      const [hash, message, date] = result.split('|');
      return { hash, message, date };
    } catch {
      return null;
    }
  }
}