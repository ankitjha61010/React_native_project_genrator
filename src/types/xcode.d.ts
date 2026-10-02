declare module 'xcode' {
  interface PBXProject {
    parseSync(): PBXProject;
    writeSync(): string;
    findPBXGroupKey(criteria: { name?: string; path?: string }): string | undefined;
    pbxFileReferenceSection(): Record<string, unknown>;
    pbxXCBuildConfigurationSection(): Record<string, unknown>;
    getFirstTarget(): { uuid: string };
    addResourceFile(path: string, options: { target: string }, groupKey: string): unknown;
    addSourceFile(path: string, options: { target: string }, groupKey: string): unknown;
    hasFile(path: string): unknown;
    pbxCreateGroup(name: string, pathName?: string): string;
    addToPbxGroup(fileOrGroupKey: string, groupKey: string): void;
    getFirstProject(): { firstProject: { mainGroup: string } };
  }
  const xcode: { project(path: string): PBXProject };
  export default xcode;
}
