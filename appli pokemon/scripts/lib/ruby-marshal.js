class RubyMarshalReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
    this.objects = [];
    this.symbols = [];
  }

  byte() {
    return this.buffer[this.offset++];
  }

  length() {
    const first = this.buffer.readInt8(this.offset++);
    if (first === 0) return 0;
    if (first > 0 && first < 5) {
      let value = 0;
      for (let index = 0; index < first; index += 1) value |= this.byte() << (8 * index);
      return value;
    }
    if (first < 0 && first > -5) {
      let value = -1;
      for (let index = 0; index < -first; index += 1) {
        value &= ~(0xff << (8 * index));
        value |= this.byte() << (8 * index);
      }
      return value;
    }
    return first > 0 ? first - 5 : first + 5;
  }

  value() {
    const type = String.fromCharCode(this.byte());
    if (type === "0") return null;
    if (type === "T") return true;
    if (type === "F") return false;
    if (type === "i") return this.length();
    if (type === "@") return this.objects[this.length()];
    if (type === ";") return this.symbols[this.length()];
    if (type === ":") {
      const symbol = this.rawString().toString("utf8");
      this.symbols.push(symbol);
      return symbol;
    }
    if (type === '"') return this.register(this.rawString());
    if (type === "[") {
      const result = this.register([]);
      const count = this.length();
      for (let index = 0; index < count; index += 1) result.push(this.value());
      return result;
    }
    if (type === "{") {
      const result = this.register(new Map());
      const count = this.length();
      for (let index = 0; index < count; index += 1) result.set(this.value(), this.value());
      return result;
    }
    if (type === "o") {
      const result = this.register({ __class: this.value() });
      const count = this.length();
      for (let index = 0; index < count; index += 1) result[this.value()] = this.value();
      return result;
    }
    if (type === "u") {
      const className = this.value();
      const payload = this.rawString();
      const decoded = className === "OrderedHash" ? new RubyMarshalReader(payload).read() : payload;
      return this.register({ __class: className, __value: decoded });
    }
    if (type === "I") {
      const wrapped = this.value();
      const count = this.length();
      for (let index = 0; index < count; index += 1) {
        this.value();
        this.value();
      }
      return wrapped;
    }
    throw new Error(`Unsupported Ruby Marshal type ${JSON.stringify(type)} at offset ${this.offset - 1}`);
  }

  register(value) {
    this.objects.push(value);
    return value;
  }

  rawString() {
    const length = this.length();
    const result = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  read() {
    const major = this.byte();
    const minor = this.byte();
    if (major !== 4 || minor !== 8) throw new Error(`Unsupported Ruby Marshal version ${major}.${minor}`);
    return this.value();
  }
}

function loadRubyMarshal(buffer) {
  return new RubyMarshalReader(buffer).read();
}

module.exports = { loadRubyMarshal };
