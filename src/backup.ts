import Manager from './manager';
import Config from './config';
import fs from 'fs';

export default class Backup {
  /**
   * Define function to dump follows to a file
   */
  static readonly dumpFollows = async (filePath: string, checkFileExists: boolean = false) => {
    await Backup.checkAndWrite(filePath, checkFileExists, () => Manager.getAllFollows(Config.IDENTIFIER!));
  };

  /**
   * Define function to dump followers to a file
   */
  static readonly dumpFollowers = async (filePath: string, checkFileExists: boolean = false) => {
    await Backup.checkAndWrite(filePath, checkFileExists, () => Manager.getAllFollowers(Config.IDENTIFIER!));
  };

  /**
   * Define function to check if a file exists and write to it
   */
  private static readonly checkAndWrite = async (filePath: string, checkFileExists: boolean, contentGetter: () => any) => {
    filePath = `${Config.OUTPUT_FOLDER}${filePath}`;

    // If file exists and checkFileExists is true, skip writing to the file
    if (checkFileExists && await Backup.fileExists(filePath)) {
      console.log(`File already exists: ${filePath}. Skipping...`);
      return;
    }

    // Get content using the provided contentGetter function and write to the file
    const content = await contentGetter();
    await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), { flag: "w" });
  };

  /**
   * Define function to check if a file exists
   * @returns true if file exists, false if not.
   */
  private static readonly fileExists = async (filePath: string): Promise<boolean> => {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  };
}