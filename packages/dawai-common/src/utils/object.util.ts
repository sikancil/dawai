class WaterflowPromises {
  private queue: any[] = []
  private output: any[] = []

  add(fn: () => Promise<any>): void {
    this.queue.push(fn)
  }

  // execute the queue of promises in order
  async execute(): Promise<any[]> {
    for (const fn of this.queue) {
      await Promise.resolve()
      try {
        const output = await fn()
        this.output.push(output)
      } catch (err) {
        this.output.push(err)
      }
      // this.output.push(await fn())
    }
    return this.output
  }
}

export class ObjectType {
  static Promise = Symbol.for("promise")
  static String = Symbol.for("string")
  static Number = Symbol.for("number")
  static Bool = Symbol.for("boolean")
  static Object = Symbol.for("object")
  static Array = Symbol.for("array")
  static Function = Symbol.for("function")
  static Symbol = Symbol.for("symbol")
  static Error = Symbol.for("error")
  static Date = Symbol.for("date")
  static Null = Symbol.for("null")
  static Undefined = Symbol.for("undefined")
  static Map = Symbol.for("map")
  static WeakMap = Symbol.for("weakmap")
  static Set = Symbol.for("set")
  static WeakSet = Symbol.for("weakset")
  static RegExp = Symbol.for("regexp")

  // constructor() {}

  public static of(obj: any): symbol {
    const type = ({}.toString.call(obj).split(" ")[1] as string).slice(0, -1).toLowerCase()
    switch (type) {
      case "map":
      case "weakmap":
      case "set":
      case "weakset":
      case "regexp":
        return Symbol.for(type)
      default:
        return Symbol.for(type)
    }
  }

  public static expect(obj: any, type: symbol): boolean {
    const objType = this.of(obj)
    return (
      type === objType ||
      (type === this.Object &&
        (objType === this.Map || objType === this.WeakMap || objType === this.Set || objType === this.WeakSet))
    )
  }

  public static isEmpty(obj: any): boolean {
    switch (this.of(obj)) {
      case this.String:
        return (
          !obj ||
          obj.length === 0 ||
          obj.trim().length === 0 ||
          obj?.toLowerCase() === "null" ||
          obj?.toLowerCase() === "undefined" ||
          obj === "NaN" ||
          obj === "Infinity" ||
          obj === "-Infinity" ||
          obj === ""
        )
      case this.Number:
        return (
          !obj || obj === 0 || obj === 0.0 || obj === -0.0 || Number.isNaN(obj) || obj === Infinity || obj === -Infinity
        )
      case this.Bool:
        return !obj || obj === false
      case this.Object:
        return !obj || Object.keys(obj).length === 0 || Object.getOwnPropertyNames(obj).length === 0
      case this.Array:
        return !obj || obj.length === 0
      case this.Function:
        return !obj
      case this.Symbol:
        return this.isEmpty(obj.description)
      case this.Date:
        return !obj
      case this.Null:
        return !obj
      case this.Undefined:
        return !obj
      case this.Map:
        return !obj || obj.size === 0 || [...obj.keys()].length === 0
      case this.WeakMap:
        // WeakMap has no size property and cannot be iterated (no enumeration)
        return !obj || true
      case this.Set:
        return !obj || obj.size === 0 || [...obj.keys()].length === 0
      case this.WeakSet:
        // WeakSet has no size property and cannot be iterated (no enumeration)
        return !obj || true
      case this.RegExp:
        return !obj || obj.toString() === "/(?:)/"
      default:
        return !obj
    }
  }

  public static apply(o: any, c: any, defaults?: any): any {
    if (defaults) {
      this.apply(o, defaults)
    }
    if (o && c && this.expect(c, this.Object)) {
      for (const p in c) {
        o[p] = c[p]
      }
    }
    return o
  }

  public static applyIf(o: any, c: any): any {
    if (o) {
      for (const p in c) {
        if (!(typeof o[p] !== "undefined")) {
          o[p] = c[p]
        }
      }
    }
    return o
  }

  public static castFrom(obj: any): { [key: string]: any } {
    if (!this.expect(obj, this.Array) || !this.expect(obj, this.Object)) {
      return obj
    }
    const o: { [key: string]: any } =
      Object.getOwnPropertyNames(obj).reduce((p: any, c: string) => ((p[c] = obj[c]), p), {}) || {}
    Object.keys(o).map((_k: string) => {
      const _v: any =
        this.of(o[_k]) === this.Array
          ? o[_k].map((__k: any) => this.castFrom(__k))
          : this.of(o[_k]) === this.Object
            ? this.castFrom(o[_k])
            : o[_k]
      o[_k] = _v
      return _v
    })
    return o
  }

  public static originStackName(stack: string): string {
    const me = "module.exports"
    const fid = stack.split("\n").reduce((p, c) => (c.includes(me) ? c.trim() : p), "")
    return fid.substr(fid.search(me) + me.length + 1, fid.indexOf(" (") - fid.search(me) - me.length - 1)
  }

  public static tryParseInt(value: string | undefined | null, defaultValue = 0): number {
    if (this.isEmpty(value)) return defaultValue
    try {
      return Number.isNaN(parseInt(value as string)) ? defaultValue : parseInt(value as string)
    } catch (e) {
      return defaultValue
    }
  }

  public static tryParseFloat(value: string, defaultValue = 0): number {
    if (this.isEmpty(value)) return defaultValue
    try {
      return Number.isNaN(parseFloat(value)) ? defaultValue : parseFloat(value)
    } catch (e) {
      return defaultValue
    }
  }

  public static tryParseJSON(
    value: string,
    defaultValue: object | Error | null = {
      jsonParser: "invalid content format",
    },
  ): any {
    if (this.isEmpty(value)) return defaultValue
    try {
      return JSON.parse(value)
    } catch (e) {
      return defaultValue
    }
  }

  public static async iteratePromises(data: any[], cb: ((item: any) => Promise<any>) | null = null): Promise<any[]> {
    return new Promise(async (resolve) => {
      const iterOutput: any[] = []
      await data.reduce(async (prev, curr) => {
        await prev
        try {
          iterOutput.push(cb ? await cb(curr) : curr)
        } catch (err) {
          iterOutput.push(err)
        }
      }, Promise.resolve())
      resolve(iterOutput)
    })
  }

  public static WaterflowPromises = WaterflowPromises

  static sortKeys(obj: { [key: string]: any }): { [key: string]: any } {
    return Object.keys(obj)
      .sort()
      .reduce((o: any, k) => {
        o[k] = obj[k]
        return o
      }, {})
  }
}
