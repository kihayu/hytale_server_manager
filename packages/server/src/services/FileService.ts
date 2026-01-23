import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import { spawn } from 'child_process';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
  extension?: string;
  isEditable: boolean;
}

export interface ExtractedFileInfo {
  fileName: string;
  size: number;
  extractedFiles: string[];
}

export class FileService {
  // Cache server paths to avoid repeated database queries
  private serverPathCache: Map<string, string> = new Map();

  /**
   * Get the absolute path for a server's directory from the database
   */
  private async getServerPath(serverId: string): Promise<string> {
    // Check cache first
    const cached = this.serverPathCache.get(serverId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: { serverPath: true },
    });

    if (!server) {
      throw new Error(`Server not found: ${serverId}`);
    }

    const serverPath = path.resolve(server.serverPath);
    this.serverPathCache.set(serverId, serverPath);
    return serverPath;
  }

  /**
   * Clear cache for a server (call when server is updated/deleted)
   */
  clearCache(serverId?: string): void {
    if (serverId) {
      this.serverPathCache.delete(serverId);
    } else {
      this.serverPathCache.clear();
    }
  }

  /**
   * Validate that a path is within the server directory (security)
   */
  private async validatePath(serverId: string, filePath: string): Promise<string> {
    const serverPath = await this.getServerPath(serverId);
    const absolutePath = path.join(serverPath, filePath);
    const normalizedPath = path.normalize(absolutePath);

    // Ensure the path is within the server directory
    if (!normalizedPath.startsWith(serverPath)) {
      throw new Error('Access denied: Path is outside server directory');
    }

    return normalizedPath;
  }

  /**
   * Check if a file is editable based on extension
   */
  private isEditableFile(filename: string): boolean {
    const editableExtensions = [
      '.txt', '.json', '.yml', '.yaml', '.properties', '.conf', '.cfg',
      '.ini', '.log', '.md', '.xml', '.js', '.ts', '.html', '.css',
      '.sh', '.bat', '.cmd', '.ps1', '.toml', '.env'
    ];

    const ext = path.extname(filename).toLowerCase();
    return editableExtensions.includes(ext);
  }

  /**
   * List files and directories in a path
   */
  async listFiles(serverId: string, dirPath: string = ''): Promise<FileInfo[]> {
    const absolutePath = await this.validatePath(serverId, dirPath);

    // Ensure directory exists
    if (!await fs.pathExists(absolutePath)) {
      await fs.ensureDir(absolutePath);
    }

    const items = await fs.readdir(absolutePath);
    const fileInfos: FileInfo[] = [];

    for (const item of items) {
      const itemPath = path.join(absolutePath, item);
      const stats = await fs.stat(itemPath);
      const relativePath = path.join(dirPath, item);

      fileInfos.push({
        name: item,
        path: relativePath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime,
        extension: stats.isFile() ? path.extname(item) : undefined,
        isEditable: stats.isFile() ? this.isEditableFile(item) : false,
      });
    }

    // Sort: directories first, then files alphabetically
    return fileInfos.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Read file contents
   */
  async readFile(serverId: string, filePath: string): Promise<string> {
    const absolutePath = await this.validatePath(serverId, filePath);

    if (!await fs.pathExists(absolutePath)) {
      throw new Error('File not found');
    }

    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot read directory as file');
    }

    // Check file size (limit to 10MB for editing)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      throw new Error('File too large to edit (max 10MB)');
    }

    return await fs.readFile(absolutePath, 'utf-8');
  }

  /**
   * Write/update file contents
   */
  async writeFile(serverId: string, filePath: string, content: string): Promise<void> {
    const absolutePath = await this.validatePath(serverId, filePath);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    await fs.writeFile(absolutePath, content, 'utf-8');
    logger.info(`File written: ${filePath} for server ${serverId}`);
  }

  /**
   * Create a new file
   */
  async createFile(serverId: string, filePath: string, content: string = ''): Promise<void> {
    const absolutePath = await this.validatePath(serverId, filePath);

    if (await fs.pathExists(absolutePath)) {
      throw new Error('File already exists');
    }

    await this.writeFile(serverId, filePath, content);
    logger.info(`File created: ${filePath} for server ${serverId}`);
  }

  /**
   * Create a new directory
   */
  async createDirectory(serverId: string, dirPath: string): Promise<void> {
    const absolutePath = await this.validatePath(serverId, dirPath);

    if (await fs.pathExists(absolutePath)) {
      throw new Error('Directory already exists');
    }

    await fs.ensureDir(absolutePath);
    logger.info(`Directory created: ${dirPath} for server ${serverId}`);
  }

  /**
   * Delete a file or directory
   */
  async delete(serverId: string, itemPath: string): Promise<void> {
    const absolutePath = await this.validatePath(serverId, itemPath);

    if (!await fs.pathExists(absolutePath)) {
      throw new Error('File or directory not found');
    }

    await fs.remove(absolutePath);
    logger.info(`Deleted: ${itemPath} for server ${serverId}`);
  }

  /**
   * Rename/move a file or directory
   */
  async rename(serverId: string, oldPath: string, newPath: string): Promise<void> {
    const oldAbsolutePath = await this.validatePath(serverId, oldPath);
    const newAbsolutePath = await this.validatePath(serverId, newPath);

    if (!await fs.pathExists(oldAbsolutePath)) {
      throw new Error('Source file or directory not found');
    }

    if (await fs.pathExists(newAbsolutePath)) {
      throw new Error('Destination already exists');
    }

    await fs.move(oldAbsolutePath, newAbsolutePath);
    logger.info(`Renamed: ${oldPath} to ${newPath} for server ${serverId}`);
  }

  /**
   * Get file or directory info
   */
  async getInfo(serverId: string, itemPath: string): Promise<FileInfo> {
    const absolutePath = await this.validatePath(serverId, itemPath);

    if (!await fs.pathExists(absolutePath)) {
      throw new Error('File or directory not found');
    }

    const stats = await fs.stat(absolutePath);
    const name = path.basename(itemPath);

    return {
      name,
      path: itemPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime,
      extension: stats.isFile() ? path.extname(name) : undefined,
      isEditable: stats.isFile() ? this.isEditableFile(name) : false,
    };
  }

  /**
   * Upload a file
   */
  async uploadFile(serverId: string, filePath: string, buffer: Buffer): Promise<void> {
    const absolutePath = await this.validatePath(serverId, filePath);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    await fs.writeFile(absolutePath, buffer);
    logger.info(`File uploaded: ${filePath} for server ${serverId}`);
  }

  /**
   * Download a file (get buffer)
   */
  async downloadFile(serverId: string, filePath: string): Promise<Buffer> {
    const absolutePath = await this.validatePath(serverId, filePath);

    if (!await fs.pathExists(absolutePath)) {
      throw new Error('File not found');
    }

    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      throw new Error('Cannot download directory as file');
    }

    return await fs.readFile(absolutePath);
  }

  /**
   * Search files by name pattern
   */
  async searchFiles(serverId: string, pattern: string, dirPath: string = ''): Promise<FileInfo[]> {
    const absolutePath = await this.validatePath(serverId, dirPath);
    const results: FileInfo[] = [];

    const searchRecursive = async (currentPath: string, relativePath: string) => {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stats = await fs.stat(itemPath);

        // Check if name matches pattern (case-insensitive)
        if (item.toLowerCase().includes(pattern.toLowerCase())) {
          results.push({
            name: item,
            path: itemRelativePath,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
            extension: stats.isFile() ? path.extname(item) : undefined,
            isEditable: stats.isFile() ? this.isEditableFile(item) : false,
          });
        }

        // Recurse into directories
        if (stats.isDirectory()) {
          await searchRecursive(itemPath, itemRelativePath);
        }
      }
    };

    await searchRecursive(absolutePath, dirPath);
    return results;
  }

  /**
   * Get disk usage for a server
   */
  async getDiskUsage(serverId: string): Promise<{ total: number; used: number }> {
    const serverPath = await this.getServerPath(serverId);

    const calculateSize = async (dirPath: string): Promise<number> => {
      let totalSize = 0;

      if (!await fs.pathExists(dirPath)) {
        return 0;
      }

      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          totalSize += await calculateSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    };

    const used = await calculateSize(serverPath);

    return {
      total: 0, // Can be implemented with disk space check if needed
      used,
    };
  }

  /**
   * Extract a zip file using native system tools, with fallback to unzipper library
   */
  private async extractZip(zipPath: string, destPath: string): Promise<string[]> {
    // Try native extraction first (better for large files)
    try {
      return await this.extractZipNative(zipPath, destPath);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      // If native tool not found, fall back to unzipper library
      if (error.message?.includes('ENOENT') || error.message?.includes('not found')) {
        logger.info('[FileService] Native extraction tool not available, using unzipper library');
        return await this.extractZipWithLibrary(zipPath, destPath);
      }
      throw err;
    }
  }

  /**
   * Extract using native system tools (PowerShell on Windows, unzip on Linux/Mac)
   */
  private extractZipNative(zipPath: string, destPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';

      let command: string;
      let args: string[];

      if (isWindows) {
        // Use PowerShell's Expand-Archive for reliable extraction on Windows
        command = 'powershell.exe';
        args = [
          '-NoProfile',
          '-Command',
          `Expand-Archive -Path "${zipPath}" -DestinationPath "${destPath}" -Force`,
        ];
      } else {
        // Use unzip on Linux/Mac
        command = 'unzip';
        args = ['-o', zipPath, '-d', destPath];
      }

      logger.info(`[FileService] Running extraction: ${command} ${args.join(' ')}`);

      const proc = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          // Get list of extracted files
          const extractedFiles = await this.getExtractedFiles(destPath);
          resolve(extractedFiles);
        } else {
          reject(new Error(`Extraction failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to start extraction: ${err.message}`));
      });
    });
  }

  /**
   * Extract using unzipper library (fallback when native tools unavailable)
   */
  private extractZipWithLibrary(zipPath: string, destPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const extractedFiles: string[] = [];

      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const filePath = path.join(destPath, fileName);

          // Skip if entry is a directory
          if (entry.type === 'Directory') {
            entry.autodrain();
            return;
          }

          // Track extracted files
          if (!fileName.endsWith('/')) {
            extractedFiles.push(fileName);
          }

          // Create parent directory if needed
          const dir = path.dirname(filePath);
          fs.ensureDirSync(dir);

          // Extract file
          entry.pipe(fs.createWriteStream(filePath));
        })
        .on('close', () => {
          resolve(extractedFiles);
        })
        .on('error', reject);
    });
  }

  /**
   * Get list of files extracted from a zip
   */
  private async getExtractedFiles(destPath: string): Promise<string[]> {
    const files: string[] = [];

    const walkDir = async (dir: string, prefix = '') => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        const relativePath = prefix ? `${prefix}/${item}` : item;

        if (stats.isDirectory()) {
          await walkDir(itemPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    await walkDir(destPath);
    return files;
  }

  /**
   * Upload a file with optional ZIP extraction
   */
  async uploadFileWithExtraction(
    serverId: string,
    filePath: string,
    buffer: Buffer,
    autoExtractZip: boolean = true
  ): Promise<ExtractedFileInfo> {
    const absolutePath = await this.validatePath(serverId, filePath);

    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(absolutePath));

    // Write the file
    await fs.writeFile(absolutePath, buffer);
    logger.info(`File uploaded: ${filePath} for server ${serverId}`);

    // Check if it's a ZIP file and should be extracted
    const isZipFile = filePath.toLowerCase().endsWith('.zip');
    if (isZipFile && autoExtractZip) {
      try {
        const extractDir = path.dirname(absolutePath);
        const extractedFiles = await this.extractZip(absolutePath, extractDir);

        // Delete the original ZIP file after successful extraction
        await fs.remove(absolutePath);
        logger.info(`ZIP extracted and deleted: ${filePath} for server ${serverId}`);

        return {
          fileName: path.basename(filePath),
          size: buffer.length,
          extractedFiles,
        };
      } catch (error) {
        logger.error(`Failed to extract ZIP file ${filePath}:`, error);
        // Delete the uploaded file if extraction failed
        await fs.remove(absolutePath);
        throw new Error(`Failed to extract ZIP file: ${(error as Error).message}`);
      }
    }

    return {
      fileName: path.basename(filePath),
      size: buffer.length,
      extractedFiles: [],
    };
  }
}
