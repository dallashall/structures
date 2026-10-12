/**
 * Little-endian NBT, the byte order every Bedrock file uses (Java Edition writes big-endian)
 *
 * Values carry their tag type, since a JavaScript number cannot say whether it is a byte or an int.
 */

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_INT = 3;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;

export type NbtValue =
  | { type: 'byte'; value: number }
  | { type: 'int'; value: number }
  | { type: 'string'; value: string }
  | { type: 'list'; itemType: NbtListItemType; items: NbtValue[] }
  | { type: 'compound'; entries: Record<string, NbtValue> };

export type NbtListItemType = Exclude<NbtValue['type'], 'list'> | 'list' | 'end';

export const nbtByte = (value: number): NbtValue => ({ type: 'byte', value });
export const nbtInt = (value: number): NbtValue => ({ type: 'int', value });
export const nbtString = (value: string): NbtValue => ({ type: 'string', value });
export const nbtCompound = (entries: Record<string, NbtValue>): NbtValue => ({ type: 'compound', entries });
export const nbtList = (itemType: NbtListItemType, items: NbtValue[]): NbtValue => ({ type: 'list', itemType, items });

const TAG_IDS: Record<NbtListItemType, number> = {
  end: TAG_END,
  byte: TAG_BYTE,
  int: TAG_INT,
  string: TAG_STRING,
  list: TAG_LIST,
  compound: TAG_COMPOUND,
};

class ByteSink {
  private buffer = new Uint8Array(1024);
  private view = new DataView(this.buffer.buffer);
  private length = 0;
  private readonly encoder = new TextEncoder();

  private reserve(bytes: number): void {
    if (this.length + bytes <= this.buffer.length) return;
    let capacity = this.buffer.length * 2;
    while (capacity < this.length + bytes) capacity *= 2;
    const grown = new Uint8Array(capacity);
    grown.set(this.buffer.subarray(0, this.length));
    this.buffer = grown;
    this.view = new DataView(grown.buffer);
  }

  writeByte(value: number): void {
    this.reserve(1);
    this.view.setInt8(this.length, value);
    this.length += 1;
  }

  writeShort(value: number): void {
    this.reserve(2);
    this.view.setInt16(this.length, value, true);
    this.length += 2;
  }

  writeInt(value: number): void {
    this.reserve(4);
    this.view.setInt32(this.length, value, true);
    this.length += 4;
  }

  writeString(value: string): void {
    const bytes = this.encoder.encode(value);
    this.writeShort(bytes.length);
    this.reserve(bytes.length);
    this.buffer.set(bytes, this.length);
    this.length += bytes.length;
  }

  toBytes(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

function writePayload(sink: ByteSink, value: NbtValue): void {
  switch (value.type) {
    case 'byte':
      sink.writeByte(value.value);
      return;
    case 'int':
      sink.writeInt(value.value);
      return;
    case 'string':
      sink.writeString(value.value);
      return;
    case 'list': {
      sink.writeByte(TAG_IDS[value.itemType]);
      sink.writeInt(value.items.length);
      const writeItem = (item: NbtValue): void => writePayload(sink, item);
      value.items.forEach(writeItem);
      return;
    }
    case 'compound': {
      for (const [name, entry] of Object.entries(value.entries)) {
        sink.writeByte(TAG_IDS[entry.type]);
        sink.writeString(name);
        writePayload(sink, entry);
      }
      sink.writeByte(TAG_END);
      return;
    }
  }
}

/**
 * A complete file: an unnamed root compound
 */
export function writeNbt(root: NbtValue): Uint8Array {
  const sink = new ByteSink();
  sink.writeByte(TAG_IDS[root.type]);
  sink.writeString('');
  writePayload(sink, root);
  return sink.toBytes();
}
