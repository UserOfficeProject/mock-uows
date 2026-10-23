import type { User } from '../models/User.ts';

// The only store in the mock server, so every module reads and writes the same users
class UserStore {
  static readonly instance = new UserStore();

  private constructor() {}

  private userNumbers = new Map<string, User>();
  private userEmails = new Map<string, User>();
  private userSessionIds = new Map<string, User>();
  private familyName = new Map<string, Set<string>>();
  private highestUserNumber: number | undefined;

  add(user: User): User {
    const email = user.email.toLowerCase();
    if (this.userNumbers.has(user.userNumber))
      throw new Error(`User ${user.userNumber} already exists`);
    if (this.userEmails.has(email))
      throw new Error(`Email ${user.email} already in use`);
    if (user.sessionId && this.userSessionIds.has(user.sessionId))
      throw new Error(`Session ${user.sessionId} already in use`);

    this.userNumbers.set(user.userNumber, user);
    this.userEmails.set(email, user);
    if (user.sessionId) this.userSessionIds.set(user.sessionId, user);

    const key = user.familyName.toLowerCase();
    let bucket = this.familyName.get(key);
    if (!bucket) {
      bucket = new Set();
      this.familyName.set(key, bucket);
    }
    bucket.add(user.userNumber);

    const userNumber = Number(user.userNumber);
    if (
      Number.isInteger(userNumber) &&
      (this.highestUserNumber === undefined ||
        userNumber > this.highestUserNumber)
    )
      this.highestUserNumber = userNumber;
    return user;
  }

  remove(userNumber: number | string): boolean {
    const user = this.userNumbers.get(String(userNumber));
    if (!user) return false;

    this.userNumbers.delete(user.userNumber);
    this.userEmails.delete(user.email.toLowerCase());
    if (user.sessionId) this.userSessionIds.delete(user.sessionId);

    const key = user.familyName.toLowerCase();
    const bucket = this.familyName.get(key);
    bucket?.delete(user.userNumber);
    if (bucket?.size === 0) this.familyName.delete(key);

    if (Number(user.userNumber) === this.highestUserNumber)
      this.highestUserNumber = this.findHighestUserNumber();
    return true;
  }

  clear(): void {
    this.userNumbers.clear();
    this.userEmails.clear();
    this.userSessionIds.clear();
    this.familyName.clear();
    this.highestUserNumber = undefined;
  }

  get size(): number {
    return this.userNumbers.size;
  }

  get lastUserNumber(): number | undefined {
    return this.highestUserNumber;
  }

  private findHighestUserNumber(): number | undefined {
    let highest: number | undefined;
    for (const key of this.userNumbers.keys()) {
      const userNumber = Number(key);
      if (
        Number.isInteger(userNumber) &&
        (highest === undefined || userNumber > highest)
      )
        highest = userNumber;
    }
    return highest;
  }

  findByUserNumber(userNumber: number | string): User | undefined {
    return this.userNumbers.get(String(userNumber));
  }
  findByEmail(userEmail: string): User | undefined {
    return this.userEmails.get(userEmail.toLowerCase());
  }
  findBySessionId(sessionId: string): User | undefined {
    return this.userSessionIds.get(sessionId);
  }

  findBySurname(userSurname: string): User[] {
    const userNumbers =
      this.familyName.get(userSurname.toLowerCase()) ?? new Set<string>();
    return [...userNumbers].flatMap((n) => this.userNumbers.get(n) ?? []);
  }
}

const userStore = UserStore.instance;

export { userStore };
export type { UserStore };
