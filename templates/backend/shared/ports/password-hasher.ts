export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  /** True when the hash was made with other settings/algorithm and should be re-hashed at login. */
  needsRehash(hash: string): boolean;
}
