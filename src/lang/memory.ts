export type Location = number;
export type MemoryValue = number;

export class MemoryTable {
  static loc: Location = 0;
  private table = new Map<Location, MemoryValue>();

  get freshLoc() {
    return MemoryTable.loc++;
  }

  read(loc: Location): MemoryValue {
    return this.table.get(loc)!;
  }

  write(loc: Location, value: MemoryValue) {
    return this.table.set(loc, value);
  }

  toString() {
    const s: string[] = [];
    this.table.forEach((val, loc) => s.push(`${loc}:${val}`));
    return `[ ${s.join(" | ")} ]`;
  }
}
