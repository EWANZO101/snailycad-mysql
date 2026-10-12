// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/commons.js
var require_commons = __commonJS({
  "../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/commons.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ERROR_PACKET = exports.PACKET_TYPES_REVERSE = exports.PACKET_TYPES = void 0;
    var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
    exports.PACKET_TYPES = PACKET_TYPES;
    PACKET_TYPES["open"] = "0";
    PACKET_TYPES["close"] = "1";
    PACKET_TYPES["ping"] = "2";
    PACKET_TYPES["pong"] = "3";
    PACKET_TYPES["message"] = "4";
    PACKET_TYPES["upgrade"] = "5";
    PACKET_TYPES["noop"] = "6";
    var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
    exports.PACKET_TYPES_REVERSE = PACKET_TYPES_REVERSE;
    Object.keys(PACKET_TYPES).forEach((key) => {
      PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
    });
    var ERROR_PACKET = { type: "error", data: "parser error" };
    exports.ERROR_PACKET = ERROR_PACKET;
  }
});

// ../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/encodePacket.js
var require_encodePacket = __commonJS({
  "../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/encodePacket.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.encodePacketToBinary = exports.encodePacket = void 0;
    var commons_js_1 = require_commons();
    var encodePacket = ({ type, data }, supportsBinary, callback) => {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        return callback(supportsBinary ? data : "b" + toBuffer(data, true).toString("base64"));
      }
      return callback(commons_js_1.PACKET_TYPES[type] + (data || ""));
    };
    exports.encodePacket = encodePacket;
    var toBuffer = (data, forceBufferConversion) => {
      if (Buffer.isBuffer(data) || data instanceof Uint8Array && !forceBufferConversion) {
        return data;
      } else if (data instanceof ArrayBuffer) {
        return Buffer.from(data);
      } else {
        return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      }
    };
    var TEXT_ENCODER;
    function encodePacketToBinary(packet, callback) {
      if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
        return callback(toBuffer(packet.data, false));
      }
      (0, exports.encodePacket)(packet, true, (encoded) => {
        if (!TEXT_ENCODER) {
          TEXT_ENCODER = new TextEncoder();
        }
        callback(TEXT_ENCODER.encode(encoded));
      });
    }
    exports.encodePacketToBinary = encodePacketToBinary;
  }
});

// ../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/decodePacket.js
var require_decodePacket = __commonJS({
  "../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/decodePacket.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodePacket = void 0;
    var commons_js_1 = require_commons();
    var decodePacket = (encodedPacket, binaryType) => {
      if (typeof encodedPacket !== "string") {
        return {
          type: "message",
          data: mapBinary(encodedPacket, binaryType)
        };
      }
      const type = encodedPacket.charAt(0);
      if (type === "b") {
        const buffer = Buffer.from(encodedPacket.substring(1), "base64");
        return {
          type: "message",
          data: mapBinary(buffer, binaryType)
        };
      }
      if (!commons_js_1.PACKET_TYPES_REVERSE[type]) {
        return commons_js_1.ERROR_PACKET;
      }
      return encodedPacket.length > 1 ? {
        type: commons_js_1.PACKET_TYPES_REVERSE[type],
        data: encodedPacket.substring(1)
      } : {
        type: commons_js_1.PACKET_TYPES_REVERSE[type]
      };
    };
    exports.decodePacket = decodePacket;
    var mapBinary = (data, binaryType) => {
      switch (binaryType) {
        case "arraybuffer":
          if (data instanceof ArrayBuffer) {
            return data;
          } else if (Buffer.isBuffer(data)) {
            return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          } else {
            return data.buffer;
          }
        case "nodebuffer":
        default:
          if (Buffer.isBuffer(data)) {
            return data;
          } else {
            return Buffer.from(data);
          }
      }
    };
  }
});

// ../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/index.js
var require_cjs = __commonJS({
  "../../node_modules/.pnpm/engine.io-parser@5.2.1/node_modules/engine.io-parser/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodePayload = exports.decodePacket = exports.encodePayload = exports.encodePacket = exports.protocol = exports.createPacketDecoderStream = exports.createPacketEncoderStream = void 0;
    var encodePacket_js_1 = require_encodePacket();
    Object.defineProperty(exports, "encodePacket", { enumerable: true, get: function() {
      return encodePacket_js_1.encodePacket;
    } });
    var decodePacket_js_1 = require_decodePacket();
    Object.defineProperty(exports, "decodePacket", { enumerable: true, get: function() {
      return decodePacket_js_1.decodePacket;
    } });
    var commons_js_1 = require_commons();
    var SEPARATOR = String.fromCharCode(30);
    var encodePayload = (packets, callback) => {
      const length = packets.length;
      const encodedPackets = new Array(length);
      let count = 0;
      packets.forEach((packet, i) => {
        (0, encodePacket_js_1.encodePacket)(packet, false, (encodedPacket) => {
          encodedPackets[i] = encodedPacket;
          if (++count === length) {
            callback(encodedPackets.join(SEPARATOR));
          }
        });
      });
    };
    exports.encodePayload = encodePayload;
    var decodePayload = (encodedPayload, binaryType) => {
      const encodedPackets = encodedPayload.split(SEPARATOR);
      const packets = [];
      for (let i = 0; i < encodedPackets.length; i++) {
        const decodedPacket = (0, decodePacket_js_1.decodePacket)(encodedPackets[i], binaryType);
        packets.push(decodedPacket);
        if (decodedPacket.type === "error") {
          break;
        }
      }
      return packets;
    };
    exports.decodePayload = decodePayload;
    function createPacketEncoderStream() {
      return new TransformStream({
        transform(packet, controller) {
          (0, encodePacket_js_1.encodePacketToBinary)(packet, (encodedPacket) => {
            const payloadLength = encodedPacket.length;
            let header;
            if (payloadLength < 126) {
              header = new Uint8Array(1);
              new DataView(header.buffer).setUint8(0, payloadLength);
            } else if (payloadLength < 65536) {
              header = new Uint8Array(3);
              const view = new DataView(header.buffer);
              view.setUint8(0, 126);
              view.setUint16(1, payloadLength);
            } else {
              header = new Uint8Array(9);
              const view = new DataView(header.buffer);
              view.setUint8(0, 127);
              view.setBigUint64(1, BigInt(payloadLength));
            }
            if (packet.data && typeof packet.data !== "string") {
              header[0] |= 128;
            }
            controller.enqueue(header);
            controller.enqueue(encodedPacket);
          });
        }
      });
    }
    exports.createPacketEncoderStream = createPacketEncoderStream;
    var TEXT_DECODER;
    function totalLength(chunks) {
      return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    }
    function concatChunks(chunks, size) {
      if (chunks[0].length === size) {
        return chunks.shift();
      }
      const buffer = new Uint8Array(size);
      let j = 0;
      for (let i = 0; i < size; i++) {
        buffer[i] = chunks[0][j++];
        if (j === chunks[0].length) {
          chunks.shift();
          j = 0;
        }
      }
      if (chunks.length && j < chunks[0].length) {
        chunks[0] = chunks[0].slice(j);
      }
      return buffer;
    }
    function createPacketDecoderStream(maxPayload, binaryType) {
      if (!TEXT_DECODER) {
        TEXT_DECODER = new TextDecoder();
      }
      const chunks = [];
      let state = 0;
      let expectedLength = -1;
      let isBinary = false;
      return new TransformStream({
        transform(chunk, controller) {
          chunks.push(chunk);
          while (true) {
            if (state === 0) {
              if (totalLength(chunks) < 1) {
                break;
              }
              const header = concatChunks(chunks, 1);
              isBinary = (header[0] & 128) === 128;
              expectedLength = header[0] & 127;
              if (expectedLength < 126) {
                state = 3;
              } else if (expectedLength === 126) {
                state = 1;
              } else {
                state = 2;
              }
            } else if (state === 1) {
              if (totalLength(chunks) < 2) {
                break;
              }
              const headerArray = concatChunks(chunks, 2);
              expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
              state = 3;
            } else if (state === 2) {
              if (totalLength(chunks) < 8) {
                break;
              }
              const headerArray = concatChunks(chunks, 8);
              const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
              const n = view.getUint32(0);
              if (n > Math.pow(2, 53 - 32) - 1) {
                controller.enqueue(commons_js_1.ERROR_PACKET);
                break;
              }
              expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
              state = 3;
            } else {
              if (totalLength(chunks) < expectedLength) {
                break;
              }
              const data = concatChunks(chunks, expectedLength);
              controller.enqueue((0, decodePacket_js_1.decodePacket)(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
              state = 0;
            }
            if (expectedLength === 0 || expectedLength > maxPayload) {
              controller.enqueue(commons_js_1.ERROR_PACKET);
              break;
            }
          }
        }
      });
    }
    exports.createPacketDecoderStream = createPacketDecoderStream;
    exports.protocol = 4;
  }
});

// ../../node_modules/.pnpm/@socket.io+component-emitter@3.1.0/node_modules/@socket.io/component-emitter/index.js
var require_component_emitter = __commonJS({
  "../../node_modules/.pnpm/@socket.io+component-emitter@3.1.0/node_modules/@socket.io/component-emitter/index.js"(exports) {
    exports.Emitter = Emitter;
    function Emitter(obj) {
      if (obj)
        return mixin(obj);
    }
    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }
    Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
      return this;
    };
    Emitter.prototype.once = function(event, fn) {
      function on2() {
        this.off(event, on2);
        fn.apply(this, arguments);
      }
      on2.fn = fn;
      this.on(event, on2);
      return this;
    };
    Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }
      var callbacks = this._callbacks["$" + event];
      if (!callbacks)
        return this;
      if (1 == arguments.length) {
        delete this._callbacks["$" + event];
        return this;
      }
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      if (callbacks.length === 0) {
        delete this._callbacks["$" + event];
      }
      return this;
    };
    Emitter.prototype.emit = function(event) {
      this._callbacks = this._callbacks || {};
      var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }
      return this;
    };
    Emitter.prototype.emitReserved = Emitter.prototype.emit;
    Emitter.prototype.listeners = function(event) {
      this._callbacks = this._callbacks || {};
      return this._callbacks["$" + event] || [];
    };
    Emitter.prototype.hasListeners = function(event) {
      return !!this.listeners(event).length;
    };
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/globalThis.js
var require_globalThis = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/globalThis.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.globalThisShim = void 0;
    exports.globalThisShim = global;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/util.js
var require_util = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.byteLength = exports.installTimerFunctions = exports.pick = void 0;
    var globalThis_js_1 = require_globalThis();
    function pick(obj, ...attr) {
      return attr.reduce((acc, k) => {
        if (obj.hasOwnProperty(k)) {
          acc[k] = obj[k];
        }
        return acc;
      }, {});
    }
    exports.pick = pick;
    var NATIVE_SET_TIMEOUT = globalThis_js_1.globalThisShim.setTimeout;
    var NATIVE_CLEAR_TIMEOUT = globalThis_js_1.globalThisShim.clearTimeout;
    function installTimerFunctions(obj, opts) {
      if (opts.useNativeTimers) {
        obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThis_js_1.globalThisShim);
        obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThis_js_1.globalThisShim);
      } else {
        obj.setTimeoutFn = globalThis_js_1.globalThisShim.setTimeout.bind(globalThis_js_1.globalThisShim);
        obj.clearTimeoutFn = globalThis_js_1.globalThisShim.clearTimeout.bind(globalThis_js_1.globalThisShim);
      }
    }
    exports.installTimerFunctions = installTimerFunctions;
    var BASE64_OVERHEAD = 1.33;
    function byteLength(obj) {
      if (typeof obj === "string") {
        return utf8Length(obj);
      }
      return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
    }
    exports.byteLength = byteLength;
    function utf8Length(str) {
      let c = 0, length = 0;
      for (let i = 0, l = str.length; i < l; i++) {
        c = str.charCodeAt(i);
        if (c < 128) {
          length += 1;
        } else if (c < 2048) {
          length += 2;
        } else if (c < 55296 || c >= 57344) {
          length += 3;
        } else {
          i++;
          length += 4;
        }
      }
      return length;
    }
  }
});

// ../../node_modules/.pnpm/ms@2.1.2/node_modules/ms/index.js
var require_ms = __commonJS({
  "../../node_modules/.pnpm/ms@2.1.2/node_modules/ms/index.js"(exports, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/common.js"(exports, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        let i;
        const split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
        const len = split.length;
        for (i = 0; i < len; i++) {
          if (!split[i]) {
            continue;
          }
          namespaces = split[i].replace(/\*/g, ".*?");
          if (namespaces[0] === "-") {
            createDebug.skips.push(new RegExp("^" + namespaces.slice(1) + "$"));
          } else {
            createDebug.names.push(new RegExp("^" + namespaces + "$"));
          }
        }
      }
      function disable() {
        const namespaces = [
          ...createDebug.names.map(toNamespace),
          ...createDebug.skips.map(toNamespace).map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        if (name[name.length - 1] === "*") {
          return true;
        }
        let i;
        let len;
        for (i = 0, len = createDebug.skips.length; i < len; i++) {
          if (createDebug.skips[i].test(name)) {
            return false;
          }
        }
        for (i = 0, len = createDebug.names.length; i < len; i++) {
          if (createDebug.names[i].test(name)) {
            return true;
          }
        }
        return false;
      }
      function toNamespace(regexp) {
        return regexp.toString().substring(2, regexp.toString().length - 2).replace(/\.\*\?$/, "*");
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// ../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/browser.js"(exports, module2) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../node_modules/.pnpm/has-flag@3.0.0/node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../../node_modules/.pnpm/has-flag@3.0.0/node_modules/has-flag/index.js"(exports, module2) {
    "use strict";
    module2.exports = (flag, argv) => {
      argv = argv || process.argv;
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const pos = argv.indexOf(prefix + flag);
      const terminatorPos = argv.indexOf("--");
      return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
    };
  }
});

// ../../node_modules/.pnpm/supports-color@5.5.0/node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../../node_modules/.pnpm/supports-color@5.5.0/node_modules/supports-color/index.js"(exports, module2) {
    "use strict";
    var os = require("os");
    var hasFlag = require_has_flag();
    var env = process.env;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false")) {
      forceColor = false;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = true;
    }
    if ("FORCE_COLOR" in env) {
      forceColor = env.FORCE_COLOR.length === 0 || parseInt(env.FORCE_COLOR, 10) !== 0;
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(stream) {
      if (forceColor === false) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (stream && !stream.isTTY && forceColor !== true) {
        return 0;
      }
      const min = forceColor ? 1 : 0;
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(process.versions.node.split(".")[0]) >= 8 && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      if (env.TERM === "dumb") {
        return min;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: getSupportLevel(process.stdout),
      stderr: getSupportLevel(process.stderr)
    };
  }
});

// ../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/node.js"(exports, module2) {
    var tty = require("tty");
    var util = require("util");
    exports.init = init;
    exports.log = log2;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log2(...args) {
      return process.stderr.write(util.format(...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// ../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/debug@4.3.4_supports-color@5.5.0/node_modules/debug/src/index.js"(exports, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/parseqs.js
var require_parseqs = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/parseqs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decode = exports.encode = void 0;
    function encode(obj) {
      let str = "";
      for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (str.length)
            str += "&";
          str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
        }
      }
      return str;
    }
    exports.encode = encode;
    function decode(qs) {
      let qry = {};
      let pairs = qs.split("&");
      for (let i = 0, l = pairs.length; i < l; i++) {
        let pair = pairs[i].split("=");
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return qry;
    }
    exports.decode = decode;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transport.js
var require_transport = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transport.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Transport = void 0;
    var engine_io_parser_1 = require_cjs();
    var component_emitter_1 = require_component_emitter();
    var util_js_1 = require_util();
    var debug_1 = __importDefault(require_src());
    var parseqs_js_1 = require_parseqs();
    var debug = (0, debug_1.default)("engine.io-client:transport");
    var TransportError = class extends Error {
      constructor(reason, description, context) {
        super(reason);
        this.description = description;
        this.context = context;
        this.type = "TransportError";
      }
    };
    var Transport = class extends component_emitter_1.Emitter {
      /**
       * Transport abstract constructor.
       *
       * @param {Object} opts - options
       * @protected
       */
      constructor(opts) {
        super();
        this.writable = false;
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.opts = opts;
        this.query = opts.query;
        this.socket = opts.socket;
      }
      /**
       * Emits an error.
       *
       * @param {String} reason
       * @param description
       * @param context - the error context
       * @return {Transport} for chaining
       * @protected
       */
      onError(reason, description, context) {
        super.emitReserved("error", new TransportError(reason, description, context));
        return this;
      }
      /**
       * Opens the transport.
       */
      open() {
        this.readyState = "opening";
        this.doOpen();
        return this;
      }
      /**
       * Closes the transport.
       */
      close() {
        if (this.readyState === "opening" || this.readyState === "open") {
          this.doClose();
          this.onClose();
        }
        return this;
      }
      /**
       * Sends multiple packets.
       *
       * @param {Array} packets
       */
      send(packets) {
        if (this.readyState === "open") {
          this.write(packets);
        } else {
          debug("transport is not open, discarding packets");
        }
      }
      /**
       * Called upon open
       *
       * @protected
       */
      onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
      }
      /**
       * Called with data.
       *
       * @param {String} data
       * @protected
       */
      onData(data) {
        const packet = (0, engine_io_parser_1.decodePacket)(data, this.socket.binaryType);
        this.onPacket(packet);
      }
      /**
       * Called with a decoded packet.
       *
       * @protected
       */
      onPacket(packet) {
        super.emitReserved("packet", packet);
      }
      /**
       * Called upon close.
       *
       * @protected
       */
      onClose(details) {
        this.readyState = "closed";
        super.emitReserved("close", details);
      }
      /**
       * Pauses the transport, in order not to lose packets during an upgrade.
       *
       * @param onPause
       */
      pause(onPause) {
      }
      createUri(schema, query = {}) {
        return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
      }
      _hostname() {
        const hostname = this.opts.hostname;
        return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
      }
      _port() {
        if (this.opts.port && (this.opts.secure && Number(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80)) {
          return ":" + this.opts.port;
        } else {
          return "";
        }
      }
      _query(query) {
        const encodedQuery = (0, parseqs_js_1.encode)(query);
        return encodedQuery.length ? "?" + encodedQuery : "";
      }
    };
    exports.Transport = Transport;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/yeast.js
var require_yeast = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/yeast.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.yeast = exports.decode = exports.encode = void 0;
    var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
    var length = 64;
    var map = {};
    var seed = 0;
    var i = 0;
    var prev;
    function encode(num) {
      let encoded = "";
      do {
        encoded = alphabet[num % length] + encoded;
        num = Math.floor(num / length);
      } while (num > 0);
      return encoded;
    }
    exports.encode = encode;
    function decode(str) {
      let decoded = 0;
      for (i = 0; i < str.length; i++) {
        decoded = decoded * length + map[str.charAt(i)];
      }
      return decoded;
    }
    exports.decode = decode;
    function yeast() {
      const now = encode(+/* @__PURE__ */ new Date());
      if (now !== prev)
        return seed = 0, prev = now;
      return now + "." + encode(seed++);
    }
    exports.yeast = yeast;
    for (; i < length; i++)
      map[alphabet[i]] = i;
  }
});

// stub:xhr
var require_xhr = __commonJS({
  "stub:xhr"(exports, module2) {
    module2.exports = function XMLHttpRequest() {
    };
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/xmlhttprequest.js
var require_xmlhttprequest = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/xmlhttprequest.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CookieJar = exports.parse = exports.createCookieJar = exports.XHR = void 0;
    var XMLHttpRequestModule = __importStar(require_xhr());
    exports.XHR = XMLHttpRequestModule.default || XMLHttpRequestModule;
    function createCookieJar() {
      return new CookieJar();
    }
    exports.createCookieJar = createCookieJar;
    function parse(setCookieString) {
      const parts = setCookieString.split("; ");
      const i = parts[0].indexOf("=");
      if (i === -1) {
        return;
      }
      const name = parts[0].substring(0, i).trim();
      if (!name.length) {
        return;
      }
      let value = parts[0].substring(i + 1).trim();
      if (value.charCodeAt(0) === 34) {
        value = value.slice(1, -1);
      }
      const cookie = {
        name,
        value
      };
      for (let j = 1; j < parts.length; j++) {
        const subParts = parts[j].split("=");
        if (subParts.length !== 2) {
          continue;
        }
        const key = subParts[0].trim();
        const value2 = subParts[1].trim();
        switch (key) {
          case "Expires":
            cookie.expires = new Date(value2);
            break;
          case "Max-Age":
            const expiration = /* @__PURE__ */ new Date();
            expiration.setUTCSeconds(expiration.getUTCSeconds() + parseInt(value2, 10));
            cookie.expires = expiration;
            break;
          default:
        }
      }
      return cookie;
    }
    exports.parse = parse;
    var CookieJar = class {
      constructor() {
        this.cookies = /* @__PURE__ */ new Map();
      }
      parseCookies(xhr) {
        const values = xhr.getResponseHeader("set-cookie");
        if (!values) {
          return;
        }
        values.forEach((value) => {
          const parsed = parse(value);
          if (parsed) {
            this.cookies.set(parsed.name, parsed);
          }
        });
      }
      addCookies(xhr) {
        const cookies = [];
        this.cookies.forEach((cookie, name) => {
          var _a;
          if (((_a = cookie.expires) === null || _a === void 0 ? void 0 : _a.getTime()) < Date.now()) {
            this.cookies.delete(name);
          } else {
            cookies.push(`${name}=${cookie.value}`);
          }
        });
        if (cookies.length) {
          xhr.setDisableHeaderCheck(true);
          xhr.setRequestHeader("cookie", cookies.join("; "));
        }
      }
    };
    exports.CookieJar = CookieJar;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/polling.js
var require_polling = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/polling.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Request = exports.Polling = void 0;
    var transport_js_1 = require_transport();
    var debug_1 = __importDefault(require_src());
    var yeast_js_1 = require_yeast();
    var engine_io_parser_1 = require_cjs();
    var xmlhttprequest_js_1 = require_xmlhttprequest();
    var component_emitter_1 = require_component_emitter();
    var util_js_1 = require_util();
    var globalThis_js_1 = require_globalThis();
    var debug = (0, debug_1.default)("engine.io-client:polling");
    function empty() {
    }
    var hasXHR2 = function() {
      const xhr = new xmlhttprequest_js_1.XHR({
        xdomain: false
      });
      return null != xhr.responseType;
    }();
    var Polling = class extends transport_js_1.Transport {
      /**
       * XHR Polling constructor.
       *
       * @param {Object} opts
       * @package
       */
      constructor(opts) {
        super(opts);
        this.polling = false;
        if (typeof location !== "undefined") {
          const isSSL = "https:" === location.protocol;
          let port = location.port;
          if (!port) {
            port = isSSL ? "443" : "80";
          }
          this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
        }
        const forceBase64 = opts && opts.forceBase64;
        this.supportsBinary = hasXHR2 && !forceBase64;
        if (this.opts.withCredentials) {
          this.cookieJar = (0, xmlhttprequest_js_1.createCookieJar)();
        }
      }
      get name() {
        return "polling";
      }
      /**
       * Opens the socket (triggers polling). We write a PING message to determine
       * when the transport is open.
       *
       * @protected
       */
      doOpen() {
        this.poll();
      }
      /**
       * Pauses polling.
       *
       * @param {Function} onPause - callback upon buffers are flushed and transport is paused
       * @package
       */
      pause(onPause) {
        this.readyState = "pausing";
        const pause = () => {
          debug("paused");
          this.readyState = "paused";
          onPause();
        };
        if (this.polling || !this.writable) {
          let total = 0;
          if (this.polling) {
            debug("we are currently polling - waiting to pause");
            total++;
            this.once("pollComplete", function() {
              debug("pre-pause polling complete");
              --total || pause();
            });
          }
          if (!this.writable) {
            debug("we are currently writing - waiting to pause");
            total++;
            this.once("drain", function() {
              debug("pre-pause writing complete");
              --total || pause();
            });
          }
        } else {
          pause();
        }
      }
      /**
       * Starts polling cycle.
       *
       * @private
       */
      poll() {
        debug("polling");
        this.polling = true;
        this.doPoll();
        this.emitReserved("poll");
      }
      /**
       * Overloads onData to detect payloads.
       *
       * @protected
       */
      onData(data) {
        debug("polling got data %s", data);
        const callback = (packet) => {
          if ("opening" === this.readyState && packet.type === "open") {
            this.onOpen();
          }
          if ("close" === packet.type) {
            this.onClose({ description: "transport closed by the server" });
            return false;
          }
          this.onPacket(packet);
        };
        (0, engine_io_parser_1.decodePayload)(data, this.socket.binaryType).forEach(callback);
        if ("closed" !== this.readyState) {
          this.polling = false;
          this.emitReserved("pollComplete");
          if ("open" === this.readyState) {
            this.poll();
          } else {
            debug('ignoring poll - transport state "%s"', this.readyState);
          }
        }
      }
      /**
       * For polling, send a close packet.
       *
       * @protected
       */
      doClose() {
        const close = () => {
          debug("writing close packet");
          this.write([{ type: "close" }]);
        };
        if ("open" === this.readyState) {
          debug("transport open - closing");
          close();
        } else {
          debug("transport not open - deferring close");
          this.once("open", close);
        }
      }
      /**
       * Writes a packets payload.
       *
       * @param {Array} packets - data packets
       * @protected
       */
      write(packets) {
        this.writable = false;
        (0, engine_io_parser_1.encodePayload)(packets, (data) => {
          this.doWrite(data, () => {
            this.writable = true;
            this.emitReserved("drain");
          });
        });
      }
      /**
       * Generates uri for connection.
       *
       * @private
       */
      uri() {
        const schema = this.opts.secure ? "https" : "http";
        const query = this.query || {};
        if (false !== this.opts.timestampRequests) {
          query[this.opts.timestampParam] = (0, yeast_js_1.yeast)();
        }
        if (!this.supportsBinary && !query.sid) {
          query.b64 = 1;
        }
        return this.createUri(schema, query);
      }
      /**
       * Creates a request.
       *
       * @param {String} method
       * @private
       */
      request(opts = {}) {
        Object.assign(opts, { xd: this.xd, cookieJar: this.cookieJar }, this.opts);
        return new Request(this.uri(), opts);
      }
      /**
       * Sends data.
       *
       * @param {String} data to send.
       * @param {Function} called upon flush.
       * @private
       */
      doWrite(data, fn) {
        const req = this.request({
          method: "POST",
          data
        });
        req.on("success", fn);
        req.on("error", (xhrStatus, context) => {
          this.onError("xhr post error", xhrStatus, context);
        });
      }
      /**
       * Starts a poll cycle.
       *
       * @private
       */
      doPoll() {
        debug("xhr poll");
        const req = this.request();
        req.on("data", this.onData.bind(this));
        req.on("error", (xhrStatus, context) => {
          this.onError("xhr poll error", xhrStatus, context);
        });
        this.pollXhr = req;
      }
    };
    exports.Polling = Polling;
    var Request = class extends component_emitter_1.Emitter {
      /**
       * Request constructor
       *
       * @param {Object} options
       * @package
       */
      constructor(uri, opts) {
        super();
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.opts = opts;
        this.method = opts.method || "GET";
        this.uri = uri;
        this.data = void 0 !== opts.data ? opts.data : null;
        this.create();
      }
      /**
       * Creates the XHR object and sends the request.
       *
       * @private
       */
      create() {
        var _a;
        const opts = (0, util_js_1.pick)(this.opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        opts.xdomain = !!this.opts.xd;
        const xhr = this.xhr = new xmlhttprequest_js_1.XHR(opts);
        try {
          debug("xhr open %s: %s", this.method, this.uri);
          xhr.open(this.method, this.uri, true);
          try {
            if (this.opts.extraHeaders) {
              xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
              for (let i in this.opts.extraHeaders) {
                if (this.opts.extraHeaders.hasOwnProperty(i)) {
                  xhr.setRequestHeader(i, this.opts.extraHeaders[i]);
                }
              }
            }
          } catch (e) {
          }
          if ("POST" === this.method) {
            try {
              xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
            } catch (e) {
            }
          }
          try {
            xhr.setRequestHeader("Accept", "*/*");
          } catch (e) {
          }
          (_a = this.opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
          if ("withCredentials" in xhr) {
            xhr.withCredentials = this.opts.withCredentials;
          }
          if (this.opts.requestTimeout) {
            xhr.timeout = this.opts.requestTimeout;
          }
          xhr.onreadystatechange = () => {
            var _a2;
            if (xhr.readyState === 3) {
              (_a2 = this.opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(xhr);
            }
            if (4 !== xhr.readyState)
              return;
            if (200 === xhr.status || 1223 === xhr.status) {
              this.onLoad();
            } else {
              this.setTimeoutFn(() => {
                this.onError(typeof xhr.status === "number" ? xhr.status : 0);
              }, 0);
            }
          };
          debug("xhr data %s", this.data);
          xhr.send(this.data);
        } catch (e) {
          this.setTimeoutFn(() => {
            this.onError(e);
          }, 0);
          return;
        }
        if (typeof document !== "undefined") {
          this.index = Request.requestsCount++;
          Request.requests[this.index] = this;
        }
      }
      /**
       * Called upon error.
       *
       * @private
       */
      onError(err) {
        this.emitReserved("error", err, this.xhr);
        this.cleanup(true);
      }
      /**
       * Cleans up house.
       *
       * @private
       */
      cleanup(fromError) {
        if ("undefined" === typeof this.xhr || null === this.xhr) {
          return;
        }
        this.xhr.onreadystatechange = empty;
        if (fromError) {
          try {
            this.xhr.abort();
          } catch (e) {
          }
        }
        if (typeof document !== "undefined") {
          delete Request.requests[this.index];
        }
        this.xhr = null;
      }
      /**
       * Called upon load.
       *
       * @private
       */
      onLoad() {
        const data = this.xhr.responseText;
        if (data !== null) {
          this.emitReserved("data", data);
          this.emitReserved("success");
          this.cleanup();
        }
      }
      /**
       * Aborts the request.
       *
       * @package
       */
      abort() {
        this.cleanup();
      }
    };
    exports.Request = Request;
    Request.requestsCount = 0;
    Request.requests = {};
    if (typeof document !== "undefined") {
      if (typeof attachEvent === "function") {
        attachEvent("onunload", unloadHandler);
      } else if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globalThis_js_1.globalThisShim ? "pagehide" : "unload";
        addEventListener(terminationEvent, unloadHandler, false);
      }
    }
    function unloadHandler() {
      for (let i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
          Request.requests[i].abort();
        }
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/constants.js"(exports, module2) {
    "use strict";
    module2.exports = {
      BINARY_TYPES: ["nodebuffer", "arraybuffer", "fragments"],
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/buffer-util.js"(exports, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    function concat(list, totalLength) {
      if (list.length === 0)
        return EMPTY_BUFFER;
      if (list.length === 1)
        return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength)
        return target.slice(0, offset);
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data))
        return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = Buffer.from(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48)
            _mask(source, mask, output, offset, length);
          else
            bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32)
            _unmask(buffer, mask);
          else
            bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/limiter.js"(exports, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency)
          return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/permessage-deflate.js"(exports, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin)
          this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin)
            data2 = data2.slice(0, data2.length - 4);
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/validation.js"(exports, module2) {
    "use strict";
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    module2.exports = {
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 150 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/receiver.js"(exports, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._state = GET_INFO;
        this._loop = false;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO)
          return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length)
          return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = buf.slice(n);
          return buf.slice(0, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = buf.slice(n);
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        let err;
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              err = this.getInfo();
              break;
            case GET_PAYLOAD_LENGTH_16:
              err = this.getPayloadLength16();
              break;
            case GET_PAYLOAD_LENGTH_64:
              err = this.getPayloadLength64();
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              err = this.getData(cb);
              break;
            default:
              this._loop = false;
              return;
          }
        } while (this._loop);
        cb(err);
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @return {(RangeError|undefined)} A possible error
       * @private
       */
      getInfo() {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          this._loop = false;
          return error(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          this._loop = false;
          return error(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            this._loop = false;
            return error(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
          }
          if (!this._fragmented) {
            this._loop = false;
            return error(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            this._loop = false;
            return error(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            this._loop = false;
            return error(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
          }
          if (compressed) {
            this._loop = false;
            return error(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
          }
          if (this._payloadLength > 125) {
            this._loop = false;
            return error(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
          }
        } else {
          this._loop = false;
          return error(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
        }
        if (!this._fin && !this._fragmented)
          this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            this._loop = false;
            return error(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
          }
        } else if (this._masked) {
          this._loop = false;
          return error(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
        }
        if (this._payloadLength === 126)
          this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127)
          this._state = GET_PAYLOAD_LENGTH_64;
        else
          return this.haveLength();
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @return {(RangeError|undefined)} A possible error
       * @private
       */
      getPayloadLength16() {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        return this.haveLength();
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @return {(RangeError|undefined)} A possible error
       * @private
       */
      getPayloadLength64() {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          this._loop = false;
          return error(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        return this.haveLength();
      }
      /**
       * Payload length has been read.
       *
       * @return {(RangeError|undefined)} A possible error
       * @private
       */
      haveLength() {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            this._loop = false;
            return error(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
          }
        }
        if (this._masked)
          this._state = GET_MASK;
        else
          this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7)
          return this.controlMessage(data);
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        return this.dataMessage();
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err)
            return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              return cb(
                error(
                  RangeError,
                  "Max payload size exceeded",
                  false,
                  1009,
                  "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
                )
              );
            }
            this._fragments.push(buf);
          }
          const er = this.dataMessage();
          if (er)
            return cb(er);
          this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @return {(Error|undefined)} A possible error
       * @private
       */
      dataMessage() {
        if (this._fin) {
          const messageLength = this._messageLength;
          const fragments = this._fragments;
          this._totalPayloadLength = 0;
          this._messageLength = 0;
          this._fragmented = 0;
          this._fragments = [];
          if (this._opcode === 2) {
            let data;
            if (this._binaryType === "nodebuffer") {
              data = concat(fragments, messageLength);
            } else if (this._binaryType === "arraybuffer") {
              data = toArrayBuffer(concat(fragments, messageLength));
            } else {
              data = fragments;
            }
            this.emit("message", data, true);
          } else {
            const buf = concat(fragments, messageLength);
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              this._loop = false;
              return error(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
            }
            this.emit("message", buf, false);
          }
        }
        this._state = GET_INFO;
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data) {
        if (this._opcode === 8) {
          this._loop = false;
          if (data.length === 0) {
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else if (data.length === 1) {
            return error(
              RangeError,
              "invalid payload length 1",
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              return error(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
            }
            const buf = data.slice(2);
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              return error(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
            }
            this.emit("conclude", code, buf);
            this.end();
          }
        } else if (this._opcode === 9) {
          this.emit("ping", data);
        } else {
          this.emit("pong", data);
        }
        this._state = GET_INFO;
      }
    };
    module2.exports = Receiver;
    function error(ErrorCtor, message, prefix, statusCode, errorCode) {
      const err = new ErrorCtor(
        prefix ? `Invalid WebSocket frame: ${message}` : message
      );
      Error.captureStackTrace(err, error);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/sender.js"(exports, module2) {
    "use strict";
    var net = require("net");
    var tls = require("tls");
    var { randomFillSync } = require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER } = require_constants();
    var { isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var Sender = class {
      /**
       * Creates a Sender instance.
       *
       * @param {(net.Socket|tls.Socket)} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket2, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket2;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._deflating = false;
        this._queue = [];
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            randomFillSync(mask, 0, 4);
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1)
          target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask)
          return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking)
          return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (this._deflating) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin)
          this._firstFragment = true;
        if (perMessageDeflate) {
          const opts = {
            [kByteLength]: byteLength,
            fin: options.fin,
            generateMask: this._generateMask,
            mask: options.mask,
            maskBuffer: this._maskBuffer,
            opcode,
            readOnly,
            rsv1
          };
          if (this._deflating) {
            this.enqueue([this.dispatch, data, this._compress, opts, cb]);
          } else {
            this.dispatch(data, this._compress, opts, cb);
          }
        } else {
          this.sendFrame(
            Sender.frame(data, {
              [kByteLength]: byteLength,
              fin: options.fin,
              generateMask: this._generateMask,
              mask: options.mask,
              maskBuffer: this._maskBuffer,
              opcode,
              readOnly,
              rsv1: false
            }),
            cb
          );
        }
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._deflating = true;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            if (typeof cb === "function")
              cb(err);
            for (let i = 0; i < this._queue.length; i++) {
              const params = this._queue[i];
              const callback = params[params.length - 1];
              if (typeof callback === "function")
                callback(err);
            }
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._deflating = false;
          options.readOnly = false;
          this.sendFrame(Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (!this._deflating && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {Buffer[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/event-target.js"(exports, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/extension.js"(exports, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0)
        dest[name] = [elem];
      else
        dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1)
              start = i;
            else if (!mustUnescape)
              mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1)
                start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1)
        end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations))
          configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values))
                values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/websocket.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Readable } = require("stream");
    var { URL } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener: addEventListener2, removeEventListener: removeEventListener2 }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._isServer = true;
        }
      }
      /**
       * This deviates from the WHATWG interface since ws doesn't support the
       * required default "blob" type (instead we define a custom "nodebuffer"
       * type).
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type))
          return;
        this._binaryType = type;
        if (this._receiver)
          this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket)
          return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {(net.Socket|tls.Socket)} socket The network socket between the
       *     server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket2, head, options) {
        const receiver = new Receiver({
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        this._sender = new Sender(socket2, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._socket = socket2;
        receiver[kWebSocket] = this;
        socket2[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        socket2.setTimeout(0);
        socket2.setNoDelay();
        if (head.length > 0)
          socket2.unshift(head);
        socket2.on("close", socketOnClose);
        socket2.on("data", socketOnData);
        socket2.on("end", socketOnEnd);
        socket2.on("error", socketOnError);
        this._readyState = WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === WebSocket.CLOSED)
          return;
        if (this.readyState === WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          return abortHandshake(this, this._req, msg);
        }
        if (this.readyState === WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err)
            return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._closeTimer = setTimeout(
          this._socket.destroy.bind(this._socket),
          closeTimeout
        );
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain)
          this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === WebSocket.CLOSED)
          return;
        if (this.readyState === WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          return abortHandshake(this, this._req, msg);
        }
        if (this._socket) {
          this._readyState = WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute])
              return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function")
            return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener2;
    WebSocket.prototype.removeEventListener = removeEventListener2;
    module2.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        createConnection: void 0,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL) {
        parsedUrl = address;
        websocket._url = address.href;
      } else {
        try {
          parsedUrl = new URL(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
        websocket._url = address;
      }
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = isSecure ? tlsConnect : netConnect;
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost)
              delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted])
          return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location2 = res.headers.location;
        const statusCode = res.statusCode;
        if (location2 && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL(location2, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location2}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket2, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING)
          return;
        req = websocket._req = null;
        if (res.headers.upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket2, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket2, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket2, protError);
          return;
        }
        if (serverProt)
          websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket2, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket2, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket2, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket2, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket2, head, {
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      req.end();
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = toBuffer(data).length;
        if (websocket._socket)
          websocket._sender._bufferedBytes += length;
        else
          websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        cb(err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0)
        return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005)
        websocket.close();
      else
        websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused)
        websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      websocket.emit("error", err);
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      websocket.pong(data, !websocket._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/stream.js"(exports, module2) {
    "use strict";
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data))
          ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed)
          return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed)
          return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called)
            callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy)
          ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null)
          return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted)
            duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused)
          ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream;
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/subprotocol.js"(exports, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/lib/websocket-server.js"(exports, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var https = require("https");
    var net = require("net");
    var tls = require("tls");
    var { createHash } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket2, head) => {
              this.handleUpgrade(req, socket2, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true)
          options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server)
          return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb)
          this.once("close", cb);
        if (this._state === CLOSING)
          return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path)
            return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {(net.Socket|tls.Socket)} socket The network socket between the
       *     server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket2, head, cb) {
        socket2.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket2, 405, message);
          return;
        }
        if (req.headers.upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket2, 400, message);
          return;
        }
        if (!key || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket2, 400, message);
          return;
        }
        if (version !== 8 && version !== 13) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket2, 400, message);
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket2, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket2, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket2, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket2, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket2,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info))
            return abortHandshake(socket2, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket2, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {(net.Socket|tls.Socket)} socket The network socket between the
       *     server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket2, head, cb) {
        if (!socket2.readable || !socket2.writable)
          return socket2.destroy();
        if (socket2[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING)
          return abortHandshake(socket2, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket2.write(headers.concat("\r\n").join("\r\n"));
        socket2.removeListener("error", socketOnError);
        ws.setSocket(socket2, head, {
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map))
        server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket2, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket2.once("finish", socket2.destroy);
      socket2.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket2, code, message) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket2, req);
      } else {
        abortHandshake(socket2, code, message);
      }
    }
  }
});

// ../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/index.js
var require_ws = __commonJS({
  "../../node_modules/.pnpm/ws@8.11.0/node_modules/ws/index.js"(exports, module2) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module2.exports = WebSocket;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/websocket-constructor.js
var require_websocket_constructor = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/websocket-constructor.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nextTick = exports.defaultBinaryType = exports.usingBrowserWebSocket = exports.WebSocket = void 0;
    var ws_1 = __importDefault(require_ws());
    exports.WebSocket = ws_1.default;
    exports.usingBrowserWebSocket = false;
    exports.defaultBinaryType = "nodebuffer";
    exports.nextTick = process.nextTick;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/websocket.js
var require_websocket2 = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/websocket.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WS = void 0;
    var transport_js_1 = require_transport();
    var yeast_js_1 = require_yeast();
    var util_js_1 = require_util();
    var websocket_constructor_js_1 = require_websocket_constructor();
    var debug_1 = __importDefault(require_src());
    var engine_io_parser_1 = require_cjs();
    var debug = (0, debug_1.default)("engine.io-client:websocket");
    var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
    var WS = class extends transport_js_1.Transport {
      /**
       * WebSocket transport constructor.
       *
       * @param {Object} opts - connection options
       * @protected
       */
      constructor(opts) {
        super(opts);
        this.supportsBinary = !opts.forceBase64;
      }
      get name() {
        return "websocket";
      }
      doOpen() {
        if (!this.check()) {
          return;
        }
        const uri = this.uri();
        const protocols = this.opts.protocols;
        const opts = isReactNative ? {} : (0, util_js_1.pick)(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        if (this.opts.extraHeaders) {
          opts.headers = this.opts.extraHeaders;
        }
        try {
          this.ws = websocket_constructor_js_1.usingBrowserWebSocket && !isReactNative ? protocols ? new websocket_constructor_js_1.WebSocket(uri, protocols) : new websocket_constructor_js_1.WebSocket(uri) : new websocket_constructor_js_1.WebSocket(uri, protocols, opts);
        } catch (err) {
          return this.emitReserved("error", err);
        }
        this.ws.binaryType = this.socket.binaryType;
        this.addEventListeners();
      }
      /**
       * Adds event listeners to the socket
       *
       * @private
       */
      addEventListeners() {
        this.ws.onopen = () => {
          if (this.opts.autoUnref) {
            this.ws._socket.unref();
          }
          this.onOpen();
        };
        this.ws.onclose = (closeEvent) => this.onClose({
          description: "websocket connection closed",
          context: closeEvent
        });
        this.ws.onmessage = (ev) => this.onData(ev.data);
        this.ws.onerror = (e) => this.onError("websocket error", e);
      }
      write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const lastPacket = i === packets.length - 1;
          (0, engine_io_parser_1.encodePacket)(packet, this.supportsBinary, (data) => {
            const opts = {};
            if (!websocket_constructor_js_1.usingBrowserWebSocket) {
              if (packet.options) {
                opts.compress = packet.options.compress;
              }
              if (this.opts.perMessageDeflate) {
                const len = (
                  // @ts-ignore
                  "string" === typeof data ? Buffer.byteLength(data) : data.length
                );
                if (len < this.opts.perMessageDeflate.threshold) {
                  opts.compress = false;
                }
              }
            }
            try {
              if (websocket_constructor_js_1.usingBrowserWebSocket) {
                this.ws.send(data);
              } else {
                this.ws.send(data, opts);
              }
            } catch (e) {
              debug("websocket closed before onclose event");
            }
            if (lastPacket) {
              (0, websocket_constructor_js_1.nextTick)(() => {
                this.writable = true;
                this.emitReserved("drain");
              }, this.setTimeoutFn);
            }
          });
        }
      }
      doClose() {
        if (typeof this.ws !== "undefined") {
          this.ws.close();
          this.ws = null;
        }
      }
      /**
       * Generates uri for connection.
       *
       * @private
       */
      uri() {
        const schema = this.opts.secure ? "wss" : "ws";
        const query = this.query || {};
        if (this.opts.timestampRequests) {
          query[this.opts.timestampParam] = (0, yeast_js_1.yeast)();
        }
        if (!this.supportsBinary) {
          query.b64 = 1;
        }
        return this.createUri(schema, query);
      }
      /**
       * Feature detection for WebSocket.
       *
       * @return {Boolean} whether this transport is available.
       * @private
       */
      check() {
        return !!websocket_constructor_js_1.WebSocket;
      }
    };
    exports.WS = WS;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/webtransport.js
var require_webtransport = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/webtransport.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WT = void 0;
    var transport_js_1 = require_transport();
    var websocket_constructor_js_1 = require_websocket_constructor();
    var engine_io_parser_1 = require_cjs();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:webtransport");
    var WT = class extends transport_js_1.Transport {
      get name() {
        return "webtransport";
      }
      doOpen() {
        if (typeof WebTransport !== "function") {
          return;
        }
        this.transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
        this.transport.closed.then(() => {
          debug("transport closed gracefully");
          this.onClose();
        }).catch((err) => {
          debug("transport closed due to %s", err);
          this.onError("webtransport error", err);
        });
        this.transport.ready.then(() => {
          this.transport.createBidirectionalStream().then((stream) => {
            const decoderStream = (0, engine_io_parser_1.createPacketDecoderStream)(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
            const reader = stream.readable.pipeThrough(decoderStream).getReader();
            const encoderStream = (0, engine_io_parser_1.createPacketEncoderStream)();
            encoderStream.readable.pipeTo(stream.writable);
            this.writer = encoderStream.writable.getWriter();
            const read = () => {
              reader.read().then(({ done, value }) => {
                if (done) {
                  debug("session is closed");
                  return;
                }
                debug("received chunk: %o", value);
                this.onPacket(value);
                read();
              }).catch((err) => {
                debug("an error occurred while reading: %s", err);
              });
            };
            read();
            const packet = { type: "open" };
            if (this.query.sid) {
              packet.data = `{"sid":"${this.query.sid}"}`;
            }
            this.writer.write(packet).then(() => this.onOpen());
          });
        });
      }
      write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const lastPacket = i === packets.length - 1;
          this.writer.write(packet).then(() => {
            if (lastPacket) {
              (0, websocket_constructor_js_1.nextTick)(() => {
                this.writable = true;
                this.emitReserved("drain");
              }, this.setTimeoutFn);
            }
          });
        }
      }
      doClose() {
        var _a;
        (_a = this.transport) === null || _a === void 0 ? void 0 : _a.close();
      }
    };
    exports.WT = WT;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/index.js
var require_transports = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/transports/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.transports = void 0;
    var polling_js_1 = require_polling();
    var websocket_js_1 = require_websocket2();
    var webtransport_js_1 = require_webtransport();
    exports.transports = {
      websocket: websocket_js_1.WS,
      webtransport: webtransport_js_1.WT,
      polling: polling_js_1.Polling
    };
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/parseuri.js
var require_parseuri = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/contrib/parseuri.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = void 0;
    var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
    var parts = [
      "source",
      "protocol",
      "authority",
      "userInfo",
      "user",
      "password",
      "host",
      "port",
      "relative",
      "path",
      "directory",
      "file",
      "query",
      "anchor"
    ];
    function parse(str) {
      const src = str, b = str.indexOf("["), e = str.indexOf("]");
      if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
      }
      let m = re.exec(str || ""), uri = {}, i = 14;
      while (i--) {
        uri[parts[i]] = m[i] || "";
      }
      if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
        uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
        uri.ipv6uri = true;
      }
      uri.pathNames = pathNames(uri, uri["path"]);
      uri.queryKey = queryKey(uri, uri["query"]);
      return uri;
    }
    exports.parse = parse;
    function pathNames(obj, path) {
      const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
      if (path.slice(0, 1) == "/" || path.length === 0) {
        names.splice(0, 1);
      }
      if (path.slice(-1) == "/") {
        names.splice(names.length - 1, 1);
      }
      return names;
    }
    function queryKey(uri, query) {
      const data = {};
      query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
        if ($1) {
          data[$1] = $2;
        }
      });
      return data;
    }
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/socket.js
var require_socket = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/socket.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Socket = void 0;
    var index_js_1 = require_transports();
    var util_js_1 = require_util();
    var parseqs_js_1 = require_parseqs();
    var parseuri_js_1 = require_parseuri();
    var debug_1 = __importDefault(require_src());
    var component_emitter_1 = require_component_emitter();
    var engine_io_parser_1 = require_cjs();
    var websocket_constructor_js_1 = require_websocket_constructor();
    var debug = (0, debug_1.default)("engine.io-client:socket");
    var Socket = class extends component_emitter_1.Emitter {
      /**
       * Socket constructor.
       *
       * @param {String|Object} uri - uri or options
       * @param {Object} opts - options
       */
      constructor(uri, opts = {}) {
        super();
        this.binaryType = websocket_constructor_js_1.defaultBinaryType;
        this.writeBuffer = [];
        if (uri && "object" === typeof uri) {
          opts = uri;
          uri = null;
        }
        if (uri) {
          uri = (0, parseuri_js_1.parse)(uri);
          opts.hostname = uri.host;
          opts.secure = uri.protocol === "https" || uri.protocol === "wss";
          opts.port = uri.port;
          if (uri.query)
            opts.query = uri.query;
        } else if (opts.host) {
          opts.hostname = (0, parseuri_js_1.parse)(opts.host).host;
        }
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
        if (opts.hostname && !opts.port) {
          opts.port = this.secure ? "443" : "80";
        }
        this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
        this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
        this.transports = opts.transports || [
          "polling",
          "websocket",
          "webtransport"
        ];
        this.writeBuffer = [];
        this.prevBufferLen = 0;
        this.opts = Object.assign({
          path: "/engine.io",
          agent: false,
          withCredentials: false,
          upgrade: true,
          timestampParam: "t",
          rememberUpgrade: false,
          addTrailingSlash: true,
          rejectUnauthorized: true,
          perMessageDeflate: {
            threshold: 1024
          },
          transportOptions: {},
          closeOnBeforeunload: false
        }, opts);
        this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
        if (typeof this.opts.query === "string") {
          this.opts.query = (0, parseqs_js_1.decode)(this.opts.query);
        }
        this.id = null;
        this.upgrades = null;
        this.pingInterval = null;
        this.pingTimeout = null;
        this.pingTimeoutTimer = null;
        if (typeof addEventListener === "function") {
          if (this.opts.closeOnBeforeunload) {
            this.beforeunloadEventListener = () => {
              if (this.transport) {
                this.transport.removeAllListeners();
                this.transport.close();
              }
            };
            addEventListener("beforeunload", this.beforeunloadEventListener, false);
          }
          if (this.hostname !== "localhost") {
            this.offlineEventListener = () => {
              this.onClose("transport close", {
                description: "network connection lost"
              });
            };
            addEventListener("offline", this.offlineEventListener, false);
          }
        }
        this.open();
      }
      /**
       * Creates transport of the given type.
       *
       * @param {String} name - transport name
       * @return {Transport}
       * @private
       */
      createTransport(name) {
        debug('creating transport "%s"', name);
        const query = Object.assign({}, this.opts.query);
        query.EIO = engine_io_parser_1.protocol;
        query.transport = name;
        if (this.id)
          query.sid = this.id;
        const opts = Object.assign({}, this.opts, {
          query,
          socket: this,
          hostname: this.hostname,
          secure: this.secure,
          port: this.port
        }, this.opts.transportOptions[name]);
        debug("options: %j", opts);
        return new index_js_1.transports[name](opts);
      }
      /**
       * Initializes transport to use and starts probe.
       *
       * @private
       */
      open() {
        let transport;
        if (this.opts.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1) {
          transport = "websocket";
        } else if (0 === this.transports.length) {
          this.setTimeoutFn(() => {
            this.emitReserved("error", "No transports available");
          }, 0);
          return;
        } else {
          transport = this.transports[0];
        }
        this.readyState = "opening";
        try {
          transport = this.createTransport(transport);
        } catch (e) {
          debug("error while creating transport: %s", e);
          this.transports.shift();
          this.open();
          return;
        }
        transport.open();
        this.setTransport(transport);
      }
      /**
       * Sets the current transport. Disables the existing one (if any).
       *
       * @private
       */
      setTransport(transport) {
        debug("setting transport %s", transport.name);
        if (this.transport) {
          debug("clearing existing transport %s", this.transport.name);
          this.transport.removeAllListeners();
        }
        this.transport = transport;
        transport.on("drain", this.onDrain.bind(this)).on("packet", this.onPacket.bind(this)).on("error", this.onError.bind(this)).on("close", (reason) => this.onClose("transport close", reason));
      }
      /**
       * Probes a transport.
       *
       * @param {String} name - transport name
       * @private
       */
      probe(name) {
        debug('probing transport "%s"', name);
        let transport = this.createTransport(name);
        let failed = false;
        Socket.priorWebsocketSuccess = false;
        const onTransportOpen = () => {
          if (failed)
            return;
          debug('probe transport "%s" opened', name);
          transport.send([{ type: "ping", data: "probe" }]);
          transport.once("packet", (msg) => {
            if (failed)
              return;
            if ("pong" === msg.type && "probe" === msg.data) {
              debug('probe transport "%s" pong', name);
              this.upgrading = true;
              this.emitReserved("upgrading", transport);
              if (!transport)
                return;
              Socket.priorWebsocketSuccess = "websocket" === transport.name;
              debug('pausing current transport "%s"', this.transport.name);
              this.transport.pause(() => {
                if (failed)
                  return;
                if ("closed" === this.readyState)
                  return;
                debug("changing transport and sending upgrade packet");
                cleanup();
                this.setTransport(transport);
                transport.send([{ type: "upgrade" }]);
                this.emitReserved("upgrade", transport);
                transport = null;
                this.upgrading = false;
                this.flush();
              });
            } else {
              debug('probe transport "%s" failed', name);
              const err = new Error("probe error");
              err.transport = transport.name;
              this.emitReserved("upgradeError", err);
            }
          });
        };
        function freezeTransport() {
          if (failed)
            return;
          failed = true;
          cleanup();
          transport.close();
          transport = null;
        }
        const onerror = (err) => {
          const error = new Error("probe error: " + err);
          error.transport = transport.name;
          freezeTransport();
          debug('probe transport "%s" failed because of error: %s', name, err);
          this.emitReserved("upgradeError", error);
        };
        function onTransportClose() {
          onerror("transport closed");
        }
        function onclose() {
          onerror("socket closed");
        }
        function onupgrade(to) {
          if (transport && to.name !== transport.name) {
            debug('"%s" works - aborting "%s"', to.name, transport.name);
            freezeTransport();
          }
        }
        const cleanup = () => {
          transport.removeListener("open", onTransportOpen);
          transport.removeListener("error", onerror);
          transport.removeListener("close", onTransportClose);
          this.off("close", onclose);
          this.off("upgrading", onupgrade);
        };
        transport.once("open", onTransportOpen);
        transport.once("error", onerror);
        transport.once("close", onTransportClose);
        this.once("close", onclose);
        this.once("upgrading", onupgrade);
        if (this.upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
          this.setTimeoutFn(() => {
            if (!failed) {
              transport.open();
            }
          }, 200);
        } else {
          transport.open();
        }
      }
      /**
       * Called when connection is deemed open.
       *
       * @private
       */
      onOpen() {
        debug("socket open");
        this.readyState = "open";
        Socket.priorWebsocketSuccess = "websocket" === this.transport.name;
        this.emitReserved("open");
        this.flush();
        if ("open" === this.readyState && this.opts.upgrade) {
          debug("starting upgrade probes");
          let i = 0;
          const l = this.upgrades.length;
          for (; i < l; i++) {
            this.probe(this.upgrades[i]);
          }
        }
      }
      /**
       * Handles a packet.
       *
       * @private
       */
      onPacket(packet) {
        if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
          debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
          this.emitReserved("packet", packet);
          this.emitReserved("heartbeat");
          this.resetPingTimeout();
          switch (packet.type) {
            case "open":
              this.onHandshake(JSON.parse(packet.data));
              break;
            case "ping":
              this.sendPacket("pong");
              this.emitReserved("ping");
              this.emitReserved("pong");
              break;
            case "error":
              const err = new Error("server error");
              err.code = packet.data;
              this.onError(err);
              break;
            case "message":
              this.emitReserved("data", packet.data);
              this.emitReserved("message", packet.data);
              break;
          }
        } else {
          debug('packet received with socket readyState "%s"', this.readyState);
        }
      }
      /**
       * Called upon handshake completion.
       *
       * @param {Object} data - handshake obj
       * @private
       */
      onHandshake(data) {
        this.emitReserved("handshake", data);
        this.id = data.sid;
        this.transport.query.sid = data.sid;
        this.upgrades = this.filterUpgrades(data.upgrades);
        this.pingInterval = data.pingInterval;
        this.pingTimeout = data.pingTimeout;
        this.maxPayload = data.maxPayload;
        this.onOpen();
        if ("closed" === this.readyState)
          return;
        this.resetPingTimeout();
      }
      /**
       * Sets and resets ping timeout timer based on server pings.
       *
       * @private
       */
      resetPingTimeout() {
        this.clearTimeoutFn(this.pingTimeoutTimer);
        this.pingTimeoutTimer = this.setTimeoutFn(() => {
          this.onClose("ping timeout");
        }, this.pingInterval + this.pingTimeout);
        if (this.opts.autoUnref) {
          this.pingTimeoutTimer.unref();
        }
      }
      /**
       * Called on `drain` event
       *
       * @private
       */
      onDrain() {
        this.writeBuffer.splice(0, this.prevBufferLen);
        this.prevBufferLen = 0;
        if (0 === this.writeBuffer.length) {
          this.emitReserved("drain");
        } else {
          this.flush();
        }
      }
      /**
       * Flush write buffers.
       *
       * @private
       */
      flush() {
        if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
          const packets = this.getWritablePackets();
          debug("flushing %d packets in socket", packets.length);
          this.transport.send(packets);
          this.prevBufferLen = packets.length;
          this.emitReserved("flush");
        }
      }
      /**
       * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
       * long-polling)
       *
       * @private
       */
      getWritablePackets() {
        const shouldCheckPayloadSize = this.maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
        if (!shouldCheckPayloadSize) {
          return this.writeBuffer;
        }
        let payloadSize = 1;
        for (let i = 0; i < this.writeBuffer.length; i++) {
          const data = this.writeBuffer[i].data;
          if (data) {
            payloadSize += (0, util_js_1.byteLength)(data);
          }
          if (i > 0 && payloadSize > this.maxPayload) {
            debug("only send %d out of %d packets", i, this.writeBuffer.length);
            return this.writeBuffer.slice(0, i);
          }
          payloadSize += 2;
        }
        debug("payload size is %d (max: %d)", payloadSize, this.maxPayload);
        return this.writeBuffer;
      }
      /**
       * Sends a message.
       *
       * @param {String} msg - message.
       * @param {Object} options.
       * @param {Function} callback function.
       * @return {Socket} for chaining.
       */
      write(msg, options, fn) {
        this.sendPacket("message", msg, options, fn);
        return this;
      }
      send(msg, options, fn) {
        this.sendPacket("message", msg, options, fn);
        return this;
      }
      /**
       * Sends a packet.
       *
       * @param {String} type: packet type.
       * @param {String} data.
       * @param {Object} options.
       * @param {Function} fn - callback function.
       * @private
       */
      sendPacket(type, data, options, fn) {
        if ("function" === typeof data) {
          fn = data;
          data = void 0;
        }
        if ("function" === typeof options) {
          fn = options;
          options = null;
        }
        if ("closing" === this.readyState || "closed" === this.readyState) {
          return;
        }
        options = options || {};
        options.compress = false !== options.compress;
        const packet = {
          type,
          data,
          options
        };
        this.emitReserved("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (fn)
          this.once("flush", fn);
        this.flush();
      }
      /**
       * Closes the connection.
       */
      close() {
        const close = () => {
          this.onClose("forced close");
          debug("socket closing - telling transport to close");
          this.transport.close();
        };
        const cleanupAndClose = () => {
          this.off("upgrade", cleanupAndClose);
          this.off("upgradeError", cleanupAndClose);
          close();
        };
        const waitForUpgrade = () => {
          this.once("upgrade", cleanupAndClose);
          this.once("upgradeError", cleanupAndClose);
        };
        if ("opening" === this.readyState || "open" === this.readyState) {
          this.readyState = "closing";
          if (this.writeBuffer.length) {
            this.once("drain", () => {
              if (this.upgrading) {
                waitForUpgrade();
              } else {
                close();
              }
            });
          } else if (this.upgrading) {
            waitForUpgrade();
          } else {
            close();
          }
        }
        return this;
      }
      /**
       * Called upon transport error
       *
       * @private
       */
      onError(err) {
        debug("socket error %j", err);
        Socket.priorWebsocketSuccess = false;
        this.emitReserved("error", err);
        this.onClose("transport error", err);
      }
      /**
       * Called upon transport close.
       *
       * @private
       */
      onClose(reason, description) {
        if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
          debug('socket close with reason: "%s"', reason);
          this.clearTimeoutFn(this.pingTimeoutTimer);
          this.transport.removeAllListeners("close");
          this.transport.close();
          this.transport.removeAllListeners();
          if (typeof removeEventListener === "function") {
            removeEventListener("beforeunload", this.beforeunloadEventListener, false);
            removeEventListener("offline", this.offlineEventListener, false);
          }
          this.readyState = "closed";
          this.id = null;
          this.emitReserved("close", reason, description);
          this.writeBuffer = [];
          this.prevBufferLen = 0;
        }
      }
      /**
       * Filters upgrades, returning only those matching client transports.
       *
       * @param {Array} upgrades - server upgrades
       * @private
       */
      filterUpgrades(upgrades) {
        const filteredUpgrades = [];
        let i = 0;
        const j = upgrades.length;
        for (; i < j; i++) {
          if (~this.transports.indexOf(upgrades[i]))
            filteredUpgrades.push(upgrades[i]);
        }
        return filteredUpgrades;
      }
    };
    exports.Socket = Socket;
    Socket.protocol = engine_io_parser_1.protocol;
  }
});

// ../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/index.js
var require_cjs2 = __commonJS({
  "../../node_modules/.pnpm/engine.io-client@6.5.2/node_modules/engine.io-client/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nextTick = exports.parse = exports.installTimerFunctions = exports.transports = exports.Transport = exports.protocol = exports.Socket = void 0;
    var socket_js_1 = require_socket();
    Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
      return socket_js_1.Socket;
    } });
    exports.protocol = socket_js_1.Socket.protocol;
    var transport_js_1 = require_transport();
    Object.defineProperty(exports, "Transport", { enumerable: true, get: function() {
      return transport_js_1.Transport;
    } });
    var index_js_1 = require_transports();
    Object.defineProperty(exports, "transports", { enumerable: true, get: function() {
      return index_js_1.transports;
    } });
    var util_js_1 = require_util();
    Object.defineProperty(exports, "installTimerFunctions", { enumerable: true, get: function() {
      return util_js_1.installTimerFunctions;
    } });
    var parseuri_js_1 = require_parseuri();
    Object.defineProperty(exports, "parse", { enumerable: true, get: function() {
      return parseuri_js_1.parse;
    } });
    var websocket_constructor_js_1 = require_websocket_constructor();
    Object.defineProperty(exports, "nextTick", { enumerable: true, get: function() {
      return websocket_constructor_js_1.nextTick;
    } });
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/url.js
var require_url = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/url.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.url = void 0;
    var engine_io_client_1 = require_cjs2();
    var debug_1 = __importDefault(require_src());
    var debug = debug_1.default("socket.io-client:url");
    function url(uri, path = "", loc) {
      let obj = uri;
      loc = loc || typeof location !== "undefined" && location;
      if (null == uri)
        uri = loc.protocol + "//" + loc.host;
      if (typeof uri === "string") {
        if ("/" === uri.charAt(0)) {
          if ("/" === uri.charAt(1)) {
            uri = loc.protocol + uri;
          } else {
            uri = loc.host + uri;
          }
        }
        if (!/^(https?|wss?):\/\//.test(uri)) {
          debug("protocol-less url %s", uri);
          if ("undefined" !== typeof loc) {
            uri = loc.protocol + "//" + uri;
          } else {
            uri = "https://" + uri;
          }
        }
        debug("parse %s", uri);
        obj = engine_io_client_1.parse(uri);
      }
      if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
          obj.port = "80";
        } else if (/^(http|ws)s$/.test(obj.protocol)) {
          obj.port = "443";
        }
      }
      obj.path = obj.path || "/";
      const ipv6 = obj.host.indexOf(":") !== -1;
      const host = ipv6 ? "[" + obj.host + "]" : obj.host;
      obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
      obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
      return obj;
    }
    exports.url = url;
  }
});

// ../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/is-binary.js
var require_is_binary = __commonJS({
  "../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/is-binary.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.hasBinary = exports.isBinary = void 0;
    var withNativeArrayBuffer = typeof ArrayBuffer === "function";
    var isView = (obj) => {
      return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
    };
    var toString = Object.prototype.toString;
    var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
    var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
    function isBinary(obj) {
      return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
    }
    exports.isBinary = isBinary;
    function hasBinary(obj, toJSON) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
          if (hasBinary(obj[i])) {
            return true;
          }
        }
        return false;
      }
      if (isBinary(obj)) {
        return true;
      }
      if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
          return true;
        }
      }
      return false;
    }
    exports.hasBinary = hasBinary;
  }
});

// ../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/binary.js
var require_binary = __commonJS({
  "../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/binary.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reconstructPacket = exports.deconstructPacket = void 0;
    var is_binary_js_1 = require_is_binary();
    function deconstructPacket(packet) {
      const buffers = [];
      const packetData = packet.data;
      const pack = packet;
      pack.data = _deconstructPacket(packetData, buffers);
      pack.attachments = buffers.length;
      return { packet: pack, buffers };
    }
    exports.deconstructPacket = deconstructPacket;
    function _deconstructPacket(data, buffers) {
      if (!data)
        return data;
      if ((0, is_binary_js_1.isBinary)(data)) {
        const placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
      } else if (Array.isArray(data)) {
        const newData = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
          newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
      } else if (typeof data === "object" && !(data instanceof Date)) {
        const newData = {};
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            newData[key] = _deconstructPacket(data[key], buffers);
          }
        }
        return newData;
      }
      return data;
    }
    function reconstructPacket(packet, buffers) {
      packet.data = _reconstructPacket(packet.data, buffers);
      delete packet.attachments;
      return packet;
    }
    exports.reconstructPacket = reconstructPacket;
    function _reconstructPacket(data, buffers) {
      if (!data)
        return data;
      if (data && data._placeholder === true) {
        const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
        if (isIndexValid) {
          return buffers[data.num];
        } else {
          throw new Error("illegal attachments");
        }
      } else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = _reconstructPacket(data[i], buffers);
        }
      } else if (typeof data === "object") {
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            data[key] = _reconstructPacket(data[key], buffers);
          }
        }
      }
      return data;
    }
  }
});

// ../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/index.js
var require_cjs3 = __commonJS({
  "../../node_modules/.pnpm/socket.io-parser@4.2.4/node_modules/socket.io-parser/build/cjs/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Decoder = exports.Encoder = exports.PacketType = exports.protocol = void 0;
    var component_emitter_1 = require_component_emitter();
    var binary_js_1 = require_binary();
    var is_binary_js_1 = require_is_binary();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("socket.io-parser");
    var RESERVED_EVENTS = [
      "connect",
      "connect_error",
      "disconnect",
      "disconnecting",
      "newListener",
      "removeListener"
      // used by the Node.js EventEmitter
    ];
    exports.protocol = 5;
    var PacketType;
    (function(PacketType2) {
      PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
      PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
      PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
      PacketType2[PacketType2["ACK"] = 3] = "ACK";
      PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
      PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
      PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
    })(PacketType = exports.PacketType || (exports.PacketType = {}));
    var Encoder = class {
      /**
       * Encoder constructor
       *
       * @param {function} replacer - custom replacer to pass down to JSON.parse
       */
      constructor(replacer) {
        this.replacer = replacer;
      }
      /**
       * Encode a packet as a single string if non-binary, or as a
       * buffer sequence, depending on packet type.
       *
       * @param {Object} obj - packet object
       */
      encode(obj) {
        debug("encoding packet %j", obj);
        if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
          if ((0, is_binary_js_1.hasBinary)(obj)) {
            return this.encodeAsBinary({
              type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
              nsp: obj.nsp,
              data: obj.data,
              id: obj.id
            });
          }
        }
        return [this.encodeAsString(obj)];
      }
      /**
       * Encode packet as string.
       */
      encodeAsString(obj) {
        let str = "" + obj.type;
        if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
          str += obj.attachments + "-";
        }
        if (obj.nsp && "/" !== obj.nsp) {
          str += obj.nsp + ",";
        }
        if (null != obj.id) {
          str += obj.id;
        }
        if (null != obj.data) {
          str += JSON.stringify(obj.data, this.replacer);
        }
        debug("encoded %j as %s", obj, str);
        return str;
      }
      /**
       * Encode packet as 'buffer sequence' by removing blobs, and
       * deconstructing packet into object with placeholders and
       * a list of buffers.
       */
      encodeAsBinary(obj) {
        const deconstruction = (0, binary_js_1.deconstructPacket)(obj);
        const pack = this.encodeAsString(deconstruction.packet);
        const buffers = deconstruction.buffers;
        buffers.unshift(pack);
        return buffers;
      }
    };
    exports.Encoder = Encoder;
    function isObject(value) {
      return Object.prototype.toString.call(value) === "[object Object]";
    }
    var Decoder = class extends component_emitter_1.Emitter {
      /**
       * Decoder constructor
       *
       * @param {function} reviver - custom reviver to pass down to JSON.stringify
       */
      constructor(reviver) {
        super();
        this.reviver = reviver;
      }
      /**
       * Decodes an encoded packet string into packet JSON.
       *
       * @param {String} obj - encoded packet
       */
      add(obj) {
        let packet;
        if (typeof obj === "string") {
          if (this.reconstructor) {
            throw new Error("got plaintext data when reconstructing a packet");
          }
          packet = this.decodeString(obj);
          const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
          if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
            packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
            this.reconstructor = new BinaryReconstructor(packet);
            if (packet.attachments === 0) {
              super.emitReserved("decoded", packet);
            }
          } else {
            super.emitReserved("decoded", packet);
          }
        } else if ((0, is_binary_js_1.isBinary)(obj) || obj.base64) {
          if (!this.reconstructor) {
            throw new Error("got binary data when not reconstructing a packet");
          } else {
            packet = this.reconstructor.takeBinaryData(obj);
            if (packet) {
              this.reconstructor = null;
              super.emitReserved("decoded", packet);
            }
          }
        } else {
          throw new Error("Unknown type: " + obj);
        }
      }
      /**
       * Decode a packet String (JSON data)
       *
       * @param {String} str
       * @return {Object} packet
       */
      decodeString(str) {
        let i = 0;
        const p = {
          type: Number(str.charAt(0))
        };
        if (PacketType[p.type] === void 0) {
          throw new Error("unknown packet type " + p.type);
        }
        if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
          const start = i + 1;
          while (str.charAt(++i) !== "-" && i != str.length) {
          }
          const buf = str.substring(start, i);
          if (buf != Number(buf) || str.charAt(i) !== "-") {
            throw new Error("Illegal attachments");
          }
          p.attachments = Number(buf);
        }
        if ("/" === str.charAt(i + 1)) {
          const start = i + 1;
          while (++i) {
            const c = str.charAt(i);
            if ("," === c)
              break;
            if (i === str.length)
              break;
          }
          p.nsp = str.substring(start, i);
        } else {
          p.nsp = "/";
        }
        const next = str.charAt(i + 1);
        if ("" !== next && Number(next) == next) {
          const start = i + 1;
          while (++i) {
            const c = str.charAt(i);
            if (null == c || Number(c) != c) {
              --i;
              break;
            }
            if (i === str.length)
              break;
          }
          p.id = Number(str.substring(start, i + 1));
        }
        if (str.charAt(++i)) {
          const payload = this.tryParse(str.substr(i));
          if (Decoder.isPayloadValid(p.type, payload)) {
            p.data = payload;
          } else {
            throw new Error("invalid payload");
          }
        }
        debug("decoded %s as %j", str, p);
        return p;
      }
      tryParse(str) {
        try {
          return JSON.parse(str, this.reviver);
        } catch (e) {
          return false;
        }
      }
      static isPayloadValid(type, payload) {
        switch (type) {
          case PacketType.CONNECT:
            return isObject(payload);
          case PacketType.DISCONNECT:
            return payload === void 0;
          case PacketType.CONNECT_ERROR:
            return typeof payload === "string" || isObject(payload);
          case PacketType.EVENT:
          case PacketType.BINARY_EVENT:
            return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
          case PacketType.ACK:
          case PacketType.BINARY_ACK:
            return Array.isArray(payload);
        }
      }
      /**
       * Deallocates a parser's resources
       */
      destroy() {
        if (this.reconstructor) {
          this.reconstructor.finishedReconstruction();
          this.reconstructor = null;
        }
      }
    };
    exports.Decoder = Decoder;
    var BinaryReconstructor = class {
      constructor(packet) {
        this.packet = packet;
        this.buffers = [];
        this.reconPack = packet;
      }
      /**
       * Method to be called when binary data received from connection
       * after a BINARY_EVENT packet.
       *
       * @param {Buffer | ArrayBuffer} binData - the raw binary data received
       * @return {null | Object} returns null if more binary data is expected or
       *   a reconstructed packet object if all buffers have been received.
       */
      takeBinaryData(binData) {
        this.buffers.push(binData);
        if (this.buffers.length === this.reconPack.attachments) {
          const packet = (0, binary_js_1.reconstructPacket)(this.reconPack, this.buffers);
          this.finishedReconstruction();
          return packet;
        }
        return null;
      }
      /**
       * Cleans up binary packet reconstruction variables.
       */
      finishedReconstruction() {
        this.reconPack = null;
        this.buffers = [];
      }
    };
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/on.js
var require_on = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/on.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.on = void 0;
    function on2(obj, ev, fn) {
      obj.on(ev, fn);
      return function subDestroy() {
        obj.off(ev, fn);
      };
    }
    exports.on = on2;
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/socket.js
var require_socket2 = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/socket.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Socket = void 0;
    var socket_io_parser_1 = require_cjs3();
    var on_js_1 = require_on();
    var component_emitter_1 = require_component_emitter();
    var debug_1 = __importDefault(require_src());
    var debug = debug_1.default("socket.io-client:socket");
    var RESERVED_EVENTS = Object.freeze({
      connect: 1,
      connect_error: 1,
      disconnect: 1,
      disconnecting: 1,
      // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
      newListener: 1,
      removeListener: 1
    });
    var Socket = class extends component_emitter_1.Emitter {
      /**
       * `Socket` constructor.
       */
      constructor(io2, nsp, opts) {
        super();
        this.connected = false;
        this.recovered = false;
        this.receiveBuffer = [];
        this.sendBuffer = [];
        this._queue = [];
        this._queueSeq = 0;
        this.ids = 0;
        this.acks = {};
        this.flags = {};
        this.io = io2;
        this.nsp = nsp;
        if (opts && opts.auth) {
          this.auth = opts.auth;
        }
        this._opts = Object.assign({}, opts);
        if (this.io._autoConnect)
          this.open();
      }
      /**
       * Whether the socket is currently disconnected
       *
       * @example
       * const socket = io();
       *
       * socket.on("connect", () => {
       *   console.log(socket.disconnected); // false
       * });
       *
       * socket.on("disconnect", () => {
       *   console.log(socket.disconnected); // true
       * });
       */
      get disconnected() {
        return !this.connected;
      }
      /**
       * Subscribe to open, close and packet events
       *
       * @private
       */
      subEvents() {
        if (this.subs)
          return;
        const io2 = this.io;
        this.subs = [
          on_js_1.on(io2, "open", this.onopen.bind(this)),
          on_js_1.on(io2, "packet", this.onpacket.bind(this)),
          on_js_1.on(io2, "error", this.onerror.bind(this)),
          on_js_1.on(io2, "close", this.onclose.bind(this))
        ];
      }
      /**
       * Whether the Socket will try to reconnect when its Manager connects or reconnects.
       *
       * @example
       * const socket = io();
       *
       * console.log(socket.active); // true
       *
       * socket.on("disconnect", (reason) => {
       *   if (reason === "io server disconnect") {
       *     // the disconnection was initiated by the server, you need to manually reconnect
       *     console.log(socket.active); // false
       *   }
       *   // else the socket will automatically try to reconnect
       *   console.log(socket.active); // true
       * });
       */
      get active() {
        return !!this.subs;
      }
      /**
       * "Opens" the socket.
       *
       * @example
       * const socket = io({
       *   autoConnect: false
       * });
       *
       * socket.connect();
       */
      connect() {
        if (this.connected)
          return this;
        this.subEvents();
        if (!this.io["_reconnecting"])
          this.io.open();
        if ("open" === this.io._readyState)
          this.onopen();
        return this;
      }
      /**
       * Alias for {@link connect()}.
       */
      open() {
        return this.connect();
      }
      /**
       * Sends a `message` event.
       *
       * This method mimics the WebSocket.send() method.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
       *
       * @example
       * socket.send("hello");
       *
       * // this is equivalent to
       * socket.emit("message", "hello");
       *
       * @return self
       */
      send(...args) {
        args.unshift("message");
        this.emit.apply(this, args);
        return this;
      }
      /**
       * Override `emit`.
       * If the event is in `events`, it's emitted normally.
       *
       * @example
       * socket.emit("hello", "world");
       *
       * // all serializable datastructures are supported (no need to call JSON.stringify)
       * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
       *
       * // with an acknowledgement from the server
       * socket.emit("hello", "world", (val) => {
       *   // ...
       * });
       *
       * @return self
       */
      emit(ev, ...args) {
        if (RESERVED_EVENTS.hasOwnProperty(ev)) {
          throw new Error('"' + ev.toString() + '" is a reserved event name');
        }
        args.unshift(ev);
        if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
          this._addToQueue(args);
          return this;
        }
        const packet = {
          type: socket_io_parser_1.PacketType.EVENT,
          data: args
        };
        packet.options = {};
        packet.options.compress = this.flags.compress !== false;
        if ("function" === typeof args[args.length - 1]) {
          const id = this.ids++;
          debug("emitting packet with ack id %d", id);
          const ack = args.pop();
          this._registerAckCallback(id, ack);
          packet.id = id;
        }
        const isTransportWritable = this.io.engine && this.io.engine.transport && this.io.engine.transport.writable;
        const discardPacket = this.flags.volatile && (!isTransportWritable || !this.connected);
        if (discardPacket) {
          debug("discard packet as the transport is not currently writable");
        } else if (this.connected) {
          this.notifyOutgoingListeners(packet);
          this.packet(packet);
        } else {
          this.sendBuffer.push(packet);
        }
        this.flags = {};
        return this;
      }
      /**
       * @private
       */
      _registerAckCallback(id, ack) {
        var _a;
        const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
        if (timeout === void 0) {
          this.acks[id] = ack;
          return;
        }
        const timer = this.io.setTimeoutFn(() => {
          delete this.acks[id];
          for (let i = 0; i < this.sendBuffer.length; i++) {
            if (this.sendBuffer[i].id === id) {
              debug("removing packet with ack id %d from the buffer", id);
              this.sendBuffer.splice(i, 1);
            }
          }
          debug("event with ack id %d has timed out after %d ms", id, timeout);
          ack.call(this, new Error("operation has timed out"));
        }, timeout);
        const fn = (...args) => {
          this.io.clearTimeoutFn(timer);
          ack.apply(this, args);
        };
        fn.withError = true;
        this.acks[id] = fn;
      }
      /**
       * Emits an event and waits for an acknowledgement
       *
       * @example
       * // without timeout
       * const response = await socket.emitWithAck("hello", "world");
       *
       * // with a specific timeout
       * try {
       *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
       * } catch (err) {
       *   // the server did not acknowledge the event in the given delay
       * }
       *
       * @return a Promise that will be fulfilled when the server acknowledges the event
       */
      emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
          const fn = (arg1, arg2) => {
            return arg1 ? reject(arg1) : resolve(arg2);
          };
          fn.withError = true;
          args.push(fn);
          this.emit(ev, ...args);
        });
      }
      /**
       * Add the packet to the queue.
       * @param args
       * @private
       */
      _addToQueue(args) {
        let ack;
        if (typeof args[args.length - 1] === "function") {
          ack = args.pop();
        }
        const packet = {
          id: this._queueSeq++,
          tryCount: 0,
          pending: false,
          args,
          flags: Object.assign({ fromQueue: true }, this.flags)
        };
        args.push((err, ...responseArgs) => {
          if (packet !== this._queue[0]) {
            return;
          }
          const hasError = err !== null;
          if (hasError) {
            if (packet.tryCount > this._opts.retries) {
              debug("packet [%d] is discarded after %d tries", packet.id, packet.tryCount);
              this._queue.shift();
              if (ack) {
                ack(err);
              }
            }
          } else {
            debug("packet [%d] was successfully sent", packet.id);
            this._queue.shift();
            if (ack) {
              ack(null, ...responseArgs);
            }
          }
          packet.pending = false;
          return this._drainQueue();
        });
        this._queue.push(packet);
        this._drainQueue();
      }
      /**
       * Send the first packet of the queue, and wait for an acknowledgement from the server.
       * @param force - whether to resend a packet that has not been acknowledged yet
       *
       * @private
       */
      _drainQueue(force = false) {
        debug("draining queue");
        if (!this.connected || this._queue.length === 0) {
          return;
        }
        const packet = this._queue[0];
        if (packet.pending && !force) {
          debug("packet [%d] has already been sent and is waiting for an ack", packet.id);
          return;
        }
        packet.pending = true;
        packet.tryCount++;
        debug("sending packet [%d] (try n°%d)", packet.id, packet.tryCount);
        this.flags = packet.flags;
        this.emit.apply(this, packet.args);
      }
      /**
       * Sends a packet.
       *
       * @param packet
       * @private
       */
      packet(packet) {
        packet.nsp = this.nsp;
        this.io._packet(packet);
      }
      /**
       * Called upon engine `open`.
       *
       * @private
       */
      onopen() {
        debug("transport is open - connecting");
        if (typeof this.auth == "function") {
          this.auth((data) => {
            this._sendConnectPacket(data);
          });
        } else {
          this._sendConnectPacket(this.auth);
        }
      }
      /**
       * Sends a CONNECT packet to initiate the Socket.IO session.
       *
       * @param data
       * @private
       */
      _sendConnectPacket(data) {
        this.packet({
          type: socket_io_parser_1.PacketType.CONNECT,
          data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
        });
      }
      /**
       * Called upon engine or manager `error`.
       *
       * @param err
       * @private
       */
      onerror(err) {
        if (!this.connected) {
          this.emitReserved("connect_error", err);
        }
      }
      /**
       * Called upon engine `close`.
       *
       * @param reason
       * @param description
       * @private
       */
      onclose(reason, description) {
        debug("close (%s)", reason);
        this.connected = false;
        delete this.id;
        this.emitReserved("disconnect", reason, description);
        this._clearAcks();
      }
      /**
       * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
       * the server.
       *
       * @private
       */
      _clearAcks() {
        Object.keys(this.acks).forEach((id) => {
          const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
          if (!isBuffered) {
            const ack = this.acks[id];
            delete this.acks[id];
            if (ack.withError) {
              ack.call(this, new Error("socket has been disconnected"));
            }
          }
        });
      }
      /**
       * Called with socket packet.
       *
       * @param packet
       * @private
       */
      onpacket(packet) {
        const sameNamespace = packet.nsp === this.nsp;
        if (!sameNamespace)
          return;
        switch (packet.type) {
          case socket_io_parser_1.PacketType.CONNECT:
            if (packet.data && packet.data.sid) {
              this.onconnect(packet.data.sid, packet.data.pid);
            } else {
              this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
            }
            break;
          case socket_io_parser_1.PacketType.EVENT:
          case socket_io_parser_1.PacketType.BINARY_EVENT:
            this.onevent(packet);
            break;
          case socket_io_parser_1.PacketType.ACK:
          case socket_io_parser_1.PacketType.BINARY_ACK:
            this.onack(packet);
            break;
          case socket_io_parser_1.PacketType.DISCONNECT:
            this.ondisconnect();
            break;
          case socket_io_parser_1.PacketType.CONNECT_ERROR:
            this.destroy();
            const err = new Error(packet.data.message);
            err.data = packet.data.data;
            this.emitReserved("connect_error", err);
            break;
        }
      }
      /**
       * Called upon a server event.
       *
       * @param packet
       * @private
       */
      onevent(packet) {
        const args = packet.data || [];
        debug("emitting event %j", args);
        if (null != packet.id) {
          debug("attaching ack callback to event");
          args.push(this.ack(packet.id));
        }
        if (this.connected) {
          this.emitEvent(args);
        } else {
          this.receiveBuffer.push(Object.freeze(args));
        }
      }
      emitEvent(args) {
        if (this._anyListeners && this._anyListeners.length) {
          const listeners = this._anyListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, args);
          }
        }
        super.emit.apply(this, args);
        if (this._pid && args.length && typeof args[args.length - 1] === "string") {
          this._lastOffset = args[args.length - 1];
        }
      }
      /**
       * Produces an ack callback to emit with an event.
       *
       * @private
       */
      ack(id) {
        const self = this;
        let sent = false;
        return function(...args) {
          if (sent)
            return;
          sent = true;
          debug("sending ack %j", args);
          self.packet({
            type: socket_io_parser_1.PacketType.ACK,
            id,
            data: args
          });
        };
      }
      /**
       * Called upon a server acknowledgement.
       *
       * @param packet
       * @private
       */
      onack(packet) {
        const ack = this.acks[packet.id];
        if (typeof ack !== "function") {
          debug("bad ack %s", packet.id);
          return;
        }
        delete this.acks[packet.id];
        debug("calling ack %s with %j", packet.id, packet.data);
        if (ack.withError) {
          packet.data.unshift(null);
        }
        ack.apply(this, packet.data);
      }
      /**
       * Called upon server connect.
       *
       * @private
       */
      onconnect(id, pid) {
        debug("socket connected with id %s", id);
        this.id = id;
        this.recovered = pid && this._pid === pid;
        this._pid = pid;
        this.connected = true;
        this.emitBuffered();
        this.emitReserved("connect");
        this._drainQueue(true);
      }
      /**
       * Emit buffered events (received and emitted).
       *
       * @private
       */
      emitBuffered() {
        this.receiveBuffer.forEach((args) => this.emitEvent(args));
        this.receiveBuffer = [];
        this.sendBuffer.forEach((packet) => {
          this.notifyOutgoingListeners(packet);
          this.packet(packet);
        });
        this.sendBuffer = [];
      }
      /**
       * Called upon server disconnect.
       *
       * @private
       */
      ondisconnect() {
        debug("server disconnect (%s)", this.nsp);
        this.destroy();
        this.onclose("io server disconnect");
      }
      /**
       * Called upon forced client/server side disconnections,
       * this method ensures the manager stops tracking us and
       * that reconnections don't get triggered for this.
       *
       * @private
       */
      destroy() {
        if (this.subs) {
          this.subs.forEach((subDestroy) => subDestroy());
          this.subs = void 0;
        }
        this.io["_destroy"](this);
      }
      /**
       * Disconnects the socket manually. In that case, the socket will not try to reconnect.
       *
       * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
       *
       * @example
       * const socket = io();
       *
       * socket.on("disconnect", (reason) => {
       *   // console.log(reason); prints "io client disconnect"
       * });
       *
       * socket.disconnect();
       *
       * @return self
       */
      disconnect() {
        if (this.connected) {
          debug("performing disconnect (%s)", this.nsp);
          this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
        }
        this.destroy();
        if (this.connected) {
          this.onclose("io client disconnect");
        }
        return this;
      }
      /**
       * Alias for {@link disconnect()}.
       *
       * @return self
       */
      close() {
        return this.disconnect();
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * socket.compress(false).emit("hello");
       *
       * @param compress - if `true`, compresses the sending data
       * @return self
       */
      compress(compress) {
        this.flags.compress = compress;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
       * ready to send messages.
       *
       * @example
       * socket.volatile.emit("hello"); // the server may or may not receive it
       *
       * @returns self
       */
      get volatile() {
        this.flags.volatile = true;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
       * given number of milliseconds have elapsed without an acknowledgement from the server:
       *
       * @example
       * socket.timeout(5000).emit("my-event", (err) => {
       *   if (err) {
       *     // the server did not acknowledge the event in the given delay
       *   }
       * });
       *
       * @returns self
       */
      timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback.
       *
       * @example
       * socket.onAny((event, ...args) => {
       *   console.log(`got ${event}`);
       * });
       *
       * @param listener
       */
      onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback. The listener is added to the beginning of the listeners array.
       *
       * @example
       * socket.prependAny((event, ...args) => {
       *   console.log(`got event ${event}`);
       * });
       *
       * @param listener
       */
      prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is emitted.
       *
       * @example
       * const catchAllListener = (event, ...args) => {
       *   console.log(`got event ${event}`);
       * }
       *
       * socket.onAny(catchAllListener);
       *
       * // remove a specific listener
       * socket.offAny(catchAllListener);
       *
       * // or remove all listeners
       * socket.offAny();
       *
       * @param listener
       */
      offAny(listener) {
        if (!this._anyListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAny() {
        return this._anyListeners || [];
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback.
       *
       * Note: acknowledgements sent to the server are not included.
       *
       * @example
       * socket.onAnyOutgoing((event, ...args) => {
       *   console.log(`sent event ${event}`);
       * });
       *
       * @param listener
       */
      onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback. The listener is added to the beginning of the listeners array.
       *
       * Note: acknowledgements sent to the server are not included.
       *
       * @example
       * socket.prependAnyOutgoing((event, ...args) => {
       *   console.log(`sent event ${event}`);
       * });
       *
       * @param listener
       */
      prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is emitted.
       *
       * @example
       * const catchAllListener = (event, ...args) => {
       *   console.log(`sent event ${event}`);
       * }
       *
       * socket.onAnyOutgoing(catchAllListener);
       *
       * // remove a specific listener
       * socket.offAnyOutgoing(catchAllListener);
       *
       * // or remove all listeners
       * socket.offAnyOutgoing();
       *
       * @param [listener] - the catch-all listener (optional)
       */
      offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyOutgoingListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyOutgoingListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
      }
      /**
       * Notify the listeners for each packet sent
       *
       * @param packet
       *
       * @private
       */
      notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
          const listeners = this._anyOutgoingListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, packet.data);
          }
        }
      }
    };
    exports.Socket = Socket;
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/contrib/backo2.js
var require_backo2 = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/contrib/backo2.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Backoff = void 0;
    function Backoff(opts) {
      opts = opts || {};
      this.ms = opts.min || 100;
      this.max = opts.max || 1e4;
      this.factor = opts.factor || 2;
      this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
      this.attempts = 0;
    }
    exports.Backoff = Backoff;
    Backoff.prototype.duration = function() {
      var ms = this.ms * Math.pow(this.factor, this.attempts++);
      if (this.jitter) {
        var rand = Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
      }
      return Math.min(ms, this.max) | 0;
    };
    Backoff.prototype.reset = function() {
      this.attempts = 0;
    };
    Backoff.prototype.setMin = function(min) {
      this.ms = min;
    };
    Backoff.prototype.setMax = function(max) {
      this.max = max;
    };
    Backoff.prototype.setJitter = function(jitter) {
      this.jitter = jitter;
    };
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/manager.js
var require_manager = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/manager.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() {
        return m[k];
      } });
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Manager = void 0;
    var engine_io_client_1 = require_cjs2();
    var socket_js_1 = require_socket2();
    var parser = __importStar(require_cjs3());
    var on_js_1 = require_on();
    var backo2_js_1 = require_backo2();
    var component_emitter_1 = require_component_emitter();
    var debug_1 = __importDefault(require_src());
    var debug = debug_1.default("socket.io-client:manager");
    var Manager = class extends component_emitter_1.Emitter {
      constructor(uri, opts) {
        var _a;
        super();
        this.nsps = {};
        this.subs = [];
        if (uri && "object" === typeof uri) {
          opts = uri;
          uri = void 0;
        }
        opts = opts || {};
        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        engine_io_client_1.installTimerFunctions(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
        this.reconnectionDelay(opts.reconnectionDelay || 1e3);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
        this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
        this.backoff = new backo2_js_1.Backoff({
          min: this.reconnectionDelay(),
          max: this.reconnectionDelayMax(),
          jitter: this.randomizationFactor()
        });
        this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
        this._readyState = "closed";
        this.uri = uri;
        const _parser = opts.parser || parser;
        this.encoder = new _parser.Encoder();
        this.decoder = new _parser.Decoder();
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect)
          this.open();
      }
      reconnection(v) {
        if (!arguments.length)
          return this._reconnection;
        this._reconnection = !!v;
        return this;
      }
      reconnectionAttempts(v) {
        if (v === void 0)
          return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
      }
      reconnectionDelay(v) {
        var _a;
        if (v === void 0)
          return this._reconnectionDelay;
        this._reconnectionDelay = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
        return this;
      }
      randomizationFactor(v) {
        var _a;
        if (v === void 0)
          return this._randomizationFactor;
        this._randomizationFactor = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
        return this;
      }
      reconnectionDelayMax(v) {
        var _a;
        if (v === void 0)
          return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
        return this;
      }
      timeout(v) {
        if (!arguments.length)
          return this._timeout;
        this._timeout = v;
        return this;
      }
      /**
       * Starts trying to reconnect if reconnection is enabled and we have not
       * started reconnecting yet
       *
       * @private
       */
      maybeReconnectOnOpen() {
        if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
          this.reconnect();
        }
      }
      /**
       * Sets the current transport `socket`.
       *
       * @param {Function} fn - optional, callback
       * @return self
       * @public
       */
      open(fn) {
        debug("readyState %s", this._readyState);
        if (~this._readyState.indexOf("open"))
          return this;
        debug("opening %s", this.uri);
        this.engine = new engine_io_client_1.Socket(this.uri, this.opts);
        const socket2 = this.engine;
        const self = this;
        this._readyState = "opening";
        this.skipReconnect = false;
        const openSubDestroy = on_js_1.on(socket2, "open", function() {
          self.onopen();
          fn && fn();
        });
        const onError = (err) => {
          debug("error");
          this.cleanup();
          this._readyState = "closed";
          this.emitReserved("error", err);
          if (fn) {
            fn(err);
          } else {
            this.maybeReconnectOnOpen();
          }
        };
        const errorSub = on_js_1.on(socket2, "error", onError);
        if (false !== this._timeout) {
          const timeout = this._timeout;
          debug("connect attempt will timeout after %d", timeout);
          const timer = this.setTimeoutFn(() => {
            debug("connect attempt timed out after %d", timeout);
            openSubDestroy();
            onError(new Error("timeout"));
            socket2.close();
          }, timeout);
          if (this.opts.autoUnref) {
            timer.unref();
          }
          this.subs.push(() => {
            this.clearTimeoutFn(timer);
          });
        }
        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);
        return this;
      }
      /**
       * Alias for open()
       *
       * @return self
       * @public
       */
      connect(fn) {
        return this.open(fn);
      }
      /**
       * Called upon transport open.
       *
       * @private
       */
      onopen() {
        debug("open");
        this.cleanup();
        this._readyState = "open";
        this.emitReserved("open");
        const socket2 = this.engine;
        this.subs.push(on_js_1.on(socket2, "ping", this.onping.bind(this)), on_js_1.on(socket2, "data", this.ondata.bind(this)), on_js_1.on(socket2, "error", this.onerror.bind(this)), on_js_1.on(socket2, "close", this.onclose.bind(this)), on_js_1.on(this.decoder, "decoded", this.ondecoded.bind(this)));
      }
      /**
       * Called upon a ping.
       *
       * @private
       */
      onping() {
        this.emitReserved("ping");
      }
      /**
       * Called with data.
       *
       * @private
       */
      ondata(data) {
        try {
          this.decoder.add(data);
        } catch (e) {
          this.onclose("parse error", e);
        }
      }
      /**
       * Called when parser fully decodes a packet.
       *
       * @private
       */
      ondecoded(packet) {
        engine_io_client_1.nextTick(() => {
          this.emitReserved("packet", packet);
        }, this.setTimeoutFn);
      }
      /**
       * Called upon socket error.
       *
       * @private
       */
      onerror(err) {
        debug("error", err);
        this.emitReserved("error", err);
      }
      /**
       * Creates a new socket for the given `nsp`.
       *
       * @return {Socket}
       * @public
       */
      socket(nsp, opts) {
        let socket2 = this.nsps[nsp];
        if (!socket2) {
          socket2 = new socket_js_1.Socket(this, nsp, opts);
          this.nsps[nsp] = socket2;
        } else if (this._autoConnect && !socket2.active) {
          socket2.connect();
        }
        return socket2;
      }
      /**
       * Called upon a socket close.
       *
       * @param socket
       * @private
       */
      _destroy(socket2) {
        const nsps = Object.keys(this.nsps);
        for (const nsp of nsps) {
          const socket3 = this.nsps[nsp];
          if (socket3.active) {
            debug("socket %s is still active, skipping close", nsp);
            return;
          }
        }
        this._close();
      }
      /**
       * Writes a packet.
       *
       * @param packet
       * @private
       */
      _packet(packet) {
        debug("writing packet %j", packet);
        const encodedPackets = this.encoder.encode(packet);
        for (let i = 0; i < encodedPackets.length; i++) {
          this.engine.write(encodedPackets[i], packet.options);
        }
      }
      /**
       * Clean up transport subscriptions and packet buffer.
       *
       * @private
       */
      cleanup() {
        debug("cleanup");
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.length = 0;
        this.decoder.destroy();
      }
      /**
       * Close the current socket.
       *
       * @private
       */
      _close() {
        debug("disconnect");
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
        if (this.engine)
          this.engine.close();
      }
      /**
       * Alias for close()
       *
       * @private
       */
      disconnect() {
        return this._close();
      }
      /**
       * Called upon engine close.
       *
       * @private
       */
      onclose(reason, description) {
        debug("closed due to %s", reason);
        this.cleanup();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);
        if (this._reconnection && !this.skipReconnect) {
          this.reconnect();
        }
      }
      /**
       * Attempt a reconnection.
       *
       * @private
       */
      reconnect() {
        if (this._reconnecting || this.skipReconnect)
          return this;
        const self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
          debug("reconnect failed");
          this.backoff.reset();
          this.emitReserved("reconnect_failed");
          this._reconnecting = false;
        } else {
          const delay = this.backoff.duration();
          debug("will wait %dms before reconnect attempt", delay);
          this._reconnecting = true;
          const timer = this.setTimeoutFn(() => {
            if (self.skipReconnect)
              return;
            debug("attempting reconnect");
            this.emitReserved("reconnect_attempt", self.backoff.attempts);
            if (self.skipReconnect)
              return;
            self.open((err) => {
              if (err) {
                debug("reconnect attempt error");
                self._reconnecting = false;
                self.reconnect();
                this.emitReserved("reconnect_error", err);
              } else {
                debug("reconnect success");
                self.onreconnect();
              }
            });
          }, delay);
          if (this.opts.autoUnref) {
            timer.unref();
          }
          this.subs.push(() => {
            this.clearTimeoutFn(timer);
          });
        }
      }
      /**
       * Called upon successful reconnect.
       *
       * @private
       */
      onreconnect() {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
      }
    };
    exports.Manager = Manager;
  }
});

// ../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/index.js
var require_cjs4 = __commonJS({
  "../../node_modules/.pnpm/socket.io-client@4.7.5/node_modules/socket.io-client/build/cjs/index.js"(exports, module2) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = exports.connect = exports.io = exports.Socket = exports.Manager = exports.protocol = void 0;
    var url_js_1 = require_url();
    var manager_js_1 = require_manager();
    Object.defineProperty(exports, "Manager", { enumerable: true, get: function() {
      return manager_js_1.Manager;
    } });
    var socket_js_1 = require_socket2();
    Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
      return socket_js_1.Socket;
    } });
    var debug_1 = __importDefault(require_src());
    var debug = debug_1.default("socket.io-client");
    var cache = {};
    function lookup(uri, opts) {
      if (typeof uri === "object") {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      const parsed = url_js_1.url(uri, opts.path || "/socket.io");
      const source = parsed.source;
      const id = parsed.id;
      const path = parsed.path;
      const sameNamespace = cache[id] && path in cache[id]["nsps"];
      const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
      let io2;
      if (newConnection) {
        debug("ignoring socket cache for %s", source);
        io2 = new manager_js_1.Manager(source, opts);
      } else {
        if (!cache[id]) {
          debug("new io instance for %s", source);
          cache[id] = new manager_js_1.Manager(source, opts);
        }
        io2 = cache[id];
      }
      if (parsed.query && !opts.query) {
        opts.query = parsed.queryKey;
      }
      return io2.socket(parsed.path, opts);
    }
    exports.io = lookup;
    exports.connect = lookup;
    exports.default = lookup;
    Object.assign(lookup, {
      Manager: manager_js_1.Manager,
      Socket: socket_js_1.Socket,
      io: lookup,
      connect: lookup
    });
    var socket_io_parser_1 = require_cjs3();
    Object.defineProperty(exports, "protocol", { enumerable: true, get: function() {
      return socket_io_parser_1.protocol;
    } });
    module2.exports = lookup;
  }
});

// sna-src/lib/config.server.ts
var RESOURCE = GetCurrentResourceName();
function log(message) {
  console.log(`[${RESOURCE}] ${message}`);
}
function warn(message) {
  console.warn(`[${RESOURCE}] ${message}`);
}
function convar(name) {
  const value = GetConvar(name, "").trim();
  return value === "null" ? "" : value;
}
function normaliseUrl(raw) {
  const url = raw.trim().replace(/\/+$/, "");
  if (!url)
    return "";
  return url.endsWith("/v1") ? url : `${url}/v1`;
}
function getConnection() {
  let url = normaliseUrl(convar("snailycad_url"));
  let token = convar("snailycad_api_key");
  url ||= normaliseUrl(convar("snailycad_framework_api_url"));
  token ||= convar("snailycad_framework_api_token");
  return { url, token };
}
function parseEdition(value) {
  const v = value.toLowerCase();
  if (v === "auto" || v === "original")
    return v;
  if (v === "snailycad-mysql" || v === "mysql")
    return "snailycad-mysql";
  return null;
}
function getEditionSetting() {
  const resourceKey = RESOURCE.replace(/[^\w]/g, "_");
  for (const name of [`${resourceKey}_edition`, `${RESOURCE}_edition`, "snailycad_edition"]) {
    const value = convar(name);
    if (!value)
      continue;
    const parsed = parseEdition(value);
    if (parsed)
      return parsed;
    warn(`ignoring ${name} "${value}": use auto, original or snailycad-mysql`);
  }
  return "auto";
}
var detected = null;
var detecting = null;
var lastFailedAt = 0;
var RETRY_AFTER_MS = 6e4;
async function detectEdition() {
  const { url, token } = getConnection();
  if (!url)
    return "original";
  if (Date.now() - lastFailedAt < RETRY_AFTER_MS)
    return "original";
  try {
    const response = await fetch(`${url}/integrations/fivem/check`, {
      method: "POST",
      headers: { "content-type": "application/json", "snaily-cad-api-token": token },
      body: "{}",
      signal: AbortSignal.timeout(1e4)
    });
    await response.body?.cancel().catch(() => null);
    if (response.status === 200)
      return detected = await probePlayerHeader(url, token);
    if (response.status === 404)
      return detected = "original";
    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (HTTP ${response.status}${response.status === 401 ? ": check snailycad_api_key" : ""}); using "original" for now. Set snailycad_edition to skip detection.`
    );
  } catch (error) {
    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (${error instanceof Error ? error.message : String(error)}); using "original" for now.`
    );
  }
  return "original";
}
async function probePlayerHeader(url, token) {
  try {
    const response = await fetch(`${url}/user`, {
      method: "POST",
      headers: { "snaily-cad-api-token": token, "snaily-cad-player": "discord:0" },
      signal: AbortSignal.timeout(1e4)
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401 && body?.message === "playerNotLinked")
      return "snailycad-mysql";
  } catch {
  }
  log(
    "this CAD can't sign players in by Discord / Steam yet (update the CAD for that), so the original edition is used: players sign in with /sn-auth and a personal API token."
  );
  return "original";
}
async function getEdition() {
  const setting = getEditionSetting();
  if (setting !== "auto")
    return setting;
  if (detected)
    return detected;
  detecting ??= detectEdition().finally(() => {
    detecting = null;
  });
  return detecting;
}
async function describeEdition() {
  const setting = getEditionSetting();
  const edition = await getEdition();
  if (setting !== "auto")
    return `${edition} (set by convar)`;
  return detected ? `${edition} (auto-detected)` : `${edition} (detection failed, will retry)`;
}

// sna-src/lib/cad.server.ts
function identifierList(source) {
  try {
    return getPlayerIdentifiers(source) ?? [];
  } catch {
    return [];
  }
}
function getLicense(source) {
  return identifierList(source).find((id) => id.startsWith("license:")) ?? null;
}
function tokenKvpKey(license) {
  return `snailycad:${license}:token`;
}
function buildPlayerHeader(source) {
  const parts = [];
  for (const identifier of identifierList(source)) {
    if (identifier.startsWith("discord:") || identifier.startsWith("steam:")) {
      parts.push(identifier);
    }
  }
  return parts.length ? parts.join(",") : null;
}
function playerAuth(source) {
  const license = getLicense(source);
  return {
    type: "player",
    source,
    userApiToken: license ? GetResourceKvpString(tokenKvpKey(license)) || null : null,
    playerHeader: buildPlayerHeader(source)
  };
}
var loggedOnce = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (loggedOnce.has(key))
    return;
  loggedOnce.add(key);
  warn(message);
}
async function cadRequest(options) {
  const edition = await getEdition();
  const { url, token } = getConnection();
  const auth = options.auth ?? { type: "api" };
  const fail = (status, errorMessage) => ({
    ok: false,
    status,
    data: null,
    errorMessage,
    edition
  });
  if (!url) {
    warnOnce(
      "url",
      "no CAD address: set snailycad_url in server.cfg, e.g. set snailycad_url https://cad-api.example.com/v1"
    );
    return fail(0, "notConfigured");
  }
  const headers = {};
  if (options.data !== void 0 && options.method !== "GET") {
    headers["content-type"] = "application/json";
  }
  let isFromDispatch = options.isFromDispatch ?? true;
  if (auth.type === "api" || auth.type === "player" && edition === "snailycad-mysql") {
    if (!token) {
      warnOnce("token", "no CAD API token: set snailycad_api_key in server.cfg");
      return fail(0, "notConfigured");
    }
    headers["snaily-cad-api-token"] = token;
  }
  if (auth.type === "player") {
    if (edition === "snailycad-mysql") {
      if (!auth.playerHeader)
        return fail(401, "noIdentifiers");
      headers["snaily-cad-player"] = auth.playerHeader;
      isFromDispatch = false;
    } else {
      if (!auth.userApiToken)
        return fail(401, "notAuthenticated");
      headers["snaily-cad-user-api-token"] = auth.userApiToken;
    }
  }
  if (isFromDispatch && auth.type !== "none") {
    headers["is-from-dispatch"] = "true";
  }
  let response;
  try {
    response = await fetch(`${url}${options.path}`, {
      method: options.method,
      headers,
      body: options.data !== void 0 && options.method !== "GET" ? JSON.stringify(options.data) : void 0,
      signal: AbortSignal.timeout(15e3)
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : void 0;
    const reason = cause instanceof Error ? cause.message : error instanceof Error ? error.message : String(error);
    warn(`could not reach SnailyCAD at ${url} (${options.method} ${options.path}): ${reason}`);
    return fail(0, "unreachable");
  }
  const text = await response.text().catch(() => "");
  let body = text;
  if ((options.responseType ?? "json") === "json" || !response.ok) {
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = options.responseType === "text" ? text : null;
    }
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    if (!options.quiet || response.status >= 500) {
      warn(
        `SnailyCAD API ${options.method} ${options.path.split("?")[0]} failed: HTTP ${response.status} ${message}${response.status === 401 && auth.type === "api" ? " (check snailycad_api_key)" : ""}`
      );
    }
    return fail(response.status, message);
  }
  return { ok: true, status: response.status, data: body, edition };
}

// sna-src/lib/startup.server.ts
var VERSION_URL = "https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/integrations/fivem/sna-src/version.json";
var RELEASES_URL = "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem";
on("onResourceStart", (resourceName) => {
  if (resourceName !== GetCurrentResourceName())
    return;
  void startupChecks();
});
async function startupChecks() {
  log(`SnailyCAD edition: ${await describeEdition()}`);
  await verifyCad();
  await checkForUpdate();
}
async function verifyCad() {
  const { url } = getConnection();
  if (!url)
    return;
  const { ok, data } = await cadRequest({
    path: "/",
    method: "GET",
    responseType: "text"
  });
  if (!ok || typeof data !== "string" || !data.includes("200 Success")) {
    warn(`Failed to verify SnailyCAD at ${url}. Check that:
  - snailycad_url is the CAD API address ending in /v1
  - snailycad_api_key is the CAD API token (CAD Settings > API Token, turned on)
  - this server can reach the CAD API`);
  }
}
function compareVersions(a, b) {
  const pa = a.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0)
      return diff;
  }
  return 0;
}
async function checkForUpdate() {
  if (GetConvar("snailycad_version_check", "true") === "false")
    return;
  const current = GetResourceMetadata(GetCurrentResourceName(), "version", 0) || "0.0.0";
  try {
    const response = await fetch(VERSION_URL, { signal: AbortSignal.timeout(1e4) });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    const { version } = await response.json();
    if (typeof version !== "string")
      throw new Error("no version in version.json");
    if (compareVersions(version, current) > 0) {
      log(`version ${version} is available (running ${current}): ${RELEASES_URL}`);
    }
  } catch (error) {
    log(`update check skipped (${error instanceof Error ? error.message : String(error)})`);
  }
}

// sna-src/lib/player.server.ts
function prependSnailyCAD(text) {
  return `^8^*[SnailyCAD]:^7^r ${text}`;
}
function chat(source, text) {
  if (source > 0)
    emitNet("chat:addMessage", source, { args: [prependSnailyCAD(text)] });
}
var lastUse = /* @__PURE__ */ new Map();
function throttled(key, source, ms) {
  const id = `${key}:${source}`;
  const now = Date.now();
  if (now - (lastUse.get(id) ?? 0) < ms)
    return true;
  lastUse.set(id, now);
  return false;
}
on("playerDropped", () => {
  const src = Number(globalThis.source);
  for (const key of lastUse.keys()) {
    if (key.endsWith(`:${src}`))
      lastUse.delete(key);
  }
});
function explainPlayerError(result) {
  return explainForEdition(result.edition, result.status, result.errorMessage);
}
function explainForEdition(edition, status, message) {
  if (edition === "original") {
    if (status === 401 || status === 400 || message === "notAuthenticated") {
      return "Please make sure you're authenticated. Use: ^5/sn-auth^7.";
    }
  } else {
    if (message === "noIdentifiers") {
      return "This server signs you in to SnailyCAD with your Discord or Steam account, but FiveM didn't give either. Open Discord or Steam before starting FiveM.";
    }
    if (message === "playerNotLinked") {
      return "Your game account isn't linked to a SnailyCAD account. In the CAD, link Discord or Steam under ^5Account > Connections^7, then try again.";
    }
    if (status === 401 || status === 403) {
      return `SnailyCAD refused the request (${message ?? status}). Ask staff to check your CAD account.`;
    }
  }
  if (status === 0)
    return "SnailyCAD can't be reached right now. Please try again later.";
  return `SnailyCAD returned an error: ${message ?? `HTTP ${status}`}.`;
}
async function getPlayerUser(source, options = {}) {
  const auth = options.auth ?? playerAuth(source);
  const result = await cadRequest({
    method: "POST",
    path: "/user?includeActiveUnit=true",
    auth,
    quiet: true
  });
  if (!result.ok || !result.data?.id) {
    if (!options.silent) {
      chat(source, result.ok ? explainForEdition(result.edition, 401) : explainPlayerError(result));
    }
    return null;
  }
  if (options.requireUnit && !result.data.unit) {
    if (!options.silent) {
      chat(source, "No active unit found. Go on-duty first in the SnailyCAD web interface.");
    }
    return null;
  }
  return { user: result.data, auth };
}
function isOnDuty(user) {
  return Boolean(user?.unit && user.unit.status?.shouldDo !== "SET_OFF_DUTY");
}
function getUnitName(unit) {
  if ("deputies" in unit || "officers" in unit)
    return unit.callsign ?? "";
  return unit.citizen ? `${unit.citizen.name} ${unit.citizen.surname}` : "";
}

// sna-src/sync/server/common.ts
function flowResult(player, flow, ok, message) {
  const result = { flow, ok, message: message?.replace(/\^[0-9*_~r]/g, "") };
  emitNet("sna-sync:flow-result" /* FlowResult */, player, result);
}
function netSource() {
  const player = Number(globalThis.source);
  return Number.isInteger(player) && player > 0 ? player : null;
}

// sna-src/sync/server/auth.ts
var LINK_HELP = "In the CAD, link Discord or Steam under ^5Account > Connections^7. This server signs you in with that account.";
RegisterCommand(
  "sn-whoami" /* WhoAmI */,
  async (source) => {
    const player = Number(source);
    if (player <= 0)
      return;
    const result = await getPlayerUser(player);
    if (!result)
      return;
    chat(player, `Your SnailyCAD username is ^5${result.user.username}^7.`);
  },
  false
);
RegisterCommand(
  "sn-logout" /* Logout */,
  async (source) => {
    const player = Number(source);
    if (player <= 0)
      return;
    if (await getEdition() === "snailycad-mysql") {
      chat(
        player,
        "This server signs you in with your linked Discord / Steam account. To sign out, unlink it in the CAD under ^5Account > Connections^7."
      );
      return;
    }
    const license = getLicense(player);
    if (!license || !GetResourceKvpString(tokenKvpKey(license))) {
      chat(player, "Please make sure you're authenticated. Use: ^5/sn-auth^7.");
      return;
    }
    DeleteResourceKvp(tokenKvpKey(license));
    chat(player, "Successfully logged out this player from your SnailyCAD account.");
  },
  false
);
RegisterCommand(
  "sn-auth" /* Auth */,
  async (source) => {
    const player = Number(source);
    if (player <= 0)
      return;
    if (await getEdition() === "snailycad-mysql") {
      const result = await getPlayerUser(player, { silent: true });
      chat(
        player,
        result ? `You're already signed in as ^5${result.user.username}^7 through your linked account.` : LINK_HELP
      );
      return;
    }
    emitNet("sna-sync:request-authentication-flow" /* RequestAuthFlow */, player);
  },
  false
);
onNet("sna-sync:on-user-save" /* OnUserSave */, async (data) => {
  const player = netSource();
  if (!player)
    return;
  if (throttled("auth", player, 3e3)) {
    flowResult(player, "auth", false, "Please wait a moment before trying again.");
    return;
  }
  if (await getEdition() === "snailycad-mysql") {
    flowResult(player, "auth", false, "This server doesn't use personal API tokens.");
    return;
  }
  const token = data && typeof data === "object" && "token" in data && typeof data.token === "string" ? data.token.trim() : "";
  if (!token || token.length > 512) {
    flowResult(player, "auth", false, "Enter your Personal API Token.");
    return;
  }
  const license = getLicense(player);
  if (!license) {
    flowResult(
      player,
      "auth",
      false,
      "FiveM didn't give your license identifier. Rejoin and try again."
    );
    return;
  }
  const result = await cadRequest({
    path: "/user/api-token/validate",
    method: "POST",
    data: { token },
    auth: { type: "none" },
    quiet: true
  });
  if (!result.ok) {
    flowResult(
      player,
      "auth",
      false,
      result.status === 0 ? "SnailyCAD can't be reached right now. Please try again later." : result.errorMessage === "invalidToken" || result.status === 400 || result.status === 404 ? "An invalid Personal API Token was provided." : "Could not verify your Personal API Token."
    );
    return;
  }
  SetResourceKvp(tokenKvpKey(license), token);
  flowResult(player, "auth", true, "You have successfully authenticated with SnailyCAD.");
});

// sna-src/sync/server/alerts.ts
var import_socket = __toESM(require_cjs4());
var DUTY_CACHE_MS = 6e4;
var dutyCache = /* @__PURE__ */ new Map();
function forgetDuty(player) {
  dutyCache.delete(player);
}
async function playerIsOnDuty(player) {
  const cached = dutyCache.get(player);
  if (cached && Date.now() - cached.at < DUTY_CACHE_MS)
    return cached.onDuty;
  const result = await getPlayerUser(player, { silent: true });
  const onDuty = isOnDuty(result?.user);
  dutyCache.set(player, { onDuty, at: Date.now() });
  return onDuty;
}
function notify(player, data) {
  emitNet("sna-sync:create-notification" /* CreateNotification */, player, data);
}
async function notifyOnDuty(data) {
  const players = getPlayers().map(Number);
  for (let i = 0; i < players.length; i += 8) {
    await Promise.all(
      players.slice(i, i + 8).map(async (player) => {
        if (await playerIsOnDuty(player))
          notify(player, data);
      })
    );
  }
}
var socket = null;
var socketUrl = "";
async function connect() {
  const { url } = getConnection();
  const base = url.replace(/\/v1$/, "");
  if (!base || base === socketUrl)
    return;
  socket?.disconnect();
  socketUrl = base;
  let reportedError = false;
  socket = (0, import_socket.io)(base, { transports: ["websocket"], reconnectionDelayMax: 3e4 });
  socket.on("connect", () => {
    reportedError = false;
    log(`connected to SnailyCAD live updates (${base})`);
  });
  socket.on("connect_error", (error) => {
    if (reportedError)
      return;
    reportedError = true;
    warn(`could not connect to SnailyCAD live updates at ${base}: ${error.message} (retrying)`);
  });
  socket.on("Create911Call", (call) => {
    if (!call?.caseNumber)
      return;
    void notifyOnDuty({
      title: "Incoming 911 Call",
      message: `A new 911 call has been created with case number: #${call.caseNumber}. To assign yourself to the call, use /${"sn-attach" /* AttachTo911Call */} ${call.caseNumber}`,
      timeout: 15e3
    });
  });
  socket.on("PANIC_BUTTON_ON", (unit) => {
    void notifyOnDuty({
      title: "Panic Button Enabled",
      message: `${unit?.formattedUnitData || "A unit"} has pressed their panic button.`
    });
  });
  socket.on("Signal100", (enabled) => {
    notify(-1, {
      title: enabled ? "Signal 100 Enabled" : "Signal 100 Disabled",
      message: enabled ? "Signal 100 is now enabled." : "Signal 100 is now disabled."
    });
  });
  socket.on("UpdateAreaOfPlay", (areaOfPlay) => {
    notify(-1, {
      title: "AOP Changed",
      message: `Area of play has been updated to: ${areaOfPlay ?? "None"}`
    });
  });
}
on("onResourceStart", (resourceName) => {
  if (resourceName !== GetCurrentResourceName())
    return;
  if (GetConvar("snailycad_live_alerts", "true") === "false")
    return;
  void connect();
  setInterval(() => void connect(), 6e4);
});
on("onResourceStop", (resourceName) => {
  if (resourceName === GetCurrentResourceName())
    socket?.disconnect();
});

// sna-src/sync/server/unit.ts
async function getStatusCodes(auth) {
  const result = await cadRequest({
    method: "GET",
    path: "/admin/values/codes_10?includeAll=true",
    auth,
    quiet: true
  });
  if (!result.ok || !Array.isArray(result.data))
    return null;
  return result.data.find((v) => v.type === "CODES_10")?.values ?? [];
}
RegisterCommand(
  "sn-active-unit" /* ActiveUnit */,
  async (source) => {
    const player = Number(source);
    if (player <= 0)
      return;
    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit)
      return;
    const unit = result.user.unit;
    chat(
      player,
      `Your active unit is ^5${getUnitName(unit) || "Unknown"} ^7with status of ^5${unit.status?.value?.value ?? "None"}^7.`
    );
  },
  false
);
async function setStatus(player, statusId, viaNui) {
  const result = await getPlayerUser(player, { requireUnit: true, silent: viaNui });
  if (!result?.user.unit) {
    if (viaNui)
      flowResult(player, "set-status", false, "No active unit found. Go on-duty first.");
    return;
  }
  const updated = await cadRequest({
    method: "PUT",
    path: `/dispatch/status/${encodeURIComponent(result.user.unit.id)}`,
    auth: result.auth,
    data: { status: statusId },
    quiet: true
  });
  forgetDuty(player);
  if (!updated.ok || !updated.data?.id) {
    const message2 = updated.ok ? "An error occurred while updating your status." : explainPlayerError(updated);
    if (viaNui)
      flowResult(player, "set-status", false, message2);
    else
      chat(player, message2);
    return;
  }
  const message = `Your status has been updated to ^5${updated.data.status?.value?.value ?? "?"}^7.`;
  if (viaNui)
    flowResult(player, "set-status", true, message);
  chat(player, message);
}
RegisterCommand(
  "sn-set-status" /* SetStatus */,
  async (source, args) => {
    const player = Number(source);
    if (player <= 0)
      return;
    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit)
      return;
    const codes = await getStatusCodes(result.auth);
    if (!codes) {
      chat(player, "Could not load the status codes from SnailyCAD.");
      return;
    }
    const statusCodes = codes.filter((v) => v.type === "STATUS_CODE");
    const [statusCode] = args;
    if (statusCode) {
      const match = statusCodes.find(
        (v) => v.value.value.toLowerCase().startsWith(statusCode.toLowerCase())
      );
      if (!match) {
        chat(player, "An invalid status code was provided.");
        return;
      }
      await setStatus(player, match.id, false);
      return;
    }
    const statuses = statusCodes.map((v) => ({
      id: v.id,
      label: v.value.value,
      color: v.color ?? null
    }));
    emitNet("sna-sync:request-set-status-flow" /* RequestSetStatusFlow */, player, {
      statuses,
      currentStatusId: result.user.unit.status?.id ?? null
    });
  },
  false
);
onNet(
  "sna-sync:on-set-unit-status" /* OnSetUnitStatus */,
  async (_source, _unitId, statusId) => {
    const player = netSource();
    if (!player || typeof statusId !== "string" || !statusId)
      return;
    if (throttled("set-status", player, 1500))
      return;
    await setStatus(player, statusId, true);
  }
);
RegisterCommand(
  "sn-panic-button" /* PanicButton */,
  async (source) => {
    const player = Number(source);
    if (player <= 0 || throttled("panic", player, 2e3))
      return;
    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit)
      return;
    const unit = result.user.unit;
    const isOfficer = Array.isArray(unit.divisions) || "officers" in unit;
    const updated = await cadRequest({
      method: "POST",
      path: isOfficer ? "/leo/panic-button" : "/ems-fd/panic-button",
      data: { [isOfficer ? "officerId" : "deputyId"]: unit.id },
      auth: result.auth,
      quiet: true
    });
    if (!updated.ok || !updated.data?.id) {
      chat(
        player,
        updated.ok ? "An error occurred while updating your status." : explainPlayerError(updated)
      );
      return;
    }
    const enabled = updated.data.status?.shouldDo === "PANIC_BUTTON";
    chat(player, `You successfully ${enabled ? "enabled" : "disabled"} your panic button`);
  },
  false
);
on("playerDropped", () => {
  const player = Number(globalThis.source);
  forgetDuty(player);
  if (GetConvar("snailycad_player_leave_auto_off_duty", "false") !== "true")
    return;
  const auth = playerAuth(player);
  void setOffDuty(player, auth);
});
async function setOffDuty(player, auth) {
  const result = await getPlayerUser(player, { auth, silent: true });
  if (!result?.user.unit)
    return;
  const codes = await getStatusCodes(auth);
  const offDuty = codes?.find((v) => v.shouldDo === "SET_OFF_DUTY");
  if (!offDuty)
    return;
  await cadRequest({
    method: "PUT",
    path: `/dispatch/status/${encodeURIComponent(result.user.unit.id)}`,
    auth,
    data: { status: offDuty.id },
    quiet: true
  });
}

// sna-src/sync/server/attach.ts
var PAGE_SIZE = 25;
var MAX_CALLS = 50;
function slateToText(value) {
  if (!value || typeof value !== "object")
    return "";
  if (Array.isArray(value))
    return value.map(slateToText).filter(Boolean).join(" ");
  const node = value;
  if (typeof node.text === "string")
    return node.text;
  return slateToText(node.children);
}
async function listCalls(auth) {
  const calls = [];
  let result = null;
  for (let skip = 0; skip < MAX_CALLS; skip += PAGE_SIZE) {
    const page = await cadRequest({
      method: "GET",
      path: `/911-calls?take=${PAGE_SIZE}&skip=${skip}`,
      auth,
      quiet: true
    });
    if (!page.ok || !page.data) {
      if (!result)
        return { ...page, data: null };
      break;
    }
    calls.push(...page.data.calls);
    result = { ...page, data: calls };
    if (calls.length >= page.data.totalCount || page.data.calls.length < PAGE_SIZE)
      break;
  }
  return result ? { ...result, data: calls.slice(0, MAX_CALLS) } : { ok: false, status: 0, data: null, edition: "original" };
}
RegisterCommand(
  "sn-attach" /* AttachTo911Call */,
  async (source, args) => {
    const player = Number(source);
    if (player <= 0 || throttled("attach-command", player, 1500))
      return;
    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit)
      return;
    const unitId = result.user.unit.id;
    const [caseNumber] = args;
    if (caseNumber) {
      const id = caseNumber.replace(/^#/, "");
      const call = await cadRequest({
        method: "GET",
        path: `/911-calls/${encodeURIComponent(id)}`,
        auth: result.auth,
        quiet: true
      });
      if (!call.ok || !call.data?.id) {
        chat(
          player,
          call.status === 404 || call.ok ? "That call could not be found. Please try a different case-number." : explainPlayerError(call)
        );
        return;
      }
      await attach(player, "assign", call.data.id, false);
      return;
    }
    const calls = await listCalls(result.auth);
    if (!calls.ok || !calls.data) {
      chat(player, explainPlayerError(calls));
      return;
    }
    const list = calls.data.map((call) => ({
      id: call.id,
      caseNumber: call.caseNumber,
      location: call.location ?? "",
      postal: call.postal ?? null,
      caller: call.name ?? "",
      description: (slateToText(call.descriptionData) || call.description || "").slice(0, 300),
      isAttached: Boolean(call.assignedUnits?.some((u) => u.unit?.id === unitId))
    }));
    emitNet("sna-sync:request-call-911-attach-flow" /* RequestCall911AttachFlow */, player, { calls: list });
  },
  false
);
async function attach(player, type, callId, viaNui) {
  const result = await getPlayerUser(player, { requireUnit: true, silent: viaNui });
  if (!result?.user.unit) {
    if (viaNui)
      flowResult(player, "attach", false, "No active unit found. Go on-duty first.");
    return;
  }
  const updated = await cadRequest({
    method: "POST",
    path: `/911-calls/${type}/${encodeURIComponent(callId)}`,
    data: { unit: result.user.unit.id },
    auth: result.auth,
    quiet: true
  });
  if (!updated.ok || !updated.data?.id) {
    const message2 = updated.ok ? "An error occurred while attaching you to the call." : explainPlayerError(updated);
    if (viaNui)
      flowResult(player, "attach", false, message2);
    else
      chat(player, message2);
    return;
  }
  const message = type === "assign" ? `Successfully attached yourself to a call with case number: #${updated.data.caseNumber}.` : `Successfully removed yourself from a call with case number: #${updated.data.caseNumber}.`;
  if (viaNui)
    flowResult(player, "attach", true, message);
  chat(player, message);
  if (type === "assign" && updated.data.postal) {
    emitNet("sna-sync:attach-postal" /* AutoPostalOnAttach */, player, updated.data.postal);
  }
}
onNet(
  "sna-sync:on-call-911-attach" /* OnCall911Attach */,
  async (_source, type, _unitId, callId) => {
    const player = netSource();
    if (!player || type !== "assign" && type !== "unassign")
      return;
    if (typeof callId !== "string" || !callId || callId.length > 64)
      return;
    if (throttled("attach", player, 1e3))
      return;
    await attach(player, type, callId, true);
  }
);

// sna-src/lib/postals.json
var postals_default = [
  {
    x: 2325.4345703125,
    y: 5147.21484375,
    code: "2000"
  },
  {
    x: 2151.2138671875,
    y: 5166.0888671875,
    code: "2001"
  },
  {
    x: 2059.6528320313,
    y: 5105.8408203125,
    code: "2002"
  },
  {
    x: 1932.6868896484,
    y: 5103.4384765625,
    code: "2003"
  },
  {
    x: 1874.1627197266,
    y: 5058.5385742188,
    code: "2004"
  },
  {
    x: 1790.8677978516,
    y: 4980.5830078125,
    code: "2005"
  },
  {
    x: 1722.9151611328,
    y: 4922.7026367188,
    code: "2006"
  },
  {
    x: 1618.3675537109,
    y: 4869.5747070313,
    code: "2007"
  },
  {
    x: 1720.4150390625,
    y: 4869.5498046875,
    code: "2008"
  },
  {
    x: 1626.4921875,
    y: 4812.8330078125,
    code: "2009"
  },
  {
    x: 1724.9730224609,
    y: 4815.1616210938,
    code: "2010"
  },
  {
    x: 1640.4869384766,
    y: 4758.4838867188,
    code: "2011"
  },
  {
    x: 1740.1538085938,
    y: 4759.6303710938,
    code: "2012"
  },
  {
    x: 1647.4232177734,
    y: 4705.2939453125,
    code: "2013"
  },
  {
    x: 1749.4649658203,
    y: 4707.6118164063,
    code: "2014"
  },
  {
    x: 1652.0007324219,
    y: 4648.5717773438,
    code: "2015"
  },
  {
    x: 1751.7038574219,
    y: 4654.4521484375,
    code: "2016"
  },
  {
    x: 1798.2783203125,
    y: 4607.2275390625,
    code: "2017"
  },
  {
    x: 1880.2452392578,
    y: 4613.1025390625,
    code: "2018"
  },
  {
    x: 1956.2924804688,
    y: 4631.9892578125,
    code: "2019"
  },
  {
    x: 2006.3699951172,
    y: 4681.5327148438,
    code: "2020"
  },
  {
    x: 1945.4973144531,
    y: 4801.9169921875,
    code: "2021"
  },
  {
    x: 1905.84765625,
    y: 4860.9282226563,
    code: "2022"
  },
  {
    x: 1850.8508300781,
    y: 4918.7465820313,
    code: "2023"
  },
  {
    x: 1964.7199707031,
    y: 4997.796875,
    code: "2024"
  },
  {
    x: 2037.2509765625,
    y: 4908.0278320313,
    code: "2025"
  },
  {
    x: 2195.98046875,
    y: 5039.0419921875,
    code: "2026"
  },
  {
    x: 2399.5415039063,
    y: 4988.2368164063,
    code: "2027"
  },
  {
    x: 2263.0915527344,
    y: 4912.6440429688,
    code: "2028"
  },
  {
    x: 2141.9887695313,
    y: 4841.7666015625,
    code: "2029"
  },
  {
    x: 2071.6528320313,
    y: 4763.8330078125,
    code: "2030"
  },
  {
    x: 2242.1860351563,
    y: 4777.966796875,
    code: "2031"
  },
  {
    x: 2328.8666992188,
    y: 4865.3110351563,
    code: "2032"
  },
  {
    x: 2337.6499023438,
    y: 4748.4252929688,
    code: "2033"
  },
  {
    x: 2417.2333984375,
    y: 4790.8999023438,
    code: "2034"
  },
  {
    x: 2421.2778320313,
    y: 4689.322265625,
    code: "2035"
  },
  {
    x: 2484.35546875,
    y: 4735.341796875,
    code: "2036"
  },
  {
    x: 2510.8581542969,
    y: 4840.3696289063,
    code: "2037"
  },
  {
    x: 2609.3720703125,
    y: 4881.6694335938,
    code: "2038"
  },
  {
    x: 2635.8583984375,
    y: 4718.7333984375,
    code: "2039"
  },
  {
    x: 2571.4553222656,
    y: 4651.408203125,
    code: "2040"
  },
  {
    x: 2509.4165039063,
    y: 4591.1923828125,
    code: "2041"
  },
  {
    x: 2552.4360351563,
    y: 4526.2192382813,
    code: "2042"
  },
  {
    x: 2643.8388671875,
    y: 4604.1171875,
    code: "2043"
  },
  {
    x: 2662.0444335938,
    y: 4487.2250976563,
    code: "2044"
  },
  {
    x: 2596.4248046875,
    y: 4426.9912109375,
    code: "2045"
  },
  {
    x: 2526.1025390625,
    y: 4358.4770507813,
    code: "2046"
  },
  {
    x: 2516.0109863281,
    y: 4252.19921875,
    code: "2047"
  },
  {
    x: 2432.7163085938,
    y: 4130.552734375,
    code: "2048"
  },
  {
    x: 2688.2358398438,
    y: 4275.7583007813,
    code: "2049"
  },
  {
    x: 2879.9858398438,
    y: 4385.541015625,
    code: "2050"
  },
  {
    x: 2928.888671875,
    y: 4517.7216796875,
    code: "2051"
  },
  {
    x: 2876.2612304688,
    y: 4626.3110351563,
    code: "2052"
  },
  {
    x: 2811.85546875,
    y: 4745.5366210938,
    code: "2053"
  },
  {
    x: 2774.6083984375,
    y: 4863.5556640625,
    code: "2054"
  },
  {
    x: 2731.4553222656,
    y: 5025.2856445313,
    code: "2055"
  },
  {
    x: 3051.9165039063,
    y: 5011.0834960938,
    code: "2056"
  },
  {
    x: 3318.0610351563,
    y: 5191.6752929688,
    code: "2057"
  },
  {
    x: 3392.9614257813,
    y: 5463.1772460938,
    code: "2058"
  },
  {
    x: 3751.1640625,
    y: 4490.3896484375,
    code: "2059"
  },
  {
    x: 3523.6528320313,
    y: 3685.2565917969,
    code: "2060"
  },
  {
    x: 1698.5841064453,
    y: 3599.630859375,
    code: "3000"
  },
  {
    x: 1664.0155029297,
    y: 3657.4467773438,
    code: "3001"
  },
  {
    x: 1763.7017822266,
    y: 3637.3305664063,
    code: "3002"
  },
  {
    x: 1732.3602294922,
    y: 3697.5083007813,
    code: "3003"
  },
  {
    x: 1845.0377197266,
    y: 3686.875,
    code: "3004"
  },
  {
    x: 1804.2158203125,
    y: 3741.1557617188,
    code: "3005"
  },
  {
    x: 1909.8052978516,
    y: 3723.4416503906,
    code: "3006"
  },
  {
    x: 1874.7437744141,
    y: 3775.328125,
    code: "3007"
  },
  {
    x: 1980.3048095703,
    y: 3761.1333007813,
    code: "3008"
  },
  {
    x: 1947.779296875,
    y: 3821.3081054688,
    code: "3009"
  },
  {
    x: 2068.7026367188,
    y: 3803.5920410156,
    code: "3010"
  },
  {
    x: 2032.6301269531,
    y: 3863.7858886719,
    code: "3011"
  },
  {
    x: 1915.0797119141,
    y: 3900.3471679688,
    code: "3012"
  },
  {
    x: 1811.0383300781,
    y: 3910.880859375,
    code: "3013"
  },
  {
    x: 1837.5073242188,
    y: 3849.4609375,
    code: "3014"
  },
  {
    x: 1729.4243164063,
    y: 3867.1586914063,
    code: "3015"
  },
  {
    x: 1764.1710205078,
    y: 3803.3999023438,
    code: "3016"
  },
  {
    x: 1632.4604492188,
    y: 3877.7250976563,
    code: "3017"
  },
  {
    x: 1695.5550537109,
    y: 3753.7414550781,
    code: "3018"
  },
  {
    x: 1659.4842529297,
    y: 3815.0869140625,
    code: "3019"
  },
  {
    x: 1635.1939697266,
    y: 3720.60546875,
    code: "3020"
  },
  {
    x: 1586.1025390625,
    y: 3754.8356933594,
    code: "3021"
  },
  {
    x: 1550.0340576172,
    y: 3805.5637207031,
    code: "3022"
  },
  {
    x: 1532.8271484375,
    y: 3702.8420410156,
    code: "3023"
  },
  {
    x: 1500.2799072266,
    y: 3660.2998046875,
    code: "3024"
  },
  {
    x: 1406.3410644531,
    y: 3649.625,
    code: "3025"
  },
  {
    x: 1370.5953369141,
    y: 3610.6567382813,
    code: "3026"
  },
  {
    x: 1155.3911132813,
    y: 3585.2182617188,
    code: "3027"
  },
  {
    x: 1002.1698608398,
    y: 3586.970703125,
    code: "3028"
  },
  {
    x: 890.87438964844,
    y: 3664.8664550781,
    code: "3029"
  },
  {
    x: 868.12127685547,
    y: 3584.5717773438,
    code: "3030"
  },
  {
    x: 464.05184936523,
    y: 3546.1821289063,
    code: "3031"
  },
  {
    x: 354.55065917969,
    y: 3571.5322265625,
    code: "3032"
  },
  {
    x: 12.16725730896,
    y: 3624.5874023438,
    code: "3033"
  },
  {
    x: 106.29637908936,
    y: 3715.4526367188,
    code: "3034"
  },
  {
    x: 1512.6649169922,
    y: 3571.7692871094,
    code: "3035"
  },
  {
    x: 1619.1922607422,
    y: 3549.9096679688,
    code: "3036"
  },
  {
    x: 1772.3302001953,
    y: 3271.2485351563,
    code: "3037"
  },
  {
    x: 1898.9097900391,
    y: 3274.7416992188,
    code: "3038"
  },
  {
    x: 1971.7969970703,
    y: 3237.5124511719,
    code: "3039"
  },
  {
    x: 1982.0775146484,
    y: 3340.2080078125,
    code: "3040"
  },
  {
    x: 2054.947265625,
    y: 3439.3666992188,
    code: "3041"
  },
  {
    x: 2165.5749511719,
    y: 3509.5932617188,
    code: "3042"
  },
  {
    x: 2194.1762695313,
    y: 3343.0915527344,
    code: "3043"
  },
  {
    x: 2117.1166992188,
    y: 3171.2788085938,
    code: "3044"
  },
  {
    x: 1994.0245361328,
    y: 3027.2221679688,
    code: "3045"
  },
  {
    x: 2019.6750488281,
    y: 2948.1025390625,
    code: "3046"
  },
  {
    x: 2127.9638671875,
    y: 2936.8850097656,
    code: "3047"
  },
  {
    x: 2385.0139160156,
    y: 3089.1416015625,
    code: "3048"
  },
  {
    x: 2466.7514648438,
    y: 3296.2875976563,
    code: "3049"
  },
  {
    x: 2578.60546875,
    y: 3170.5209960938,
    code: "3050"
  },
  {
    x: 2649.7263183594,
    y: 3283.2431640625,
    code: "3051"
  },
  {
    x: 2715.1831054688,
    y: 3490.3386230469,
    code: "3052"
  },
  {
    x: 2620.7888183594,
    y: 2748.8625488281,
    code: "3053"
  },
  {
    x: 2892.5708007813,
    y: 2871.037109375,
    code: "3054"
  },
  {
    x: 3092.947265625,
    y: 2850.3403320313,
    code: "3055"
  },
  {
    x: 2529.4777832031,
    y: 2624.2233886719,
    code: "3056"
  },
  {
    x: 2347.9375,
    y: 2562.8107910156,
    code: "3057"
  },
  {
    x: 2090.8237304688,
    y: 2307.1806640625,
    code: "3058"
  },
  {
    x: 2435.2250976563,
    y: 2136.5595703125,
    code: "3059"
  },
  {
    x: 2129.7290039063,
    y: 1824.2932128906,
    code: "3060"
  },
  {
    x: 2498.9165039063,
    y: 1638.3122558594,
    code: "3061"
  },
  {
    x: 2748.8806152344,
    y: 1728.0220947266,
    code: "3062"
  },
  {
    x: 2743.240234375,
    y: 1360.8472900391,
    code: "3063"
  },
  {
    x: 2411.7565917969,
    y: 1215.591796875,
    code: "3064"
  },
  {
    x: 1698.2772216797,
    y: 2577.6418457031,
    code: "4000"
  },
  {
    x: 1558.7576904297,
    y: 2204.5749511719,
    code: "4001"
  },
  {
    x: 1572.5209960938,
    y: 1671.529296875,
    code: "4002"
  },
  {
    x: 1232.7921142578,
    y: 1878.6875,
    code: "4003"
  },
  {
    x: 1115.5771484375,
    y: 2102.9555664063,
    code: "4004"
  },
  {
    x: 1126.4464111328,
    y: 2505.4987792969,
    code: "4005"
  },
  {
    x: 738.87951660156,
    y: 2552.6716308594,
    code: "4006"
  },
  {
    x: 851.88513183594,
    y: 2287.615234375,
    code: "4007"
  },
  {
    x: 979.0517578125,
    y: 2060.93359375,
    code: "4008"
  },
  {
    x: 850.06805419922,
    y: 2171.275390625,
    code: "4009"
  },
  {
    x: 248.26159667969,
    y: 2579.158203125,
    code: "4010"
  },
  {
    x: 72.049034118652,
    y: 2791.0595703125,
    code: "4011"
  },
  {
    x: -24.513399124146,
    y: 2883.7233886719,
    code: "4012"
  },
  {
    x: 171.71435546875,
    y: 3051.9291992188,
    code: "4013"
  },
  {
    x: 199.73529052734,
    y: 2784.50390625,
    code: "4014"
  },
  {
    x: 359.95733642578,
    y: 2622.1733398438,
    code: "4015"
  },
  {
    x: 393.29782104492,
    y: 2578.4697265625,
    code: "4016"
  },
  {
    x: 481.49340820313,
    y: 2645.1513671875,
    code: "4017"
  },
  {
    x: 481.83526611328,
    y: 2596.1435546875,
    code: "4018"
  },
  {
    x: 567.63238525391,
    y: 2659.2497558594,
    code: "4019"
  },
  {
    x: 596.22540283203,
    y: 2766.0400390625,
    code: "4020"
  },
  {
    x: 932.36022949219,
    y: 2656.7985839844,
    code: "4021"
  },
  {
    x: 976.32257080078,
    y: 2712.8264160156,
    code: "4022"
  },
  {
    x: 1035.6104736328,
    y: 2652.38671875,
    code: "4023"
  },
  {
    x: 1202.3509521484,
    y: 2708.0361328125,
    code: "4024"
  },
  {
    x: 1135.3509521484,
    y: 2647.7917480469,
    code: "4025"
  },
  {
    x: -432.455078125,
    y: 2847.0344238281,
    code: "5000"
  },
  {
    x: -111.16876983643,
    y: 1904.4890136719,
    code: "5001"
  },
  {
    x: -827.80084228516,
    y: 1729.7996826172,
    code: "5002"
  },
  {
    x: -1298.4808349609,
    y: 2482.5209960938,
    code: "5004"
  },
  {
    x: -1612.5933837891,
    y: 2825.9462890625,
    code: "5005"
  },
  {
    x: -2401.2626953125,
    y: 3522.0424804688,
    code: "5006"
  },
  {
    x: -1695.5712890625,
    y: 2431.4914550781,
    code: "5007"
  },
  {
    x: -1763.189453125,
    y: 2228.3947753906,
    code: "5008"
  },
  {
    x: -1912.8382568359,
    y: 1929.0791015625,
    code: "5009"
  },
  {
    x: -2059.5356445313,
    y: 2296.7932128906,
    code: "5010"
  },
  {
    x: -2556.2705078125,
    y: 2323.9028320313,
    code: "5011"
  },
  {
    x: -2583.1748046875,
    y: 1905.3527832031,
    code: "5012"
  },
  {
    x: -2798.3693847656,
    y: 1436.0512695313,
    code: "5013"
  },
  {
    x: -2614.8747558594,
    y: 1119.2763671875,
    code: "5014"
  },
  {
    x: -2127.6206054688,
    y: 965.19665527344,
    code: "5015"
  },
  {
    x: -1789.1284179688,
    y: 830.56616210938,
    code: "5016"
  },
  {
    x: -1497.2863769531,
    y: 1452.0844726563,
    code: "5017"
  },
  {
    x: -1544.8598632813,
    y: 973.00732421875,
    code: "5018"
  },
  {
    x: -794.03955078125,
    y: 1043.3806152344,
    code: "5019"
  },
  {
    x: -423.65374755859,
    y: 1130.7108154297,
    code: "5020"
  },
  {
    x: -190.8380279541,
    y: 1450.0402832031,
    code: "5021"
  },
  {
    x: 139.99778747559,
    y: 1421.6665039063,
    code: "5022"
  },
  {
    x: 808.36334228516,
    y: 1729.169921875,
    code: "5023"
  },
  {
    x: 1420.1495361328,
    y: 1236.8513183594,
    code: "5024"
  },
  {
    x: 767.54479980469,
    y: 1282.3012695313,
    code: "5025"
  },
  {
    x: 145.04937744141,
    y: 1134.1402587891,
    code: "5026"
  },
  {
    x: -3209.5334472656,
    y: 1289.7377929688,
    code: "5027"
  },
  {
    x: -3219.8818359375,
    y: 1252.5125732422,
    code: "5028"
  },
  {
    x: -3219.6066894531,
    y: 1214.1319580078,
    code: "5029"
  },
  {
    x: -3225.259765625,
    y: 1180.4542236328,
    code: "5030"
  },
  {
    x: -3231.5,
    y: 1150.9360351563,
    code: "5031"
  },
  {
    x: -3258.41015625,
    y: 1107.2193603516,
    code: "5032"
  },
  {
    x: -3159.5808105469,
    y: 1115.4633789063,
    code: "5033"
  },
  {
    x: -3181.7373046875,
    y: 1054.6513671875,
    code: "5034"
  },
  {
    x: -3265.2766113281,
    y: 1080.0319824219,
    code: "5035"
  },
  {
    x: -3268.5485839844,
    y: 1050.4859619141,
    code: "5036"
  },
  {
    x: -3267.6665039063,
    y: 1017.9842529297,
    code: "5037"
  },
  {
    x: -3271.5385742188,
    y: 986.66461181641,
    code: "5038"
  },
  {
    x: -3427.08984375,
    y: 965.98327636719,
    code: "5039"
  },
  {
    x: -3252.6755371094,
    y: 912.82080078125,
    code: "5040"
  },
  {
    x: -3049.3513183594,
    y: 800.64678955078,
    code: "5041"
  },
  {
    x: -3139.1105957031,
    y: 751.76202392578,
    code: "5042"
  },
  {
    x: -3140.0373535156,
    y: 714.55914306641,
    code: "5043"
  },
  {
    x: -3124.9997558594,
    y: 679.12921142578,
    code: "5044"
  },
  {
    x: -3104.8137207031,
    y: 648.91979980469,
    code: "5045"
  },
  {
    x: -3082.5166015625,
    y: 621.79669189453,
    code: "5046"
  },
  {
    x: -3072.2216796875,
    y: 595.18688964844,
    code: "5047"
  },
  {
    x: -3063.6931152344,
    y: 564.455078125,
    code: "5048"
  },
  {
    x: -3062.8161621094,
    y: 537.88696289063,
    code: "5049"
  },
  {
    x: -3059.60546875,
    y: 510.1064453125,
    code: "5050"
  },
  {
    x: -3068.2106933594,
    y: 481.17578125,
    code: "5051"
  },
  {
    x: -3082.7136230469,
    y: 451.04525756836,
    code: "5052"
  },
  {
    x: -3100.7553710938,
    y: 401.41351318359,
    code: "5053"
  },
  {
    x: -3115.8542480469,
    y: 368.93173217773,
    code: "5054"
  },
  {
    x: -3122.6906738281,
    y: 340.56274414063,
    code: "5055"
  },
  {
    x: -3133.6220703125,
    y: 310.44152832031,
    code: "5056"
  },
  {
    x: -3140.4401855469,
    y: 279.70132446289,
    code: "5057"
  },
  {
    x: -3137.7958984375,
    y: 247.23010253906,
    code: "5058"
  },
  {
    x: -3117.4375,
    y: 215.91195678711,
    code: "5059"
  },
  {
    x: -3084.1052246094,
    y: 157.45587158203,
    code: "5060"
  },
  {
    x: -3067.9194335938,
    y: 109.04676818848,
    code: "5061"
  },
  {
    x: -3029.8791503906,
    y: 68.267807006836,
    code: "5062"
  },
  {
    x: -2972.9401855469,
    y: 34.603740692139,
    code: "5063"
  },
  {
    x: -2881.1638183594,
    y: 12.759202003479,
    code: "5064"
  },
  {
    x: -2947.6696777344,
    y: 371.97171020508,
    code: "5065"
  },
  {
    x: -3033.5871582031,
    y: 384.34530639648,
    code: "5066"
  },
  {
    x: -2946.5361328125,
    y: 401.41748046875,
    code: "5067"
  },
  {
    x: -2941.5354003906,
    y: 428.54724121094,
    code: "5068"
  },
  {
    x: -2938.8955078125,
    y: 459.24383544922,
    code: "5069"
  },
  {
    x: -2940.3774414063,
    y: 486.94250488281,
    code: "5070"
  },
  {
    x: -2199.2092285156,
    y: -389.80383300781,
    code: "7000"
  },
  {
    x: -2116.3181152344,
    y: -332.00323486328,
    code: "7001"
  },
  {
    x: -2116.6474609375,
    y: -431.80743408203,
    code: "7002"
  },
  {
    x: -2082.7109375,
    y: -254.1768951416,
    code: "7003"
  },
  {
    x: -2048.8107910156,
    y: -473.78384399414,
    code: "7004"
  },
  {
    x: -2019.6340332031,
    y: -223.5227355957,
    code: "7005"
  },
  {
    x: -2018.7672119141,
    y: -498.02963256836,
    code: "7006"
  },
  {
    x: -1963.6116943359,
    y: -266.07138061523,
    code: "7007"
  },
  {
    x: -1984.607421875,
    y: -523.46142578125,
    code: "7008"
  },
  {
    x: -2009.7395019531,
    y: -342.28518676758,
    code: "7009"
  },
  {
    x: -1958.1031494141,
    y: -548.30725097656,
    code: "7010"
  },
  {
    x: -1884.072265625,
    y: -328.76721191406,
    code: "7011"
  },
  {
    x: -1932.2103271484,
    y: -571.99481201172,
    code: "7012"
  },
  {
    x: -1950.8552246094,
    y: -386.65811157227,
    code: "7013"
  },
  {
    x: -1903.9252929688,
    y: -598.01983642578,
    code: "7014"
  },
  {
    x: -1825.1501464844,
    y: -371.97402954102,
    code: "7015"
  },
  {
    x: -1871.4891357422,
    y: -619.91717529297,
    code: "7016"
  },
  {
    x: -1888.3256835938,
    y: -430.47146606445,
    code: "7017"
  },
  {
    x: -1852.6398925781,
    y: -650.08361816406,
    code: "7018"
  },
  {
    x: -1792.1490478516,
    y: -422.84359741211,
    code: "7019"
  },
  {
    x: -1821.3714599609,
    y: -674.30865478516,
    code: "7020"
  },
  {
    x: -1824.0679931641,
    y: -477.79266357422,
    code: "7021"
  },
  {
    x: -1781.3073730469,
    y: -705.05755615234,
    code: "7022"
  },
  {
    x: -1713.1843261719,
    y: -476.66754150391,
    code: "7023"
  },
  {
    x: -1648.576171875,
    y: -516.84448242188,
    code: "7024"
  },
  {
    x: -1686.0948486328,
    y: -437.1676940918,
    code: "7025"
  },
  {
    x: -1597.8563232422,
    y: -444.87408447266,
    code: "7026"
  },
  {
    x: -1648.9616699219,
    y: -395.31716918945,
    code: "7027"
  },
  {
    x: -1566.0848388672,
    y: -403.62777709961,
    code: "7028"
  },
  {
    x: -1611.2490234375,
    y: -351.30529785156,
    code: "7029"
  },
  {
    x: -1507.6091308594,
    y: -331.92144775391,
    code: "7030"
  },
  {
    x: -1563.4343261719,
    y: -273.51312255859,
    code: "7031"
  },
  {
    x: -1489.373046875,
    y: -190.91166687012,
    code: "7032"
  },
  {
    x: -1549.9063720703,
    y: -102.99909973145,
    code: "7033"
  },
  {
    x: -1484.7360839844,
    y: -53.421825408936,
    code: "7034"
  },
  {
    x: -1593.6586914063,
    y: -46.95739364624,
    code: "7035"
  },
  {
    x: -1485.3869628906,
    y: 23.832782745361,
    code: "7036"
  },
  {
    x: -1562.4373779297,
    y: 13.172778129578,
    code: "7037"
  },
  {
    x: -1654.2404785156,
    y: 26.725975036621,
    code: "7038"
  },
  {
    x: -1699.4086914063,
    y: 65.067581176758,
    code: "7039"
  },
  {
    x: -1622.4224853516,
    y: 103.41746520996,
    code: "7040"
  },
  {
    x: -1564.8999023438,
    y: 80.378746032715,
    code: "7041"
  },
  {
    x: -1493.7747802734,
    y: 74.446685791016,
    code: "7042"
  },
  {
    x: -1554.8959960938,
    y: 137.55923461914,
    code: "7043"
  },
  {
    x: -1487.9063720703,
    y: 120.43137359619,
    code: "7044"
  },
  {
    x: -1481.1636962891,
    y: 165.26069641113,
    code: "7045"
  },
  {
    x: -1447.2622070313,
    y: 207.74937438965,
    code: "7046"
  },
  {
    x: -1396.8343505859,
    y: 272.08969116211,
    code: "7047"
  },
  {
    x: -1311.5577392578,
    y: 252.57038879395,
    code: "7048"
  },
  {
    x: -1362.6612548828,
    y: 327.51477050781,
    code: "7049"
  },
  {
    x: -1314.5948486328,
    y: 360.55511474609,
    code: "7050"
  },
  {
    x: -1288.3446044922,
    y: 314.5029296875,
    code: "7051"
  },
  {
    x: -1243.1960449219,
    y: 368.21478271484,
    code: "7052"
  },
  {
    x: -1217.525390625,
    y: 267.8522644043,
    code: "7053"
  },
  {
    x: -1211.3543701172,
    y: 321.56488037109,
    code: "7054"
  },
  {
    x: -1133.1903076172,
    y: 359.32727050781,
    code: "7055"
  },
  {
    x: -1117.5603027344,
    y: 299.68145751953,
    code: "7056"
  },
  {
    x: -1037.6297607422,
    y: 225.86000061035,
    code: "7057"
  },
  {
    x: -1029.6843261719,
    y: 157.37721252441,
    code: "7058"
  },
  {
    x: -996.35229492188,
    y: 110.71755218506,
    code: "7059"
  },
  {
    x: -916.42034912109,
    y: 103.61616516113,
    code: "7060"
  },
  {
    x: -920.28967285156,
    y: 154.36337280273,
    code: "7061"
  },
  {
    x: -927.09112548828,
    y: 199.21054077148,
    code: "7062"
  },
  {
    x: -807.57794189453,
    y: 164.95886230469,
    code: "7063"
  },
  {
    x: -823.84216308594,
    y: 107.6879196167,
    code: "7064"
  },
  {
    x: -701.96051025391,
    y: 190.87864685059,
    code: "7065"
  },
  {
    x: -701.70788574219,
    y: 145.39820861816,
    code: "7066"
  },
  {
    x: -599.33984375,
    y: 212.64114379883,
    code: "7067"
  },
  {
    x: -600.82861328125,
    y: 156.52317810059,
    code: "7068"
  },
  {
    x: -493.72451782227,
    y: 211.39082336426,
    code: "7069"
  },
  {
    x: -498.17999267578,
    y: 158.81488037109,
    code: "7070"
  },
  {
    x: -418.12149047852,
    y: 206.01795959473,
    code: "7071"
  },
  {
    x: -419.13818359375,
    y: 154.64540100098,
    code: "7072"
  },
  {
    x: -339.17007446289,
    y: 208.31494140625,
    code: "7073"
  },
  {
    x: -342.44937133789,
    y: 150.45230102539,
    code: "7074"
  },
  {
    x: -267.19244384766,
    y: 216.56059265137,
    code: "7075"
  },
  {
    x: -269.85913085938,
    y: 156.34120178223,
    code: "7076"
  },
  {
    x: -164.54524230957,
    y: 220.63507080078,
    code: "7077"
  },
  {
    x: -170.33535766602,
    y: 156.90377807617,
    code: "7078"
  },
  {
    x: -51.261993408203,
    y: 224.14115905762,
    code: "7079"
  },
  {
    x: -59.861751556396,
    y: 156.80795288086,
    code: "7080"
  },
  {
    x: -71.413513183594,
    y: 97.181373596191,
    code: "7081"
  },
  {
    x: 3.8074636459351,
    y: 47.566139221191,
    code: "7082"
  },
  {
    x: 24.751974105835,
    y: 99.49405670166,
    code: "7083"
  },
  {
    x: 41.28279876709,
    y: 148.3278503418,
    code: "7084"
  },
  {
    x: 57.770198822021,
    y: 197.98307800293,
    code: "7085"
  },
  {
    x: 86.936210632324,
    y: 272.8330078125,
    code: "7086"
  },
  {
    x: 185.22845458984,
    y: 388.5940246582,
    code: "7087"
  },
  {
    x: 151.84634399414,
    y: 320.07727050781,
    code: "7088"
  },
  {
    x: 166.25904846191,
    y: 251.57748413086,
    code: "7089"
  },
  {
    x: 265.88671875,
    y: 213.06823730469,
    code: "7090"
  },
  {
    x: 293.73529052734,
    y: 289.29541015625,
    code: "7091"
  },
  {
    x: 310.46026611328,
    y: 358.32046508789,
    code: "7092"
  },
  {
    x: 379.85479736328,
    y: 336.45932006836,
    code: "7093"
  },
  {
    x: 363.01657104492,
    y: 267.38198852539,
    code: "7094"
  },
  {
    x: 339.67346191406,
    y: 191.19873046875,
    code: "7095"
  },
  {
    x: 422.00445556641,
    y: 153.41694641113,
    code: "7096"
  },
  {
    x: 449.39508056641,
    y: 237.2190246582,
    code: "7097"
  },
  {
    x: 517.52410888672,
    y: 218.90100097656,
    code: "7098"
  },
  {
    x: 487.09075927734,
    y: 133.30479431152,
    code: "7099"
  },
  {
    x: 579.41821289063,
    y: 96.697784423828,
    code: "7100"
  },
  {
    x: 607.43518066406,
    y: 184.6509552002,
    code: "7101"
  },
  {
    x: 709.21997070313,
    y: 156.31629943848,
    code: "7102"
  },
  {
    x: 678.79772949219,
    y: 76.612144470215,
    code: "7103"
  },
  {
    x: 587.54901123047,
    y: -7.8100380897522,
    code: "7104"
  },
  {
    x: 502.20208740234,
    y: -47.399017333984,
    code: "7105"
  },
  {
    x: 470.02700805664,
    y: -118.2336807251,
    code: "7106"
  },
  {
    x: 441.36865234375,
    y: -190.85466003418,
    code: "7107"
  },
  {
    x: 426.8782043457,
    y: -250.52320861816,
    code: "7108"
  },
  {
    x: 331.12322998047,
    y: -223.47969055176,
    code: "7109"
  },
  {
    x: 356.57424926758,
    y: -160.24067687988,
    code: "7110"
  },
  {
    x: 386.94644165039,
    y: -76.430992126465,
    code: "7111"
  },
  {
    x: 422.60900878906,
    y: -16.83233833313,
    code: "7112"
  },
  {
    x: 451.68350219727,
    y: 54.277870178223,
    code: "7113"
  },
  {
    x: 391.29364013672,
    y: 71.067588806152,
    code: "7114"
  },
  {
    x: 361.43807983398,
    y: 5.528687953949,
    code: "7115"
  },
  {
    x: 337.4909362793,
    y: -54.708728790283,
    code: "7116"
  },
  {
    x: 304.0458984375,
    y: -145.77757263184,
    code: "7117"
  },
  {
    x: 283.68252563477,
    y: -198.23512268066,
    code: "7118"
  },
  {
    x: 202.48402404785,
    y: -174.63926696777,
    code: "7119"
  },
  {
    x: 223.40191650391,
    y: -113.85186767578,
    code: "7120"
  },
  {
    x: 250.84468078613,
    y: -39.525653839111,
    code: "7121"
  },
  {
    x: 275.28668212891,
    y: 33.049011230469,
    code: "7122"
  },
  {
    x: 297.97344970703,
    y: 101.52397155762,
    code: "7123"
  },
  {
    x: 228.58941650391,
    y: 126.29117584229,
    code: "7124"
  },
  {
    x: 201.09918212891,
    y: 50.693996429443,
    code: "7125"
  },
  {
    x: 182.45341491699,
    y: -9.5587949752808,
    code: "7126"
  },
  {
    x: 147.91889953613,
    y: -91.046058654785,
    code: "7127"
  },
  {
    x: 126.35182189941,
    y: -145.99638366699,
    code: "7128"
  },
  {
    x: 46.364261627197,
    y: -112.9450302124,
    code: "7129"
  },
  {
    x: 67.301887512207,
    y: -61.006088256836,
    code: "7130"
  },
  {
    x: 95.328193664551,
    y: 20.40322303772,
    code: "7131"
  },
  {
    x: 108.54914855957,
    y: 64.059242248535,
    code: "7132"
  },
  {
    x: 127.78938293457,
    y: 116.97310638428,
    code: "7133"
  },
  {
    x: 141.61860656738,
    y: 167.12309265137,
    code: "7134"
  },
  {
    x: -8.0422210693359,
    y: -24.743330001831,
    code: "7135"
  },
  {
    x: -21.934183120728,
    y: -90.271217346191,
    code: "7136"
  },
  {
    x: -124.36614227295,
    y: -49.571273803711,
    code: "7137"
  },
  {
    x: -106.42967224121,
    y: 18.787809371948,
    code: "7138"
  },
  {
    x: -182.25309753418,
    y: 59.578884124756,
    code: "7139"
  },
  {
    x: -197.94508361816,
    y: -24.859977722168,
    code: "7140"
  },
  {
    x: -290.69509887695,
    y: 8.1253080368042,
    code: "7141"
  },
  {
    x: -282.97415161133,
    y: 90.788482666016,
    code: "7142"
  },
  {
    x: -354.13092041016,
    y: 91.340026855469,
    code: "7143"
  },
  {
    x: -353.85736083984,
    y: 35.223419189453,
    code: "7144"
  },
  {
    x: -435.06552124023,
    y: 38.151237487793,
    code: "7145"
  },
  {
    x: -434.21737670898,
    y: 94.225944519043,
    code: "7146"
  },
  {
    x: -505.97164916992,
    y: 95.970291137695,
    code: "7147"
  },
  {
    x: -506.88833618164,
    y: 33.970352172852,
    code: "7148"
  },
  {
    x: -605.18395996094,
    y: 31.588443756104,
    code: "7149"
  },
  {
    x: -604.90783691406,
    y: 93.528701782227,
    code: "7150"
  },
  {
    x: -698.51153564453,
    y: 68.708045959473,
    code: "7151"
  },
  {
    x: -691.76470947266,
    y: 9.6718225479126,
    code: "7152"
  },
  {
    x: -774.73699951172,
    y: -9.2394599914551,
    code: "7153"
  },
  {
    x: -796.29791259766,
    y: 52.13858795166,
    code: "7154"
  },
  {
    x: -914.65380859375,
    y: 39.113334655762,
    code: "7155"
  },
  {
    x: -865.41485595703,
    y: -48.261569976807,
    code: "7156"
  },
  {
    x: -1132.5535888672,
    y: -204.72421264648,
    code: "7157"
  },
  {
    x: -1226.751953125,
    y: -143.95236206055,
    code: "7158"
  },
  {
    x: -1293.2147216797,
    y: -117.44091796875,
    code: "7159"
  },
  {
    x: -1364.3817138672,
    y: 51.36882019043,
    code: "7160"
  },
  {
    x: -1361.15625,
    y: -105.07413482666,
    code: "7161"
  },
  {
    x: -1357.9561767578,
    y: -183.01718139648,
    code: "7162"
  },
  {
    x: -1240.8408203125,
    y: -194.26989746094,
    code: "7163"
  },
  {
    x: -1204.5501708984,
    y: -248.015625,
    code: "7164"
  },
  {
    x: -1278.6323242188,
    y: -284.64767456055,
    code: "7165"
  },
  {
    x: -1429.4681396484,
    y: -253.36561584473,
    code: "7166"
  },
  {
    x: -1307.0205078125,
    y: -241.00469970703,
    code: "7167"
  },
  {
    x: -1375.2297363281,
    y: -329.00192260742,
    code: "7168"
  },
  {
    x: -1459.9578857422,
    y: -376.86303710938,
    code: "7169"
  },
  {
    x: -1532.3116455078,
    y: -437.10891723633,
    code: "7170"
  },
  {
    x: -1588.7243652344,
    y: -587.67156982422,
    code: "7171"
  },
  {
    x: -1508.1793212891,
    y: -526.90173339844,
    code: "7172"
  },
  {
    x: -1406.3796386719,
    y: -456.11715698242,
    code: "7173"
  },
  {
    x: -1324.1636962891,
    y: -406.97958374023,
    code: "7174"
  },
  {
    x: -1237.5474853516,
    y: -361.89862060547,
    code: "7175"
  },
  {
    x: -1162.9831542969,
    y: -321.61190795898,
    code: "7176"
  },
  {
    x: -1085.3809814453,
    y: -308.07412719727,
    code: "7177"
  },
  {
    x: -1074.4820556641,
    y: -249.66285705566,
    code: "7178"
  },
  {
    x: -934.90258789063,
    y: -178.86724853516,
    code: "7179"
  },
  {
    x: -831.94970703125,
    y: -125.18535614014,
    code: "7180"
  },
  {
    x: -743.11566162109,
    y: -75.616943359375,
    code: "7181"
  },
  {
    x: -627.16333007813,
    y: -31.379716873169,
    code: "7182"
  },
  {
    x: -516.63244628906,
    y: -29.634790420532,
    code: "7183"
  },
  {
    x: -438.34127807617,
    y: -28.469976425171,
    code: "7184"
  },
  {
    x: -341.84225463867,
    y: -60.965557098389,
    code: "7185"
  },
  {
    x: -210.51528930664,
    y: -109.40273284912,
    code: "7186"
  },
  {
    x: -140.60443115234,
    y: -129.51954650879,
    code: "7187"
  },
  {
    x: -45.913478851318,
    y: -164.96725463867,
    code: "7188"
  },
  {
    x: 21.043941497803,
    y: -190.9725189209,
    code: "7189"
  },
  {
    x: 108.06352233887,
    y: -221.10440063477,
    code: "7190"
  },
  {
    x: 172.09213256836,
    y: -242.99082946777,
    code: "7191"
  },
  {
    x: 257.93273925781,
    y: -279.00726318359,
    code: "7192"
  },
  {
    x: 304.82440185547,
    y: -295.57809448242,
    code: "7193"
  },
  {
    x: 390.09271240234,
    y: -323.34320068359,
    code: "7194"
  },
  {
    x: 377.35684204102,
    y: -358.76672363281,
    code: "7195"
  },
  {
    x: 294.26147460938,
    y: -339.58251953125,
    code: "7196"
  },
  {
    x: 239.05592346191,
    y: -321.30206298828,
    code: "7197"
  },
  {
    x: 156.11320495605,
    y: -286.52401733398,
    code: "7198"
  },
  {
    x: 89.100494384766,
    y: -264.71020507813,
    code: "7199"
  },
  {
    x: 4.9829225540161,
    y: -230.5140838623,
    code: "7200"
  },
  {
    x: -51.424247741699,
    y: -212.25173950195,
    code: "7201"
  },
  {
    x: -147.44256591797,
    y: -180.49078369141,
    code: "7202"
  },
  {
    x: -225.07437133789,
    y: -158.06991577148,
    code: "7203"
  },
  {
    x: -347.58557128906,
    y: -115.0101776123,
    code: "7204"
  },
  {
    x: -473.03695678711,
    y: -66.647735595703,
    code: "7205"
  },
  {
    x: -616.19506835938,
    y: -90.261505126953,
    code: "7206"
  },
  {
    x: -711.53289794922,
    y: -125.12683105469,
    code: "7207"
  },
  {
    x: -801.57043457031,
    y: -168.83096313477,
    code: "7208"
  },
  {
    x: -871.07830810547,
    y: -233.84226989746,
    code: "7209"
  },
  {
    x: -985.2216796875,
    y: -281.61315917969,
    code: "7210"
  },
  {
    x: -1075.2819824219,
    y: -346.12161254883,
    code: "7211"
  },
  {
    x: -1133.4451904297,
    y: -373.1533203125,
    code: "7212"
  },
  {
    x: -1221.6993408203,
    y: -396.22146606445,
    code: "7213"
  },
  {
    x: -1291.6506347656,
    y: -448.19494628906,
    code: "7214"
  },
  {
    x: -1372.2003173828,
    y: -499.12393188477,
    code: "7215"
  },
  {
    x: -1442.7905273438,
    y: -547.9931640625,
    code: "7216"
  },
  {
    x: -1529.2775878906,
    y: -612.9306640625,
    code: "7217"
  },
  {
    x: -1468.208984375,
    y: -668.4365234375,
    code: "7218"
  },
  {
    x: -1397.7141113281,
    y: -616.50567626953,
    code: "7219"
  },
  {
    x: -1319.4672851563,
    y: -570.59692382813,
    code: "7220"
  },
  {
    x: -1236.9929199219,
    y: -500.71939086914,
    code: "7221"
  },
  {
    x: -1192.6867675781,
    y: -456.6296081543,
    code: "7222"
  },
  {
    x: -1116.26171875,
    y: -437.17132568359,
    code: "7223"
  },
  {
    x: -1038.6811523438,
    y: -405.91580200195,
    code: "7224"
  },
  {
    x: -950.45629882813,
    y: -358.13793945313,
    code: "7225"
  },
  {
    x: -863.43701171875,
    y: -337.49066162109,
    code: "7226"
  },
  {
    x: -773.43572998047,
    y: -220.03509521484,
    code: "7227"
  },
  {
    x: -683.05572509766,
    y: -174.72058105469,
    code: "7228"
  },
  {
    x: -593.42590332031,
    y: -132.69073486328,
    code: "7229"
  },
  {
    x: -434.96331787109,
    y: -129.74906921387,
    code: "7230"
  },
  {
    x: -333.77029418945,
    y: -148.63935852051,
    code: "7231"
  },
  {
    x: -229.61874389648,
    y: -210.62959289551,
    code: "7232"
  },
  {
    x: -158.52439880371,
    y: -230.71984863281,
    code: "7233"
  },
  {
    x: -85.653625488281,
    y: -286.23663330078,
    code: "7234"
  },
  {
    x: -24.609064102173,
    y: -305.72967529297,
    code: "7235"
  },
  {
    x: 65.954689025879,
    y: -339.39633178711,
    code: "7236"
  },
  {
    x: 128.22149658203,
    y: -363.60174560547,
    code: "7237"
  },
  {
    x: 214.67274475098,
    y: -389.03237915039,
    code: "7238"
  },
  {
    x: 271.01861572266,
    y: -432.14071655273,
    code: "7239"
  },
  {
    x: 200.45906066895,
    y: -447.49761962891,
    code: "7240"
  },
  {
    x: 112.20059967041,
    y: -415.62548828125,
    code: "7241"
  },
  {
    x: 39.297740936279,
    y: -399.71298217773,
    code: "7242"
  },
  {
    x: -50.179836273193,
    y: -367.28509521484,
    code: "7243"
  },
  {
    x: -102.442527771,
    y: -343.09912109375,
    code: "7244"
  },
  {
    x: -205.45635986328,
    y: -308.86437988281,
    code: "7245"
  },
  {
    x: -335.06890869141,
    y: -247.51156616211,
    code: "7246"
  },
  {
    x: -407.41165161133,
    y: -173.76556396484,
    code: "7247"
  },
  {
    x: -552.95635986328,
    y: -198.59223937988,
    code: "7248"
  },
  {
    x: -527.32592773438,
    y: -246.41288757324,
    code: "7249"
  },
  {
    x: -609.56915283203,
    y: -290.55505371094,
    code: "7250"
  },
  {
    x: -637.74108886719,
    y: -238.21565246582,
    code: "7251"
  },
  {
    x: -708.29119873047,
    y: -317.93792724609,
    code: "7252"
  },
  {
    x: -772.34887695313,
    y: -376.9787902832,
    code: "7253"
  },
  {
    x: -907.90661621094,
    y: -380.63442993164,
    code: "7254"
  },
  {
    x: -1033.8917236328,
    y: -440.162109375,
    code: "7255"
  },
  {
    x: -1117.4270019531,
    y: -482.70053100586,
    code: "7256"
  },
  {
    x: -1196.8448486328,
    y: -540.54779052734,
    code: "7257"
  },
  {
    x: -1296.7912597656,
    y: -608.94848632813,
    code: "7258"
  },
  {
    x: -1380.4765625,
    y: -661.00457763672,
    code: "7259"
  },
  {
    x: -1435.6938476563,
    y: -699.41857910156,
    code: "7260"
  },
  {
    x: -1330.3391113281,
    y: -708.89611816406,
    code: "7261"
  },
  {
    x: -1252.6789550781,
    y: -665.22430419922,
    code: "7262"
  },
  {
    x: -1178.6728515625,
    y: -595.59741210938,
    code: "7263"
  },
  {
    x: -1124.1014404297,
    y: -556.05163574219,
    code: "7264"
  },
  {
    x: -1063.0361328125,
    y: -525.39495849609,
    code: "7265"
  },
  {
    x: -994.33551025391,
    y: -492.98516845703,
    code: "7266"
  },
  {
    x: -894.89099121094,
    y: -439.87539672852,
    code: "7267"
  },
  {
    x: -790.12915039063,
    y: -438.1298828125,
    code: "7268"
  },
  {
    x: -696.00360107422,
    y: -413.35885620117,
    code: "7269"
  },
  {
    x: -576.52172851563,
    y: -348.46997070313,
    code: "7270"
  },
  {
    x: -575.54638671875,
    y: -422.2868347168,
    code: "7271"
  },
  {
    x: -467.97714233398,
    y: -427.6130065918,
    code: "7272"
  },
  {
    x: -504.89535522461,
    y: -330.84494018555,
    code: "7273"
  },
  {
    x: -447.94088745117,
    y: -303.10745239258,
    code: "7274"
  },
  {
    x: -380.36608886719,
    y: -360.9977722168,
    code: "7275"
  },
  {
    x: -374.79534912109,
    y: -429.47268676758,
    code: "7276"
  },
  {
    x: -291.27841186523,
    y: -443.0768737793,
    code: "7277"
  },
  {
    x: -121.00784301758,
    y: -415.94769287109,
    code: "7278"
  },
  {
    x: -72.945343017578,
    y: -445.46435546875,
    code: "7279"
  },
  {
    x: 51.300407409668,
    y: -445.50051879883,
    code: "7280"
  },
  {
    x: 379.78671264648,
    y: -442.5491027832,
    code: "7281"
  },
  {
    x: 571.29211425781,
    y: -230.64088439941,
    code: "7282"
  },
  {
    x: 573.90319824219,
    y: -141.51860046387,
    code: "7283"
  },
  {
    x: 684.57373046875,
    y: -62.453575134277,
    code: "7284"
  },
  {
    x: 775.15447998047,
    y: 68.541107177734,
    code: "7285"
  },
  {
    x: 751.83099365234,
    y: 225.51345825195,
    code: "7286"
  },
  {
    x: 1265.6342773438,
    y: 318.17315673828,
    code: "7287"
  },
  {
    x: 1091.7604980469,
    y: 237.2815246582,
    code: "7288"
  },
  {
    x: 1031.2438964844,
    y: 153.43008422852,
    code: "7289"
  },
  {
    x: 1132.4299316406,
    y: 102.0453338623,
    code: "7290"
  },
  {
    x: 990.43524169922,
    y: 78.978652954102,
    code: "7291"
  },
  {
    x: 951.14349365234,
    y: 15.789879798889,
    code: "7292"
  },
  {
    x: 897.08648681641,
    y: -47.410163879395,
    code: "7293"
  },
  {
    x: 802.30731201172,
    y: -129.49909973145,
    code: "7294"
  },
  {
    x: 883.87591552734,
    y: -179.1529083252,
    code: "7295"
  },
  {
    x: 737.31951904297,
    y: -303.07089233398,
    code: "7296"
  },
  {
    x: 858.00885009766,
    y: -284.80178833008,
    code: "7297"
  },
  {
    x: 956.86846923828,
    y: -228.18383789063,
    code: "7298"
  },
  {
    x: 1004.9545288086,
    y: -132.57548522949,
    code: "7299"
  },
  {
    x: 1112.0799560547,
    y: -198.71315002441,
    code: "7300"
  },
  {
    x: 1056.8569335938,
    y: -283.15243530273,
    code: "7301"
  },
  {
    x: 1159.2609863281,
    y: -309.76162719727,
    code: "7302"
  },
  {
    x: 1106.41796875,
    y: -339.31286621094,
    code: "7303"
  },
  {
    x: 998.08197021484,
    y: -368.86080932617,
    code: "7304"
  },
  {
    x: 1025.4958496094,
    y: -396.64190673828,
    code: "7305"
  },
  {
    x: 1032.5069580078,
    y: -482.85696411133,
    code: "7306"
  },
  {
    x: 984.22222900391,
    y: -421.69152832031,
    code: "7307"
  },
  {
    x: 1004.5624389648,
    y: -507.33633422852,
    code: "7308"
  },
  {
    x: 952.30828857422,
    y: -451.27035522461,
    code: "7309"
  },
  {
    x: 961.44720458984,
    y: -530.39605712891,
    code: "7310"
  },
  {
    x: 919.19305419922,
    y: -474.91271972656,
    code: "7311"
  },
  {
    x: 920.62359619141,
    y: -553.45599365234,
    code: "7312"
  },
  {
    x: 861.27502441406,
    y: -498.60314941406,
    code: "7313"
  },
  {
    x: 837.93188476563,
    y: -534.06561279297,
    code: "7314"
  },
  {
    x: 834.6513671875,
    y: -571.2861328125,
    code: "7315"
  },
  {
    x: 868.69256591797,
    y: -606.81170654297,
    code: "7316"
  },
  {
    x: 910.16247558594,
    y: -639.21429443359,
    code: "7317"
  },
  {
    x: 984.22778320313,
    y: -609.14489746094,
    code: "7318"
  },
  {
    x: 940.15533447266,
    y: -673.52618408203,
    code: "7319"
  },
  {
    x: 962.33331298828,
    y: -711.86682128906,
    code: "7320"
  },
  {
    x: 1029.8846435547,
    y: -682.97528076172,
    code: "7321"
  },
  {
    x: 988.23333740234,
    y: -743.79754638672,
    code: "7322"
  },
  {
    x: 1059.9173583984,
    y: -716.05279541016,
    code: "7323"
  },
  {
    x: 1048.3874511719,
    y: -790.47393798828,
    code: "7324"
  },
  {
    x: 1112.9832763672,
    y: -743.86700439453,
    code: "7325"
  },
  {
    x: 1146.2985839844,
    y: -792.89196777344,
    code: "7326"
  },
  {
    x: 1151.85546875,
    y: -710.85028076172,
    code: "7327"
  },
  {
    x: 1241.865234375,
    y: -712.66967773438,
    code: "7328"
  },
  {
    x: 1302.3513183594,
    y: -757.56036376953,
    code: "7329"
  },
  {
    x: 1375.2471923828,
    y: -778.2587890625,
    code: "7330"
  },
  {
    x: 1418.5832519531,
    y: -719.27124023438,
    code: "7331"
  },
  {
    x: 1348.0096435547,
    y: -695.68811035156,
    code: "7332"
  },
  {
    x: 1243.8138427734,
    y: -663.23425292969,
    code: "7333"
  },
  {
    x: 1141.3553466797,
    y: -664.12512207031,
    code: "7334"
  },
  {
    x: 1133.3791503906,
    y: -611.91491699219,
    code: "7335"
  },
  {
    x: 1233.3999023438,
    y: -624.34521484375,
    code: "7336"
  },
  {
    x: 1130.3444824219,
    y: -556.46697998047,
    code: "7337"
  },
  {
    x: 1226.7858886719,
    y: -581.15197753906,
    code: "7338"
  },
  {
    x: 1316.2248535156,
    y: -592.51257324219,
    code: "7339"
  },
  {
    x: 1383.7846679688,
    y: -620.29193115234,
    code: "7340"
  },
  {
    x: 1404.7026367188,
    y: -562.45245361328,
    code: "7341"
  },
  {
    x: 1347.1457519531,
    y: -532.98547363281,
    code: "7342"
  },
  {
    x: 1235.8304443359,
    y: -493.45098876953,
    code: "7343"
  },
  {
    x: 1131.0235595703,
    y: -484.64471435547,
    code: "7344"
  },
  {
    x: 1248.1322021484,
    y: -443.09335327148,
    code: "7345"
  },
  {
    x: 1138.6513671875,
    y: -445.71017456055,
    code: "7346"
  },
  {
    x: 1264.6722412109,
    y: -363.70111083984,
    code: "7347"
  },
  {
    x: 1146.2971191406,
    y: -399.16549682617,
    code: "7348"
  },
  {
    x: 1374.98046875,
    y: -149.51196289063,
    code: "7349"
  },
  {
    x: 1635.5555419922,
    y: -30.312574386597,
    code: "7350"
  },
  {
    x: 2178,
    y: 73.750213623047,
    code: "7351"
  },
  {
    x: 1859.2497558594,
    y: 335.0166015625,
    code: "7352"
  },
  {
    x: 2424,
    y: 570.25042724609,
    code: "7353"
  },
  {
    x: 2565.1499023438,
    y: 291.29028320313,
    code: "7354"
  },
  {
    x: 2579.5817871094,
    y: 465.62487792969,
    code: "7355"
  },
  {
    x: 2407.4816894531,
    y: 631.80883789063,
    code: "7356"
  },
  {
    x: 1532.5715332031,
    y: 815.74157714844,
    code: "7357"
  },
  {
    x: 1975.5415039063,
    y: 846.99938964844,
    code: "7358"
  },
  {
    x: 2291.591796875,
    y: 939.62420654297,
    code: "7359"
  },
  {
    x: 2013.2316894531,
    y: 1271.3271484375,
    code: "7360"
  },
  {
    x: -1830.291015625,
    y: -1214.4635009766,
    code: "8000"
  },
  {
    x: -1678.4899902344,
    y: -1117.2708740234,
    code: "8001"
  },
  {
    x: -1620.734375,
    y: -1045.5661621094,
    code: "8002"
  },
  {
    x: -1559.7967529297,
    y: -974.66320800781,
    code: "8003"
  },
  {
    x: -1613.6203613281,
    y: -830.43530273438,
    code: "8004"
  },
  {
    x: -1484.1507568359,
    y: -918.12463378906,
    code: "8005"
  },
  {
    x: -1415.4753417969,
    y: -876.10388183594,
    code: "8006"
  },
  {
    x: -1343.1877441406,
    y: -793.85461425781,
    code: "8007"
  },
  {
    x: -1273.4790039063,
    y: -786.72662353516,
    code: "8008"
  },
  {
    x: -1232.4600830078,
    y: -836.15246582031,
    code: "8009"
  },
  {
    x: -1168.3585205078,
    y: -793.15966796875,
    code: "8010"
  },
  {
    x: -1199.9035644531,
    y: -756.53601074219,
    code: "8011"
  },
  {
    x: -1165.298828125,
    y: -727.05938720703,
    code: "8012"
  },
  {
    x: -1131.4459228516,
    y: -761.37280273438,
    code: "8013"
  },
  {
    x: -1075.2786865234,
    y: -708.79516601563,
    code: "8014"
  },
  {
    x: -1031.8812255859,
    y: -672.93310546875,
    code: "8015"
  },
  {
    x: -977.32299804688,
    y: -642.66235351563,
    code: "8016"
  },
  {
    x: -920.38171386719,
    y: -621.97686767578,
    code: "8017"
  },
  {
    x: -806.84155273438,
    y: -609.24731445313,
    code: "8018"
  },
  {
    x: -690.900390625,
    y: -616.42333984375,
    code: "8019"
  },
  {
    x: -551.08923339844,
    y: -611.66772460938,
    code: "8020"
  },
  {
    x: -314,
    y: -598.94732666016,
    code: "8021"
  },
  {
    x: -179.7685546875,
    y: -579.82098388672,
    code: "8022"
  },
  {
    x: -200.94201660156,
    y: -643.61340332031,
    code: "8023"
  },
  {
    x: -134.41723632813,
    y: -615.75347900391,
    code: "8024"
  },
  {
    x: -63.135009765625,
    y: -698.6923828125,
    code: "8025"
  },
  {
    x: -40.45458984375,
    y: -641.31292724609,
    code: "8026"
  },
  {
    x: -17.804565429688,
    y: -581.57183837891,
    code: "8027"
  },
  {
    x: 47.885620117188,
    y: -593.5556640625,
    code: "8028"
  },
  {
    x: 25.114074707031,
    y: -653.37811279297,
    code: "8029"
  },
  {
    x: 6.3492431640625,
    y: -716.36633300781,
    code: "8030"
  },
  {
    x: 87.976623535156,
    y: -750.6728515625,
    code: "8031"
  },
  {
    x: 112.23950195313,
    y: -680.56030273438,
    code: "8032"
  },
  {
    x: 133.30133056641,
    y: -620.82183837891,
    code: "8033"
  },
  {
    x: 188.67425537109,
    y: -647.15240478516,
    code: "8034"
  },
  {
    x: 173.08740234375,
    y: -702.19592285156,
    code: "8035"
  },
  {
    x: 143.93762207031,
    y: -769.15155029297,
    code: "8036"
  },
  {
    x: 246.29974365234,
    y: -812.24029541016,
    code: "8037"
  },
  {
    x: 270.53942871094,
    y: -742.11029052734,
    code: "8038"
  },
  {
    x: 290.00720214844,
    y: -677.58953857422,
    code: "8039"
  },
  {
    x: 326.24517822266,
    y: -609.85137939453,
    code: "8040"
  },
  {
    x: 462.87261962891,
    y: -636.20239257813,
    code: "8041"
  },
  {
    x: 374.75653076172,
    y: -729.50396728516,
    code: "8042"
  },
  {
    x: 358.39038085938,
    y: -824.39807128906,
    code: "8043"
  },
  {
    x: 457.5615234375,
    y: -716.79925537109,
    code: "8044"
  },
  {
    x: 456.33410644531,
    y: -805.27172851563,
    code: "8045"
  },
  {
    x: 456.67822265625,
    y: -907.32147216797,
    code: "8046"
  },
  {
    x: 464.20166015625,
    y: -993.43060302734,
    code: "8047"
  },
  {
    x: 359.36865234375,
    y: -1011.7819824219,
    code: "8048"
  },
  {
    x: 362.11944580078,
    y: -927.90307617188,
    code: "8049"
  },
  {
    x: 325.01721191406,
    y: -887.50073242188,
    code: "8050"
  },
  {
    x: 292.69952392578,
    y: -983.19506835938,
    code: "8051"
  },
  {
    x: 273.89923095703,
    y: -1028.6313476563,
    code: "8052"
  },
  {
    x: 171.40972900391,
    y: -991.18896484375,
    code: "8053"
  },
  {
    x: 221.99188232422,
    y: -881.20806884766,
    code: "8054"
  },
  {
    x: 77.266540527344,
    y: -821.47180175781,
    code: "8055"
  },
  {
    x: 68.063781738281,
    y: -884.46630859375,
    code: "8056"
  },
  {
    x: 48.502136230469,
    y: -940.29296875,
    code: "8057"
  },
  {
    x: -61.113586425781,
    y: -900.44781494141,
    code: "8058"
  },
  {
    x: -43.23681640625,
    y: -842.26586914063,
    code: "8059"
  },
  {
    x: -26.1337890625,
    y: -788.89819335938,
    code: "8060"
  },
  {
    x: -81.564697265625,
    y: -764.98870849609,
    code: "8061"
  },
  {
    x: -106.72705078125,
    y: -816.0107421875,
    code: "8062"
  },
  {
    x: -129.48596191406,
    y: -875.82818603516,
    code: "8063"
  },
  {
    x: -223.96990966797,
    y: -843.17120361328,
    code: "8064"
  },
  {
    x: -207.68090820313,
    y: -786.60998535156,
    code: "8065"
  },
  {
    x: -187.39575195313,
    y: -731.65405273438,
    code: "8066"
  },
  {
    x: -301.76251220703,
    y: -694.13153076172,
    code: "8067"
  },
  {
    x: -301.71411132813,
    y: -693.98406982422,
    code: "8068"
  },
  {
    x: -324.98895263672,
    y: -816.22521972656,
    code: "8069"
  },
  {
    x: -460.11907958984,
    y: -819.43811035156,
    code: "8070"
  },
  {
    x: -468.53918457031,
    y: -758.87475585938,
    code: "8071"
  },
  {
    x: -494.47418212891,
    y: -701.51293945313,
    code: "8072"
  },
  {
    x: -588.96990966797,
    y: -696.76776123047,
    code: "8073"
  },
  {
    x: -579.85424804688,
    y: -758.00122070313,
    code: "8074"
  },
  {
    x: -549.23425292969,
    y: -808.41369628906,
    code: "8075"
  },
  {
    x: -697.12164306641,
    y: -813.23229980469,
    code: "8076"
  },
  {
    x: -695.17755126953,
    y: -755.06591796875,
    code: "8077"
  },
  {
    x: -693.22772216797,
    y: -692.9306640625,
    code: "8078"
  },
  {
    x: -777.00115966797,
    y: -688.97875976563,
    code: "8079"
  },
  {
    x: -780.63635253906,
    y: -755.92938232422,
    code: "8080"
  },
  {
    x: -778.72772216797,
    y: -811.79296875,
    code: "8081"
  },
  {
    x: -820.61395263672,
    y: -784.72058105469,
    code: "8082"
  },
  {
    x: -825.85101318359,
    y: -725.76879882813,
    code: "8083"
  },
  {
    x: -901.24066162109,
    y: -693.91833496094,
    code: "8084"
  },
  {
    x: -901.66876220703,
    y: -759.30755615234,
    code: "8085"
  },
  {
    x: -904.50994873047,
    y: -811.95483398438,
    code: "8086"
  },
  {
    x: -963.15289306641,
    y: -804.82659912109,
    code: "8087"
  },
  {
    x: -966.00994873047,
    y: -723.55163574219,
    code: "8088"
  },
  {
    x: -1023.8558959961,
    y: -769.82843017578,
    code: "8089"
  },
  {
    x: -1084.8941650391,
    y: -830.42523193359,
    code: "8090"
  },
  {
    x: -1111.6213378906,
    y: -879.06958007813,
    code: "8091"
  },
  {
    x: -1175.83203125,
    y: -916.56103515625,
    code: "8092"
  },
  {
    x: -1234.453125,
    y: -950.07574462891,
    code: "8093"
  },
  {
    x: -1329.7668457031,
    y: -965.24383544922,
    code: "8094"
  },
  {
    x: -1354.1298828125,
    y: -919.81860351563,
    code: "8095"
  },
  {
    x: -1410.3618164063,
    y: -987.5986328125,
    code: "8096"
  },
  {
    x: -1504.8696289063,
    y: -1076.0716552734,
    code: "8097"
  },
  {
    x: -1435.9759521484,
    y: -1114.3579101563,
    code: "8098"
  },
  {
    x: -1421.2749023438,
    y: -1197.2924804688,
    code: "8099"
  },
  {
    x: -1339.2521972656,
    y: -1182.1665039063,
    code: "8100"
  },
  {
    x: -1338.125,
    y: -1134.3774414063,
    code: "8101"
  },
  {
    x: -1359.2917480469,
    y: -1065.0572509766,
    code: "8102"
  },
  {
    x: -1313.4952392578,
    y: -1006.940246582,
    code: "8103"
  },
  {
    x: -1293.9929199219,
    y: -1054.7724609375,
    code: "8104"
  },
  {
    x: -1276.4588623047,
    y: -1109.0532226563,
    code: "8105"
  },
  {
    x: -1266.6072998047,
    y: -1152.8873291016,
    code: "8106"
  },
  {
    x: -1224.0283203125,
    y: -1014.2146606445,
    code: "8107"
  },
  {
    x: -1195.8745117188,
    y: -1078.5490722656,
    code: "8108"
  },
  {
    x: -1179.4812011719,
    y: -1129.8607177734,
    code: "8109"
  },
  {
    x: -1156.8045654297,
    y: -1180.1136474609,
    code: "8110"
  },
  {
    x: -1153.2834472656,
    y: -1244.7104492188,
    code: "8111"
  },
  {
    x: -1103.5051269531,
    y: -1283.8050537109,
    code: "8112"
  },
  {
    x: -1010.8887939453,
    y: -1222.5776367188,
    code: "8113"
  },
  {
    x: -1038.3781738281,
    y: -1174.7432861328,
    code: "8114"
  },
  {
    x: -1063.4271240234,
    y: -1130.8625488281,
    code: "8115"
  },
  {
    x: -1090.2277832031,
    y: -1077.0704345703,
    code: "8116"
  },
  {
    x: -1117.7211914063,
    y: -1037.6478271484,
    code: "8117"
  },
  {
    x: -1150.8475341797,
    y: -980.26293945313,
    code: "8118"
  },
  {
    x: -1062.0001220703,
    y: -934.07153320313,
    code: "8119"
  },
  {
    x: -1028.1959228516,
    y: -990.69000244141,
    code: "8120"
  },
  {
    x: -1007.8956298828,
    y: -1029.7551269531,
    code: "8121"
  },
  {
    x: -974.84289550781,
    y: -1076.8254394531,
    code: "8122"
  },
  {
    x: -954.54565429688,
    y: -1117.4990234375,
    code: "8123"
  },
  {
    x: -940.62219238281,
    y: -1179.6693115234,
    code: "8124"
  },
  {
    x: -890.05810546875,
    y: -1156.5856933594,
    code: "8125"
  },
  {
    x: -829.146484375,
    y: -1114.3566894531,
    code: "8126"
  },
  {
    x: -851.08880615234,
    y: -1068.1715087891,
    code: "8127"
  },
  {
    x: -884.19775390625,
    y: -1023.565612793,
    code: "8128"
  },
  {
    x: -912.38952636719,
    y: -975.99487304688,
    code: "8129"
  },
  {
    x: -940.86529541016,
    y: -925.58642578125,
    code: "8130"
  },
  {
    x: -977.18560791016,
    y: -880.96557617188,
    code: "8131"
  },
  {
    x: -886.755859375,
    y: -861.07391357422,
    code: "8132"
  },
  {
    x: -804.32641601563,
    y: -868.27331542969,
    code: "8133"
  },
  {
    x: -803.1748046875,
    y: -917.71661376953,
    code: "8134"
  },
  {
    x: -806.00982666016,
    y: -967.96362304688,
    code: "8135"
  },
  {
    x: -770.52813720703,
    y: -1026.1676025391,
    code: "8136"
  },
  {
    x: -750.345703125,
    y: -1071.6313476563,
    code: "8137"
  },
  {
    x: -700.55529785156,
    y: -1031.0007324219,
    code: "8138"
  },
  {
    x: -718.55364990234,
    y: -984.82147216797,
    code: "8139"
  },
  {
    x: -693.51342773438,
    y: -933.83929443359,
    code: "8140"
  },
  {
    x: -696.35992431641,
    y: -871.6806640625,
    code: "8141"
  },
  {
    x: -586.82690429688,
    y: -870.10583496094,
    code: "8142"
  },
  {
    x: -545.82250976563,
    y: -894.85827636719,
    code: "8143"
  },
  {
    x: -563.00665283203,
    y: -940.42175292969,
    code: "8144"
  },
  {
    x: -472.60583496094,
    y: -1056.7182617188,
    code: "8145"
  },
  {
    x: -492.99487304688,
    y: -1006.5607299805,
    code: "8146"
  },
  {
    x: -485.44836425781,
    y: -946.77185058594,
    code: "8147"
  },
  {
    x: -470.01870727539,
    y: -886.9052734375,
    code: "8148"
  },
  {
    x: -327.6982421875,
    y: -884.65887451172,
    code: "8149"
  },
  {
    x: -336.88616943359,
    y: -946.072265625,
    code: "8150"
  },
  {
    x: -338.91271972656,
    y: -1003.4870605469,
    code: "8151"
  },
  {
    x: -334.58642578125,
    y: -1068.0604248047,
    code: "8152"
  },
  {
    x: -317.48376464844,
    y: -1119.9077148438,
    code: "8153"
  },
  {
    x: -287.63110351563,
    y: -1033.0723876953,
    code: "8154"
  },
  {
    x: -272.1279296875,
    y: -969.33654785156,
    code: "8155"
  },
  {
    x: -254.23693847656,
    y: -907.1806640625,
    code: "8156"
  },
  {
    x: -159.82067871094,
    y: -943.06695556641,
    code: "8157"
  },
  {
    x: -180.19482421875,
    y: -1006.8634033203,
    code: "8158"
  },
  {
    x: -201.34191894531,
    y: -1066.6782226563,
    code: "8159"
  },
  {
    x: -228.0712890625,
    y: -1123.2899169922,
    code: "8160"
  },
  {
    x: -138.45300292969,
    y: -1123.2999267578,
    code: "8161"
  },
  {
    x: -118.19567871094,
    y: -1063.5217285156,
    code: "8162"
  },
  {
    x: -100.28674316406,
    y: -1007.7569580078,
    code: "8163"
  },
  {
    x: -89.623161315918,
    y: -964.93267822266,
    code: "8164"
  },
  {
    x: -3.1412353515625,
    y: -999.86987304688,
    code: "8165"
  },
  {
    x: -20.306701660156,
    y: -1061.2722167969,
    code: "8166"
  },
  {
    x: -43.883117675781,
    y: -1123.4693603516,
    code: "8167"
  },
  {
    x: 24.226928710938,
    y: -1091.6182861328,
    code: "8168"
  },
  {
    x: 50.932918548584,
    y: -1026.1612548828,
    code: "8169"
  },
  {
    x: 131.72967529297,
    y: -1048.6171875,
    code: "8170"
  },
  {
    x: 109.76110839844,
    y: -1108.4281005859,
    code: "8171"
  },
  {
    x: 173.09448242188,
    y: -1106.0588378906,
    code: "8172"
  },
  {
    x: 175.8193359375,
    y: -1071.8271484375,
    code: "8173"
  },
  {
    x: 268.63513183594,
    y: -1071.8500976563,
    code: "8174"
  },
  {
    x: 265.79010009766,
    y: -1110.1579589844,
    code: "8175"
  },
  {
    x: 357.78820800781,
    y: -1110.9970703125,
    code: "8176"
  },
  {
    x: 356.53411865234,
    y: -1071.1478271484,
    code: "8177"
  },
  {
    x: 453.3203125,
    y: -1070.3530273438,
    code: "8178"
  },
  {
    x: 453.67822265625,
    y: -1111.8461914063,
    code: "8179"
  },
  {
    x: 746.54296875,
    y: -1136.5583496094,
    code: "8180"
  },
  {
    x: 749.26934814453,
    y: -1074.4306640625,
    code: "8181"
  },
  {
    x: 744.84594726563,
    y: -985.97827148438,
    code: "8182"
  },
  {
    x: 739.59899902344,
    y: -935.78637695313,
    code: "8183"
  },
  {
    x: 735.94299316406,
    y: -887.18041992188,
    code: "8184"
  },
  {
    x: 729.90185546875,
    y: -820.24847412109,
    code: "8185"
  },
  {
    x: 731.87231445313,
    y: -760.47180175781,
    code: "8186"
  },
  {
    x: 739.40161132813,
    y: -709.4892578125,
    code: "8187"
  },
  {
    x: 817.798828125,
    y: -746.24493408203,
    code: "8188"
  },
  {
    x: 813.44592285156,
    y: -788.44323730469,
    code: "8189"
  },
  {
    x: 813.77825927734,
    y: -821.92578125,
    code: "8190"
  },
  {
    x: 816.51934814453,
    y: -884.91625976563,
    code: "8191"
  },
  {
    x: 829.63092041016,
    y: -937.55480957031,
    code: "8192"
  },
  {
    x: 831.572265625,
    y: -986.21954345703,
    code: "8193"
  },
  {
    x: 841.68493652344,
    y: -1033.2755126953,
    code: "8194"
  },
  {
    x: 834.65478515625,
    y: -1109.8161621094,
    code: "8195"
  },
  {
    x: 904.37091064453,
    y: -1130.5729980469,
    code: "8196"
  },
  {
    x: 911.10461425781,
    y: -1051.8024902344,
    code: "8197"
  },
  {
    x: 926.62200927734,
    y: -969.60461425781,
    code: "8198"
  },
  {
    x: 918.21075439453,
    y: -897.119140625,
    code: "8199"
  },
  {
    x: -1406.5347900391,
    y: -1268.6197509766,
    code: "8200"
  },
  {
    x: -1362.576171875,
    y: -1344.2043457031,
    code: "8201"
  },
  {
    x: -1387.0986328125,
    y: -1421.5750732422,
    code: "8202"
  },
  {
    x: -1367.3278808594,
    y: -1516.0430908203,
    code: "8203"
  },
  {
    x: -1320.4248046875,
    y: -1607.5413818359,
    code: "8204"
  },
  {
    x: -1255.2265625,
    y: -1700.8128662109,
    code: "8205"
  },
  {
    x: -1198.8803710938,
    y: -1793.5231933594,
    code: "8206"
  },
  {
    x: -1084.0930175781,
    y: -1662.5076904297,
    code: "8207"
  },
  {
    x: -1110.9595947266,
    y: -1617.0979003906,
    code: "8208"
  },
  {
    x: -1156.7485351563,
    y: -1553.349609375,
    code: "8209"
  },
  {
    x: -1192.4637451172,
    y: -1499.6339111328,
    code: "8210"
  },
  {
    x: -1238.2485351563,
    y: -1430.5867919922,
    code: "8211"
  },
  {
    x: -1275.7347412109,
    y: -1366.8492431641,
    code: "8212"
  },
  {
    x: -1289.033203125,
    y: -1317.2657470703,
    code: "8213"
  },
  {
    x: -1312.3676757813,
    y: -1265.9447021484,
    code: "8214"
  },
  {
    x: -1322.7319335938,
    y: -1232.3039550781,
    code: "8215"
  },
  {
    x: -1253.39453125,
    y: -1208.1477050781,
    code: "8216"
  },
  {
    x: -1244.6705322266,
    y: -1239.3704833984,
    code: "8217"
  },
  {
    x: -1218.5848388672,
    y: -1304.3797607422,
    code: "8218"
  },
  {
    x: -1205.9111328125,
    y: -1337.4548339844,
    code: "8219"
  },
  {
    x: -1176.1430664063,
    y: -1392.3951416016,
    code: "8220"
  },
  {
    x: -1135.0238037109,
    y: -1453.1245117188,
    code: "8221"
  },
  {
    x: -1105.3430175781,
    y: -1501.0115966797,
    code: "8222"
  },
  {
    x: -1058.4248046875,
    y: -1572.4730224609,
    code: "8223"
  },
  {
    x: -1038.6776123047,
    y: -1604.9644775391,
    code: "8224"
  },
  {
    x: -964.03210449219,
    y: -1584.3395996094,
    code: "8225"
  },
  {
    x: -914.76403808594,
    y: -1520.599609375,
    code: "8226"
  },
  {
    x: -1004.2291870117,
    y: -1528.86328125,
    code: "8227"
  },
  {
    x: -1028.7485351563,
    y: -1495.8439941406,
    code: "8228"
  },
  {
    x: -944.04754638672,
    y: -1430.3278808594,
    code: "8229"
  },
  {
    x: -1042.3331298828,
    y: -1393.162109375,
    code: "8230"
  },
  {
    x: -1112.3000488281,
    y: -1360.1431884766,
    code: "8231"
  },
  {
    x: -983.37646484375,
    y: -1289.3161621094,
    code: "8232"
  },
  {
    x: -954.77386474609,
    y: -1328.3073730469,
    code: "8233"
  },
  {
    x: -885.44458007813,
    y: -1302.3771972656,
    code: "8234"
  },
  {
    x: -891.65002441406,
    y: -1248.0938720703,
    code: "8235"
  },
  {
    x: -811.63067626953,
    y: -1199.6518554688,
    code: "8236"
  },
  {
    x: -791.92803955078,
    y: -1242.7899169922,
    code: "8237"
  },
  {
    x: -802.2822265625,
    y: -1308.3205566406,
    code: "8238"
  },
  {
    x: -698.70843505859,
    y: -1307.7591552734,
    code: "8239"
  },
  {
    x: -714.98480224609,
    y: -1416.4106445313,
    code: "8240"
  },
  {
    x: -754.84582519531,
    y: -1469.5748291016,
    code: "8241"
  },
  {
    x: -742.16125488281,
    y: -1519.7728271484,
    code: "8242"
  },
  {
    x: -692.91424560547,
    y: -1492.0563964844,
    code: "8243"
  },
  {
    x: -686.75427246094,
    y: -1440.7452392578,
    code: "8244"
  },
  {
    x: -638.69464111328,
    y: -1235.3330078125,
    code: "8245"
  },
  {
    x: -676.18487548828,
    y: -1187.5369873047,
    code: "8246"
  },
  {
    x: -697.74755859375,
    y: -1155.0841064453,
    code: "8247"
  },
  {
    x: -717.52648925781,
    y: -1124.4047851563,
    code: "8248"
  },
  {
    x: -586.21545410156,
    y: -986.32403564453,
    code: "8249"
  },
  {
    x: -588.90850830078,
    y: -1026.4881591797,
    code: "8250"
  },
  {
    x: -606.36547851563,
    y: -1065.4576416016,
    code: "8251"
  },
  {
    x: -623.22509765625,
    y: -1110.3604736328,
    code: "8252"
  },
  {
    x: -612.92242431641,
    y: -1160.5725097656,
    code: "8253"
  },
  {
    x: -529.42797851563,
    y: -1234.3839111328,
    code: "8254"
  },
  {
    x: -554.15460205078,
    y: -1292.1862792969,
    code: "8255"
  },
  {
    x: -2262.1477050781,
    y: 297.61862182617,
    code: "6000"
  },
  {
    x: -1994.5190429688,
    y: 648.20050048828,
    code: "6001"
  },
  {
    x: -1887.9575195313,
    y: 641.11657714844,
    code: "6002"
  },
  {
    x: -2014.0268554688,
    y: 599.19030761719,
    code: "6003"
  },
  {
    x: -1912.8198242188,
    y: 590.29577636719,
    code: "6004"
  },
  {
    x: -2021.7159423828,
    y: 547.93298339844,
    code: "6005"
  },
  {
    x: -1927.6529541016,
    y: 532.35278320313,
    code: "6006"
  },
  {
    x: -2030.7054443359,
    y: 493.98202514648,
    code: "6007"
  },
  {
    x: -1943.0958251953,
    y: 472.10983276367,
    code: "6008"
  },
  {
    x: -2031.3487548828,
    y: 436.68328857422,
    code: "6009"
  },
  {
    x: -1928.3488769531,
    y: 418.35144042969,
    code: "6010"
  },
  {
    x: -2014.828125,
    y: 388.83602905273,
    code: "6011"
  },
  {
    x: -1919.5220947266,
    y: 366.36947631836,
    code: "6012"
  },
  {
    x: -2003.0770263672,
    y: 323.84991455078,
    code: "6013"
  },
  {
    x: -1908.953125,
    y: 298.46801757813,
    code: "6014"
  },
  {
    x: -1997.8389892578,
    y: 268.93615722656,
    code: "6015"
  },
  {
    x: -1893.6683349609,
    y: 249.42088317871,
    code: "6016"
  },
  {
    x: -1978.9973144531,
    y: 213.98333740234,
    code: "6017"
  },
  {
    x: -1952.7348632813,
    y: 159.64445495605,
    code: "6018"
  },
  {
    x: -1897.5489501953,
    y: 112.38739013672,
    code: "6019"
  },
  {
    x: -1869.5643310547,
    y: 207.38467407227,
    code: "6020"
  },
  {
    x: -1737.0852050781,
    y: 214.4333190918,
    code: "6021"
  },
  {
    x: -1700.2106933594,
    y: 159.50413513184,
    code: "6022"
  },
  {
    x: -1660.9986572266,
    y: 246.86109924316,
    code: "6023"
  },
  {
    x: -1625.8809814453,
    y: 186.05140686035,
    code: "6024"
  },
  {
    x: -1563.6281738281,
    y: 213.79307556152,
    code: "6025"
  },
  {
    x: -1849.6419677734,
    y: 304.65264892578,
    code: "6026"
  },
  {
    x: -1795.0516357422,
    y: 427.42770385742,
    code: "6027"
  },
  {
    x: -1794.806640625,
    y: 322.92083740234,
    code: "6028"
  },
  {
    x: -1737.2999267578,
    y: 355.95559692383,
    code: "6029"
  },
  {
    x: -1669.1251220703,
    y: 365.39450073242,
    code: "6030"
  },
  {
    x: -1569.6906738281,
    y: 403.12774658203,
    code: "6031"
  },
  {
    x: -1492.6707763672,
    y: 541.81518554688,
    code: "6032"
  },
  {
    x: -1481.1917724609,
    y: 427.87646484375,
    code: "6033"
  },
  {
    x: -1470.8723144531,
    y: 485.10702514648,
    code: "6034"
  },
  {
    x: -1389.7387695313,
    y: 578.95404052734,
    code: "6035"
  },
  {
    x: -1319.8041992188,
    y: 649.19311523438,
    code: "6036"
  },
  {
    x: -1313.0637207031,
    y: 597.20562744141,
    code: "6037"
  },
  {
    x: -1262.6334228516,
    y: 679.24865722656,
    code: "6038"
  },
  {
    x: -1251.7319335938,
    y: 618.4013671875,
    code: "6039"
  },
  {
    x: -1191.8388671875,
    y: 650.865234375,
    code: "6040"
  },
  {
    x: -1146.6955566406,
    y: 714.00988769531,
    code: "6041"
  },
  {
    x: -1123.3859863281,
    y: 807.26391601563,
    code: "6042"
  },
  {
    x: -1096.5444335938,
    y: 745.27099609375,
    code: "6043"
  },
  {
    x: -1007.7152099609,
    y: 762.95837402344,
    code: "6044"
  },
  {
    x: -910.65142822266,
    y: 761.17913818359,
    code: "6045"
  },
  {
    x: -846.13549804688,
    y: 771.1787109375,
    code: "6046"
  },
  {
    x: -786.77917480469,
    y: 790.03894042969,
    code: "6047"
  },
  {
    x: -663.72924804688,
    y: 783.50695800781,
    code: "6048"
  },
  {
    x: -613.87359619141,
    y: 829.54168701172,
    code: "6049"
  },
  {
    x: -556.94104003906,
    y: 807.65979003906,
    code: "6050"
  },
  {
    x: -604.46942138672,
    y: 765.74035644531,
    code: "6051"
  },
  {
    x: -657.92224121094,
    y: 717.29736328125,
    code: "6052"
  },
  {
    x: -577.37915039063,
    y: 705.44445800781,
    code: "6053"
  },
  {
    x: -535.78741455078,
    y: 740.81671142578,
    code: "6054"
  },
  {
    x: -514.25689697266,
    y: 780.93884277344,
    code: "6055"
  },
  {
    x: -485.08337402344,
    y: 686.45562744141,
    code: "6056"
  },
  {
    x: -464.73760986328,
    y: 633.91528320313,
    code: "6057"
  },
  {
    x: -350.533203125,
    y: 687.02502441406,
    code: "6058"
  },
  {
    x: -401.02182006836,
    y: 642.13891601563,
    code: "6059"
  },
  {
    x: -291.67199707031,
    y: 648.49810791016,
    code: "6060"
  },
  {
    x: -341.48052978516,
    y: 601.91802978516,
    code: "6061"
  },
  {
    x: -239.08898925781,
    y: 624.33056640625,
    code: "6062"
  },
  {
    x: -277.17504882813,
    y: 579.43884277344,
    code: "6063"
  },
  {
    x: -168.29577636719,
    y: 625.44171142578,
    code: "6064"
  },
  {
    x: -204.01466369629,
    y: 572.865234375,
    code: "6065"
  },
  {
    x: -123.47906494141,
    y: 574.03063964844,
    code: "6066"
  },
  {
    x: -96.05509185791,
    y: 814.24304199219,
    code: "6067"
  },
  {
    x: -166.05004882813,
    y: 880.9013671875,
    code: "6068"
  },
  {
    x: -203.5856628418,
    y: 980.06671142578,
    code: "6069"
  },
  {
    x: -80.529174804688,
    y: 1000.1196289063,
    code: "6070"
  },
  {
    x: -44.25,
    y: 922.18334960938,
    code: "6071"
  },
  {
    x: 153.15551757813,
    y: 735.05572509766,
    code: "6072"
  },
  {
    x: 243.75549316406,
    y: 761.61242675781,
    code: "6073"
  },
  {
    x: 375.67501831055,
    y: 793.47485351563,
    code: "6074"
  },
  {
    x: 677.57409667969,
    y: 638.79724121094,
    code: "6075"
  },
  {
    x: 808.29443359375,
    y: 554.34033203125,
    code: "6076"
  },
  {
    x: 656.84167480469,
    y: 492.91119384766,
    code: "6077"
  },
  {
    x: 360.77349853516,
    y: 414.39306640625,
    code: "6078"
  },
  {
    x: 308.50833129883,
    y: 453.89862060547,
    code: "6079"
  },
  {
    x: 295.21667480469,
    y: 504.61383056641,
    code: "6080"
  },
  {
    x: 249.45138549805,
    y: 658.66259765625,
    code: "6081"
  },
  {
    x: 239.11804199219,
    y: 589.58752441406,
    code: "6082"
  },
  {
    x: 175.05268859863,
    y: 555.31396484375,
    code: "6083"
  },
  {
    x: 95.065246582031,
    y: 548.21667480469,
    code: "6084"
  },
  {
    x: 31.002807617188,
    y: 528.72082519531,
    code: "6085"
  },
  {
    x: 39.556945800781,
    y: 488.56109619141,
    code: "6086"
  },
  {
    x: 101.82203674316,
    y: 501.5361328125,
    code: "6087"
  },
  {
    x: 170.56524658203,
    y: 513.30560302734,
    code: "6088"
  },
  {
    x: 198.58605957031,
    y: 465.48751831055,
    code: "6089"
  },
  {
    x: 130.96112060547,
    y: 448.33193969727,
    code: "6090"
  },
  {
    x: 62.770755767822,
    y: 434.7236328125,
    code: "6091"
  },
  {
    x: -1.2972412109375,
    y: 447.09588623047,
    code: "6092"
  },
  {
    x: -66.628433227539,
    y: 468.28079223633,
    code: "6093"
  },
  {
    x: -119.97309112549,
    y: 482.46658325195,
    code: "6094"
  },
  {
    x: -175.78332519531,
    y: 485.40130615234,
    code: "6095"
  },
  {
    x: -232.74758911133,
    y: 470.56115722656,
    code: "6096"
  },
  {
    x: -291.53466796875,
    y: 474.73196411133,
    code: "6097"
  },
  {
    x: -369.76379394531,
    y: 455.81115722656,
    code: "6098"
  },
  {
    x: -331.13897705078,
    y: 511.28619384766,
    code: "6099"
  },
  {
    x: -402.87100219727,
    y: 492.36114501953,
    code: "6100"
  },
  {
    x: -360.69793701172,
    y: 541.34301757813,
    code: "6101"
  },
  {
    x: -439.50415039063,
    y: 518.86938476563,
    code: "6102"
  },
  {
    x: -410.33340454102,
    y: 567.25268554688,
    code: "6103"
  },
  {
    x: -492.69583129883,
    y: 531.83337402344,
    code: "6104"
  },
  {
    x: -459.35787963867,
    y: 578.43200683594,
    code: "6105"
  },
  {
    x: -528.75988769531,
    y: 594.927734375,
    code: "6106"
  },
  {
    x: -558.10064697266,
    y: 628.72186279297,
    code: "6107"
  },
  {
    x: -601.43756103516,
    y: 648.56945800781,
    code: "6108"
  },
  {
    x: -648.38018798828,
    y: 667.43884277344,
    code: "6109"
  },
  {
    x: -718.94104003906,
    y: 695.73327636719,
    code: "6110"
  },
  {
    x: -654.31750488281,
    y: 630.17919921875,
    code: "6111"
  },
  {
    x: -664.091796875,
    y: 580.56677246094,
    code: "6112"
  },
  {
    x: -713.98077392578,
    y: 631.90423583984,
    code: "6113"
  },
  {
    x: -717.83959960938,
    y: 572.28198242188,
    code: "6114"
  },
  {
    x: -766.55902099609,
    y: 589.95812988281,
    code: "6115"
  },
  {
    x: -775.70361328125,
    y: 620.64440917969,
    code: "6116"
  },
  {
    x: -789.62451171875,
    y: 648.34301757813,
    code: "6117"
  },
  {
    x: -806.47595214844,
    y: 677.22369384766,
    code: "6118"
  },
  {
    x: -862.28363037109,
    y: 677.79028320313,
    code: "6119"
  },
  {
    x: -918.67370605469,
    y: 673.61810302734,
    code: "6120"
  },
  {
    x: -974.53161621094,
    y: 672.35675048828,
    code: "6121"
  },
  {
    x: -1026.2021484375,
    y: 675.30151367188,
    code: "6122"
  },
  {
    x: -1065.5067138672,
    y: 708.35546875,
    code: "6123"
  },
  {
    x: -1338.2426757813,
    y: 541.27087402344,
    code: "6124"
  },
  {
    x: -1388.7254638672,
    y: 508.19418334961,
    code: "6125"
  },
  {
    x: -1410.8890380859,
    y: 438.9221496582,
    code: "6126"
  },
  {
    x: -1343.9058837891,
    y: 476.67770385742,
    code: "6127"
  },
  {
    x: -1351.9217529297,
    y: 434.14993286133,
    code: "6128"
  },
  {
    x: -1230.0601806641,
    y: 443.54446411133,
    code: "6129"
  },
  {
    x: -1284.1134033203,
    y: 488.95129394531,
    code: "6130"
  },
  {
    x: -1212.4343261719,
    y: 494.26245117188,
    code: "6131"
  },
  {
    x: -1212.158203125,
    y: 563.90283203125,
    code: "6132"
  },
  {
    x: -1140.2407226563,
    y: 527.28747558594,
    code: "6133"
  },
  {
    x: -1158.8768310547,
    y: 573.85028076172,
    code: "6134"
  },
  {
    x: -1115.4670410156,
    y: 595.69030761719,
    code: "6135"
  },
  {
    x: -1085.6940917969,
    y: 547.24731445313,
    code: "6136"
  },
  {
    x: -1037.5952148438,
    y: 565.49865722656,
    code: "6137"
  },
  {
    x: -954.66888427734,
    y: 609.72082519531,
    code: "6138"
  },
  {
    x: -972.70709228516,
    y: 558.93609619141,
    code: "6139"
  },
  {
    x: -895.13220214844,
    y: 582.51110839844,
    code: "6140"
  },
  {
    x: -922.60095214844,
    y: 537.04864501953,
    code: "6141"
  },
  {
    x: -854.97277832031,
    y: 554.59283447266,
    code: "6142"
  },
  {
    x: -892.58575439453,
    y: 498.03335571289,
    code: "6143"
  },
  {
    x: -831.50915527344,
    y: 513.93762207031,
    code: "6144"
  },
  {
    x: -884.38293457031,
    y: 452.51110839844,
    code: "6145"
  },
  {
    x: -823.89910888672,
    y: 466.66662597656,
    code: "6146"
  },
  {
    x: -814.16357421875,
    y: 409.9831237793,
    code: "6147"
  },
  {
    x: -773.17822265625,
    y: 481.37347412109,
    code: "6148"
  },
  {
    x: -756.38006591797,
    y: 412.8776550293,
    code: "6149"
  },
  {
    x: -724.23278808594,
    y: 499.6208190918,
    code: "6150"
  },
  {
    x: -712.74206542969,
    y: 441.16241455078,
    code: "6151"
  },
  {
    x: -671.13714599609,
    y: 517.88616943359,
    code: "6152"
  },
  {
    x: -659.64196777344,
    y: 466.4958190918,
    code: "6153"
  },
  {
    x: -607.41296386719,
    y: 531.97094726563,
    code: "6154"
  },
  {
    x: -598.89373779297,
    y: 476.46380615234,
    code: "6155"
  },
  {
    x: -558.46899414063,
    y: 553.77642822266,
    code: "6156"
  },
  {
    x: -521.02032470703,
    y: 494.13180541992,
    code: "6157"
  },
  {
    x: -510.1328125,
    y: 452.78060913086,
    code: "6158"
  },
  {
    x: -590.72540283203,
    y: 387.22906494141,
    code: "6159"
  },
  {
    x: -498.37484741211,
    y: 374.80413818359,
    code: "6160"
  },
  {
    x: -477.44799804688,
    y: 418.48046875,
    code: "6161"
  },
  {
    x: -422.26184082031,
    y: 419.63055419922,
    code: "6162"
  },
  {
    x: -437.25512695313,
    y: 367.65478515625,
    code: "6163"
  },
  {
    x: -462.48934936523,
    y: 328.10137939453,
    code: "6164"
  },
  {
    x: -393.73489379883,
    y: 328.10000610352,
    code: "6165"
  },
  {
    x: -369.84939575195,
    y: 390.66912841797,
    code: "6166"
  },
  {
    x: -323.51623535156,
    y: 347.55966186523,
    code: "6167"
  },
  {
    x: -316.17437744141,
    y: 405.98754882813,
    code: "6168"
  },
  {
    x: -266.91488647461,
    y: 369.94305419922,
    code: "6169"
  },
  {
    x: -207.63012695313,
    y: 388.1985168457,
    code: "6170"
  },
  {
    x: -157.18350219727,
    y: 410.58056640625,
    code: "6171"
  },
  {
    x: -84.303298950195,
    y: 439.47348022461,
    code: "6172"
  },
  {
    x: -86.418128967285,
    y: 357.40148925781,
    code: "6173"
  },
  {
    x: -6.4694213867188,
    y: 404.0319519043,
    code: "6174"
  },
  {
    x: -42.2138671875,
    y: 334.93740844727,
    code: "6175"
  },
  {
    x: 49.536071777344,
    y: 376.21939086914,
    code: "6176"
  },
  {
    x: 12.605529785156,
    y: 310.67916870117,
    code: "6177"
  },
  {
    x: -149.43428039551,
    y: 291.76098632813,
    code: "6178"
  },
  {
    x: -217.6293182373,
    y: 297.13497924805,
    code: "6179"
  },
  {
    x: -269.89212036133,
    y: 289.37637329102,
    code: "6180"
  },
  {
    x: -359.32946777344,
    y: 272.82220458984,
    code: "6181"
  },
  {
    x: -425.75863647461,
    y: 271.02914428711,
    code: "6182"
  },
  {
    x: -494.56964111328,
    y: 286.93753051758,
    code: "6183"
  },
  {
    x: -568.09265136719,
    y: 335.89297485352,
    code: "6184"
  },
  {
    x: -571.34918212891,
    y: 290.98889160156,
    code: "6185"
  },
  {
    x: -634.80773925781,
    y: 294.49157714844,
    code: "6186"
  },
  {
    x: -698.30737304688,
    y: 314.51943969727,
    code: "6187"
  },
  {
    x: -781.28607177734,
    y: 319.22219848633,
    code: "6188"
  },
  {
    x: -756.80535888672,
    y: 260.7624206543,
    code: "6189"
  },
  {
    x: -830.34216308594,
    y: 254.25691223145,
    code: "6190"
  },
  {
    x: -882.001953125,
    y: 285.53472900391,
    code: "6191"
  },
  {
    x: -873.49456787109,
    y: 340.39581298828,
    code: "6192"
  },
  {
    x: -945.36529541016,
    y: 389.28802490234,
    code: "6193"
  },
  {
    x: -933.15216064453,
    y: 473.7096862793,
    code: "6194"
  },
  {
    x: -980.72039794922,
    y: 433.56103515625,
    code: "6195"
  },
  {
    x: -951.53369140625,
    y: 509.10546875,
    code: "6196"
  },
  {
    x: -997.88922119141,
    y: 468.37091064453,
    code: "6197"
  },
  {
    x: -1015.9061889648,
    y: 521.47497558594,
    code: "6198"
  },
  {
    x: -1069.9627685547,
    y: 478.95004272461,
    code: "6199"
  },
  {
    x: -1041.3735351563,
    y: 419.33206176758,
    code: "6200"
  },
  {
    x: -1041.6975097656,
    y: 368.53604125977,
    code: "6201"
  },
  {
    x: -962.31048583984,
    y: 326,
    code: "6202"
  },
  {
    x: -1037.6130371094,
    y: 308.8818359375,
    code: "6203"
  },
  {
    x: -1112.3223876953,
    y: 419.82232666016,
    code: "6204"
  },
  {
    x: -1133.8972167969,
    y: 487.09161376953,
    code: "6205"
  },
  {
    x: -1164.3012695313,
    y: 446.32086181641,
    code: "6206"
  },
  {
    x: -617.99291992188,
    y: -1779.3375244141,
    code: "9000"
  },
  {
    x: -557.49957275391,
    y: -1797.0583496094,
    code: "9001"
  },
  {
    x: -512.93701171875,
    y: -1739.8428955078,
    code: "9002"
  },
  {
    x: -455.40063476563,
    y: -1752.8360595703,
    code: "9003"
  },
  {
    x: -442.17102050781,
    y: -1722.7446289063,
    code: "9004"
  },
  {
    x: -425.97006225586,
    y: -1691.4652099609,
    code: "9005"
  },
  {
    x: -325.95092773438,
    y: -1964.2082519531,
    code: "9006"
  },
  {
    x: -82.513252258301,
    y: -2016.1943359375,
    code: "9007"
  },
  {
    x: -111.77169799805,
    y: -2131.8942871094,
    code: "9008"
  },
  {
    x: -401.33639526367,
    y: -2141.3444824219,
    code: "9009"
  },
  {
    x: -581.68414306641,
    y: -2153.1555175781,
    code: "9010"
  },
  {
    x: -508.21328735352,
    y: -2211.6374511719,
    code: "9011"
  },
  {
    x: -432.40249633789,
    y: -2189.2194824219,
    code: "9012"
  },
  {
    x: -354.24099731445,
    y: -2189.8400878906,
    code: "9013"
  },
  {
    x: -284.30514526367,
    y: -2220.5444335938,
    code: "9014"
  },
  {
    x: -223.84916687012,
    y: -2240.029296875,
    code: "9015"
  },
  {
    x: -110.22423553467,
    y: -2227.6540527344,
    code: "9016"
  },
  {
    x: -13.152498245239,
    y: -2228.2902832031,
    code: "9017"
  },
  {
    x: -79.018424987793,
    y: -2191.7026367188,
    code: "9018"
  },
  {
    x: -10.2855052948,
    y: -2171.6804199219,
    code: "9019"
  },
  {
    x: 125.16636657715,
    y: -2105.5888671875,
    code: "9020"
  },
  {
    x: 125.44242095947,
    y: -2155.1833496094,
    code: "9021"
  },
  {
    x: 189.44230651855,
    y: -2152.2485351563,
    code: "9022"
  },
  {
    x: 134.2064666748,
    y: -2217.1804199219,
    code: "9023"
  },
  {
    x: 135.67269897461,
    y: -2261.470703125,
    code: "9024"
  },
  {
    x: 219.17179870605,
    y: -2221.9514160156,
    code: "9025"
  },
  {
    x: 299.72015380859,
    y: -2211.375,
    code: "9026"
  },
  {
    x: 267.52749633789,
    y: -2170.0803222656,
    code: "9027"
  },
  {
    x: -366.77319335938,
    y: -1601.0847167969,
    code: "9028"
  },
  {
    x: -351.75268554688,
    y: -1568.6346435547,
    code: "9029"
  },
  {
    x: -329.61773681641,
    y: -1542.0874023438,
    code: "9030"
  },
  {
    x: -317.55230712891,
    y: -1515.5374755859,
    code: "9031"
  },
  {
    x: -314.94671630859,
    y: -1491.3485107422,
    code: "9032"
  },
  {
    x: -314.65774536133,
    y: -1465.9680175781,
    code: "9033"
  },
  {
    x: -314.99819946289,
    y: -1401.6596679688,
    code: "9034"
  },
  {
    x: -318.24963378906,
    y: -1349.7554931641,
    code: "9035"
  },
  {
    x: -315.59759521484,
    y: -1301.3970947266,
    code: "9036"
  },
  {
    x: -222.04414367676,
    y: -1279.5596923828,
    code: "9037"
  },
  {
    x: -221.16809082031,
    y: -1332.1346435547,
    code: "9038"
  },
  {
    x: -225.03984069824,
    y: -1369.3374023438,
    code: "9039"
  },
  {
    x: -223.5772857666,
    y: -1394.7319335938,
    code: "9040"
  },
  {
    x: -143.6206817627,
    y: -1279.6457519531,
    code: "9041"
  },
  {
    x: -144.53955078125,
    y: -1332.1846923828,
    code: "9042"
  },
  {
    x: -58.668151855469,
    y: -1296.7834472656,
    code: "9043"
  },
  {
    x: -54.275856018066,
    y: -1341.6610107422,
    code: "9044"
  },
  {
    x: 2.6582078933716,
    y: -1293.2971191406,
    code: "9045"
  },
  {
    x: 25.372587203979,
    y: -1341.7027587891,
    code: "9046"
  },
  {
    x: 118.90602874756,
    y: -1300.4305419922,
    code: "9047"
  },
  {
    x: 139.26152038574,
    y: -1345.3110351563,
    code: "9048"
  },
  {
    x: 169.05590820313,
    y: -1313.4749755859,
    code: "9049"
  },
  {
    x: 182.32823181152,
    y: -1281.0345458984,
    code: "9050"
  },
  {
    x: 269.36267089844,
    y: -1264.5220947266,
    code: "9051"
  },
  {
    x: 328.66967773438,
    y: -1277.5358886719,
    code: "9052"
  },
  {
    x: 400.36538696289,
    y: -1320.0499267578,
    code: "9053"
  },
  {
    x: 467.93350219727,
    y: -1294.66796875,
    code: "9054"
  },
  {
    x: 461.69897460938,
    y: -1327.1652832031,
    code: "9055"
  },
  {
    x: 437.15036010742,
    y: -1358.4846191406,
    code: "9056"
  },
  {
    x: 456.33099365234,
    y: -1382.1110839844,
    code: "9057"
  },
  {
    x: 497.3212890625,
    y: -1406.9416503906,
    code: "9058"
  },
  {
    x: 497.59185791016,
    y: -1353.8249511719,
    code: "9059"
  },
  {
    x: 486.0364074707,
    y: -1468.3637695313,
    code: "9060"
  },
  {
    x: 561.10925292969,
    y: -1605.8107910156,
    code: "9061"
  },
  {
    x: 532.02807617188,
    y: -1641.95703125,
    code: "9062"
  },
  {
    x: 454.37530517578,
    y: -1575.2985839844,
    code: "9063"
  },
  {
    x: 475.89196777344,
    y: -1511.5500488281,
    code: "9064"
  },
  {
    x: 401.17672729492,
    y: -1529.8985595703,
    code: "9065"
  },
  {
    x: 363.94625854492,
    y: -1456.7110595703,
    code: "9066"
  },
  {
    x: 397.12634277344,
    y: -1431.9426269531,
    code: "9067"
  },
  {
    x: 330.79077148438,
    y: -1417.8332519531,
    code: "9068"
  },
  {
    x: 352.29205322266,
    y: -1384.2041015625,
    code: "9069"
  },
  {
    x: 264.00042724609,
    y: -1344.7014160156,
    code: "9070"
  },
  {
    x: 237.13723754883,
    y: -1387.8402099609,
    code: "9071"
  },
  {
    x: 93.363952636719,
    y: -1409.0999755859,
    code: "9072"
  },
  {
    x: 57.044925689697,
    y: -1454.5513916016,
    code: "9073"
  },
  {
    x: 20.694875717163,
    y: -1403.2456054688,
    code: "9074"
  },
  {
    x: 10.90746307373,
    y: -1437.4860839844,
    code: "9075"
  },
  {
    x: -40.752319335938,
    y: -1401.4930419922,
    code: "9076"
  },
  {
    x: -52.313407897949,
    y: -1441.0485839844,
    code: "9077"
  },
  {
    x: -113.44661712646,
    y: -1419.9624023438,
    code: "9078"
  },
  {
    x: -116.69929504395,
    y: -1468.9930419922,
    code: "9079"
  },
  {
    x: -155.96124267578,
    y: -1441.2569580078,
    code: "9080"
  },
  {
    x: -231.85336303711,
    y: -1510.3624267578,
    code: "9081"
  },
  {
    x: -170.21907043457,
    y: -1542.2749023438,
    code: "9082"
  },
  {
    x: -200.65257263184,
    y: -1574.7651367188,
    code: "9083"
  },
  {
    x: -214.57510375977,
    y: -1620.2512207031,
    code: "9084"
  },
  {
    x: -215.48867797852,
    y: -1674.0151367188,
    code: "9085"
  },
  {
    x: -187.46504211426,
    y: -1731.8972167969,
    code: "9086"
  },
  {
    x: -118.73623657227,
    y: -1580.1986083984,
    code: "9087"
  },
  {
    x: -147.97245788574,
    y: -1617.9775390625,
    code: "9088"
  },
  {
    x: -82.77734375,
    y: -1615.6389160156,
    code: "9089"
  },
  {
    x: -107.89018249512,
    y: -1649.8861083984,
    code: "9090"
  },
  {
    x: -130.62887573242,
    y: -1685.9069824219,
    code: "9091"
  },
  {
    x: -16.434553146362,
    y: -1670.6027832031,
    code: "9092"
  },
  {
    x: -102.92967224121,
    y: -1804.6430664063,
    code: "9093"
  },
  {
    x: -52.484455108643,
    y: -1760.3791503906,
    code: "9094"
  },
  {
    x: -38.371166229248,
    y: -1865.0164794922,
    code: "9095"
  },
  {
    x: -27.483112335205,
    y: -1783.0012207031,
    code: "9096"
  },
  {
    x: -17.173496246338,
    y: -1886.9387207031,
    code: "9097"
  },
  {
    x: 3.1609797477722,
    y: -1805.4915771484,
    code: "9098"
  },
  {
    x: 9.3448152542114,
    y: -1910.5693359375,
    code: "9099"
  },
  {
    x: 27.890850067139,
    y: -1832.0930175781,
    code: "9100"
  },
  {
    x: 47.030918121338,
    y: -1930.6762695313,
    code: "9101"
  },
  {
    x: 59.687953948975,
    y: -1859.2763671875,
    code: "9102"
  },
  {
    x: 85.914276123047,
    y: -1978.5360107422,
    code: "9103"
  },
  {
    x: 108.62252044678,
    y: -2008.6540527344,
    code: "9104"
  },
  {
    x: 139.58644104004,
    y: -1971.5124511719,
    code: "9105"
  },
  {
    x: 154.00888061523,
    y: -1946.7583007813,
    code: "9106"
  },
  {
    x: 137.76422119141,
    y: -1922.5985107422,
    code: "9107"
  },
  {
    x: 109.70868682861,
    y: -1900.1694335938,
    code: "9108"
  },
  {
    x: 86.381195068359,
    y: -1822.8734130859,
    code: "9109"
  },
  {
    x: 20.531059265137,
    y: -1737.8999023438,
    code: "9110"
  },
  {
    x: 125.27146148682,
    y: -1781.5804443359,
    code: "9111"
  },
  {
    x: 160.95896911621,
    y: -1860.1069335938,
    code: "9112"
  },
  {
    x: 205.51319885254,
    y: -1877.2679443359,
    code: "9113"
  },
  {
    x: 188.67405700684,
    y: -1832.4387207031,
    code: "9114"
  },
  {
    x: 270.400390625,
    y: -1812.3804931641,
    code: "9115"
  },
  {
    x: 296.07427978516,
    y: -1784.06640625,
    code: "9116"
  },
  {
    x: 321.7243347168,
    y: -1755.7664794922,
    code: "9117"
  },
  {
    x: 287.75616455078,
    y: -1728.6472167969,
    code: "9118"
  },
  {
    x: 254.39649963379,
    y: -1755.8026123047,
    code: "9119"
  },
  {
    x: 232.21168518066,
    y: -1778.2803955078,
    code: "9120"
  },
  {
    x: 179.36712646484,
    y: -1731.6680908203,
    code: "9121"
  },
  {
    x: 213.28810119629,
    y: -1700.4151611328,
    code: "9122"
  },
  {
    x: 236.56298828125,
    y: -1672.70703125,
    code: "9123"
  },
  {
    x: 194.93222045898,
    y: -1640.8748779297,
    code: "9124"
  },
  {
    x: 150.92175292969,
    y: -1654.4763183594,
    code: "9125"
  },
  {
    x: 115.18550872803,
    y: -1679.8818359375,
    code: "9126"
  },
  {
    x: 139.05323791504,
    y: -1704.1013183594,
    code: "9127"
  },
  {
    x: 177.12002563477,
    y: -1681.1290283203,
    code: "9128"
  },
  {
    x: 124.26740264893,
    y: -1600.2818603516,
    code: "9129"
  },
  {
    x: 92.077140808105,
    y: -1578.4597167969,
    code: "9130"
  },
  {
    x: 69.900650024414,
    y: -1556.0500488281,
    code: "9131"
  },
  {
    x: 43.629463195801,
    y: -1594.4680175781,
    code: "9132"
  },
  {
    x: -32.327224731445,
    y: -1556.0760498047,
    code: "9133"
  },
  {
    x: -62.70182800293,
    y: -1518.9624023438,
    code: "9134"
  },
  {
    x: -23.499725341797,
    y: -1489.4859619141,
    code: "9135"
  },
  {
    x: 12.798816680908,
    y: -1521.9652099609,
    code: "9136"
  },
  {
    x: 112.20829772949,
    y: -1510.1943359375,
    code: "9137"
  },
  {
    x: 141.41571044922,
    y: -1531.4499511719,
    code: "9138"
  },
  {
    x: 172.38650512695,
    y: -1560.9638671875,
    code: "9139"
  },
  {
    x: 213.37115478516,
    y: -1538.5693359375,
    code: "9140"
  },
  {
    x: 181.76721191406,
    y: -1504.3637695313,
    code: "9141"
  },
  {
    x: 153.11860656738,
    y: -1473.7055664063,
    code: "9142"
  },
  {
    x: 181.72525024414,
    y: -1446.0069580078,
    code: "9143"
  },
  {
    x: 222.1319732666,
    y: -1474.9735107422,
    code: "9144"
  },
  {
    x: 257.80902099609,
    y: -1508.0555419922,
    code: "9145"
  },
  {
    x: 302.36294555664,
    y: -1466.7805175781,
    code: "9146"
  },
  {
    x: 327.43359375,
    y: -1572.4595947266,
    code: "9147"
  },
  {
    x: 376.68545532227,
    y: -1613.8193359375,
    code: "9148"
  },
  {
    x: 264.19937133789,
    y: -1599.6833496094,
    code: "9149"
  },
  {
    x: 296.95776367188,
    y: -1631.5750732422,
    code: "9150"
  },
  {
    x: 336.20071411133,
    y: -1661.7042236328,
    code: "9151"
  },
  {
    x: 371.90850830078,
    y: -1688.9027099609,
    code: "9152"
  },
  {
    x: 408.19897460938,
    y: -1652.3526611328,
    code: "9153"
  },
  {
    x: 482.81744384766,
    y: -1695.4899902344,
    code: "9154"
  },
  {
    x: 444.13436889648,
    y: -1715.5695800781,
    code: "9155"
  },
  {
    x: 415.75253295898,
    y: -1750.6276855469,
    code: "9156"
  },
  {
    x: 381.80648803711,
    y: -1806.7263183594,
    code: "9157"
  },
  {
    x: 359.66192626953,
    y: -1832.7221679688,
    code: "9158"
  },
  {
    x: 337.51217651367,
    y: -1857.5415039063,
    code: "9159"
  },
  {
    x: 283.48712158203,
    y: -1913.0360107422,
    code: "9160"
  },
  {
    x: 257.18014526367,
    y: -1937.8416748047,
    code: "9161"
  },
  {
    x: 239.14413452148,
    y: -1966.7734375,
    code: "9162"
  },
  {
    x: 216.37110900879,
    y: -1992.1818847656,
    code: "9163"
  },
  {
    x: 196.4766998291,
    y: -2023.4451904297,
    code: "9164"
  },
  {
    x: 234.02917480469,
    y: -2044.75,
    code: "9165"
  },
  {
    x: 251.40965270996,
    y: -2019.3680419922,
    code: "9166"
  },
  {
    x: 277.07366943359,
    y: -1992.8375244141,
    code: "9167"
  },
  {
    x: 296.23071289063,
    y: -1963.3359375,
    code: "9168"
  },
  {
    x: 311.83898925781,
    y: -1937.9681396484,
    code: "9169"
  },
  {
    x: 362.85647583008,
    y: -1890.7777099609,
    code: "9170"
  },
  {
    x: 393.24688720703,
    y: -1865.4180908203,
    code: "9171"
  },
  {
    x: 421.23541259766,
    y: -1838.8874511719,
    code: "9172"
  },
  {
    x: 463.40255737305,
    y: -1775.1500244141,
    code: "9173"
  },
  {
    x: 464.87399291992,
    y: -1739.7834472656,
    code: "9174"
  },
  {
    x: 571.39288330078,
    y: -1684.9041748047,
    code: "9175"
  },
  {
    x: 543.89892578125,
    y: -1736.8942871094,
    code: "9176"
  },
  {
    x: 541.19067382813,
    y: -1762.2819824219,
    code: "9177"
  },
  {
    x: 542.03228759766,
    y: -1794.7651367188,
    code: "9178"
  },
  {
    x: 526.35394287109,
    y: -1823.7244873047,
    code: "9179"
  },
  {
    x: 530.18414306641,
    y: -1853.2639160156,
    code: "9180"
  },
  {
    x: 466.10235595703,
    y: -1886.9458007813,
    code: "9181"
  },
  {
    x: 432.15661621094,
    y: -1916.4638671875,
    code: "9182"
  },
  {
    x: 352.16525268555,
    y: -1992.0555419922,
    code: "9183"
  },
  {
    x: 296.36557006836,
    y: -2062.3430175781,
    code: "9184"
  },
  {
    x: 329.69763183594,
    y: -2095.4055175781,
    code: "9185"
  },
  {
    x: 431.13494873047,
    y: -2068.9138183594,
    code: "9186"
  },
  {
    x: 476.84338378906,
    y: -1957.9775390625,
    code: "9187"
  },
  {
    x: 524.31469726563,
    y: -1937.3402099609,
    code: "9188"
  },
  {
    x: 568.86346435547,
    y: -1911.3776855469,
    code: "9189"
  },
  {
    x: 601.60778808594,
    y: -1886.6081542969,
    code: "9190"
  },
  {
    x: 600.12127685547,
    y: -1936.2330322266,
    code: "9191"
  },
  {
    x: 569.69812011719,
    y: -1959.2707519531,
    code: "9192"
  },
  {
    x: 470.78228759766,
    y: -1987.6180419922,
    code: "9193"
  },
  {
    x: 548.95880126953,
    y: -1988.240234375,
    code: "9194"
  },
  {
    x: 509.10345458984,
    y: -2015.9930419922,
    code: "9195"
  },
  {
    x: 433.83679199219,
    y: -2069.7150878906,
    code: "9196"
  },
  {
    x: 384.50933837891,
    y: -2129.9582519531,
    code: "9197"
  },
  {
    x: 404.27166748047,
    y: -2222.0832519531,
    code: "9198"
  },
  {
    x: 470.06311035156,
    y: -2186.6831054688,
    code: "9199"
  },
  {
    x: 488.64047241211,
    y: -2285.2763671875,
    code: "9200"
  },
  {
    x: 550.28009033203,
    y: -2390.9594726563,
    code: "9201"
  },
  {
    x: 551.72241210938,
    y: -2349.0900878906,
    code: "9202"
  },
  {
    x: 553.7626953125,
    y: -2314.2734375,
    code: "9203"
  },
  {
    x: 551.09069824219,
    y: -2248.7790527344,
    code: "9204"
  },
  {
    x: 552.52258300781,
    y: -2219.2861328125,
    code: "9205"
  },
  {
    x: 560.46600341797,
    y: -2189.7861328125,
    code: "9206"
  },
  {
    x: 558.97125244141,
    y: -2160.2861328125,
    code: "9207"
  },
  {
    x: 559.83239746094,
    y: -2131.3762207031,
    code: "9208"
  },
  {
    x: 557.73120117188,
    y: -2103.06640625,
    code: "9209"
  },
  {
    x: 675.45660400391,
    y: -2450.7734375,
    code: "9210"
  },
  {
    x: 681.64501953125,
    y: -2418.3347167969,
    code: "9211"
  },
  {
    x: 686.61383056641,
    y: -2390.6101074219,
    code: "9212"
  },
  {
    x: 687.48236083984,
    y: -2362.31640625,
    code: "9213"
  },
  {
    x: 690.10327148438,
    y: -2331.0654296875,
    code: "9214"
  },
  {
    x: 698.06634521484,
    y: -2294.5026855469,
    code: "9215"
  },
  {
    x: 698.34210205078,
    y: -2269.16796875,
    code: "9216"
  },
  {
    x: 699.18249511719,
    y: -2238.5056152344,
    code: "9217"
  },
  {
    x: 703.57458496094,
    y: -2207.85546875,
    code: "9218"
  },
  {
    x: 703.25238037109,
    y: -2178.9763183594,
    code: "9219"
  },
  {
    x: 704.72296142578,
    y: -2150.6665039063,
    code: "9220"
  },
  {
    x: 706.17254638672,
    y: -2125.3178710938,
    code: "9221"
  },
  {
    x: 709.99371337891,
    y: -2094.5502929688,
    code: "9222"
  },
  {
    x: 717.91540527344,
    y: -2035.6749267578,
    code: "9223"
  },
  {
    x: 724.09515380859,
    y: -2005.595703125,
    code: "9224"
  },
  {
    x: 726.11364746094,
    y: -1980.8083496094,
    code: "9225"
  },
  {
    x: 731.1142578125,
    y: -1946.6137695313,
    code: "9226"
  },
  {
    x: 733.75372314453,
    y: -1918.3166503906,
    code: "9227"
  },
  {
    x: 742.89678955078,
    y: -1889.4262695313,
    code: "9228"
  },
  {
    x: 751.99627685547,
    y: -1860.5263671875,
    code: "9229"
  },
  {
    x: 757.55535888672,
    y: -1835.16796875,
    code: "9230"
  },
  {
    x: 766.69635009766,
    y: -1808.6374511719,
    code: "9231"
  },
  {
    x: 766.94219970703,
    y: -1780.9069824219,
    code: "9232"
  },
  {
    x: 779.58880615234,
    y: -1710.7069091797,
    code: "9233"
  },
  {
    x: 782.20367431641,
    y: -1682.4166259766,
    code: "9234"
  },
  {
    x: 793.11779785156,
    y: -1654.1166992188,
    code: "9235"
  },
  {
    x: 794.57348632813,
    y: -1621.0943603516,
    code: "9236"
  },
  {
    x: 800.15460205078,
    y: -1594.5374755859,
    code: "9237"
  },
  {
    x: 769.15734863281,
    y: -1517.2236328125,
    code: "9238"
  },
  {
    x: 757.63647460938,
    y: -1492.4582519531,
    code: "9239"
  },
  {
    x: 750.80926513672,
    y: -1464.7569580078,
    code: "9240"
  },
  {
    x: 759.35656738281,
    y: -1407.5430908203,
    code: "9241"
  },
  {
    x: 760.82312011719,
    y: -1376.2651367188,
    code: "9242"
  },
  {
    x: 756.37023925781,
    y: -1330.2581787109,
    code: "9243"
  },
  {
    x: 758.41387939453,
    y: -1304.3277587891,
    code: "9244"
  },
  {
    x: 760.4638671875,
    y: -1271.2944335938,
    code: "9245"
  },
  {
    x: 841.01965332031,
    y: -1301.9943847656,
    code: "9246"
  },
  {
    x: 900.31994628906,
    y: -1251.2360839844,
    code: "9247"
  },
  {
    x: 962.57122802734,
    y: -1268.3680419922,
    code: "9248"
  },
  {
    x: 916.81060791016,
    y: -1304.9971923828,
    code: "9249"
  },
  {
    x: 905.87719726563,
    y: -1339.2360839844,
    code: "9250"
  },
  {
    x: 869.23614501953,
    y: -1366.6544189453,
    code: "9251"
  },
  {
    x: 846.77093505859,
    y: -1394.1931152344,
    code: "9252"
  },
  {
    x: 930.86163330078,
    y: -1485.1027832031,
    code: "9253"
  },
  {
    x: 901.62854003906,
    y: -1528.8305664063,
    code: "9254"
  },
  {
    x: 932.58679199219,
    y: -1561.9053955078,
    code: "9255"
  },
  {
    x: 898.01599121094,
    y: -1591.4638671875,
    code: "9256"
  },
  {
    x: 913.63989257813,
    y: -1631.0485839844,
    code: "9257"
  },
  {
    x: 908.58026123047,
    y: -1680.0430908203,
    code: "9258"
  },
  {
    x: 908.25177001953,
    y: -1726.0915527344,
    code: "9259"
  },
  {
    x: 914.44543457031,
    y: -1796.9332275391,
    code: "9260"
  },
  {
    x: 875.14385986328,
    y: -1819.970703125,
    code: "9261"
  },
  {
    x: 913.17010498047,
    y: -1844.7916259766,
    code: "9262"
  },
  {
    x: 870.888671875,
    y: -1868.0417480469,
    code: "9263"
  },
  {
    x: 911.90606689453,
    y: -1888.6846923828,
    code: "9264"
  },
  {
    x: 856.70599365234,
    y: -1910.9805908203,
    code: "9265"
  },
  {
    x: 910.48345947266,
    y: -1934.7833251953,
    code: "9266"
  },
  {
    x: 849.00329589844,
    y: -1950.0068359375,
    code: "9267"
  },
  {
    x: 903.59759521484,
    y: -1964.8068847656,
    code: "9268"
  },
  {
    x: 842.453125,
    y: -1985.509765625,
    code: "9269"
  },
  {
    x: 900.58935546875,
    y: -2003.2583007813,
    code: "9270"
  },
  {
    x: 842.40466308594,
    y: -2021.5987548828,
    code: "9271"
  },
  {
    x: 896.99774169922,
    y: -2044.6206054688,
    code: "9272"
  },
  {
    x: 829.95080566406,
    y: -2106.62890625,
    code: "9273"
  },
  {
    x: 890.45043945313,
    y: -2134.9833984375,
    code: "9274"
  },
  {
    x: 827.58190917969,
    y: -2155.8142089844,
    code: "9275"
  },
  {
    x: 884.50866699219,
    y: -2178.1303710938,
    code: "9276"
  },
  {
    x: 825.17401123047,
    y: -2192.6745605469,
    code: "9277"
  },
  {
    x: 880.33807373047,
    y: -2221.8735351563,
    code: "9278"
  },
  {
    x: 817.43304443359,
    y: -2269.1223144531,
    code: "9279"
  },
  {
    x: 878.49090576172,
    y: -2281.5456542969,
    code: "9280"
  },
  {
    x: 809.67956542969,
    y: -2294.5361328125,
    code: "9281"
  },
  {
    x: 874.87359619141,
    y: -2310.4873046875,
    code: "9282"
  },
  {
    x: 813.75372314453,
    y: -2327.0275878906,
    code: "9283"
  },
  {
    x: 863.62548828125,
    y: -2348.8903808594,
    code: "9284"
  },
  {
    x: 805.45458984375,
    y: -2355.9831542969,
    code: "9285"
  },
  {
    x: 860.04772949219,
    y: -2377.25,
    code: "9286"
  },
  {
    x: 806.87121582031,
    y: -2393.8037109375,
    code: "9287"
  },
  {
    x: 801.77374267578,
    y: -2427.5217285156,
    code: "9288"
  },
  {
    x: 950.17541503906,
    y: -2436.9929199219,
    code: "9289"
  },
  {
    x: 994.12274169922,
    y: -2416.9306640625,
    code: "9290"
  },
  {
    x: 961.46490478516,
    y: -2391.5678710938,
    code: "9291"
  },
  {
    x: 1003.6517944336,
    y: -2362.6762695313,
    code: "9292"
  },
  {
    x: 964.39349365234,
    y: -2337.3178710938,
    code: "9293"
  },
  {
    x: 1010.0933837891,
    y: -2314.3291015625,
    code: "9294"
  },
  {
    x: 964.29998779297,
    y: -2289.5583496094,
    code: "9295"
  },
  {
    x: 1013.585144043,
    y: -2265.3984375,
    code: "9296"
  },
  {
    x: 964.84912109375,
    y: -2245.3303222656,
    code: "9297"
  },
  {
    x: 1012.9049682617,
    y: -2221.7387695313,
    code: "9298"
  },
  {
    x: 979.58270263672,
    y: -2181.4865722656,
    code: "9299"
  },
  {
    x: 1020.4531860352,
    y: -2158.0944824219,
    code: "9300"
  },
  {
    x: 979.57885742188,
    y: -2133.8581542969,
    code: "9301"
  },
  {
    x: 1023.3827514648,
    y: -2115.6013183594,
    code: "9302"
  },
  {
    x: 985.86437988281,
    y: -2051.3095703125,
    code: "9303"
  },
  {
    x: 1059.4138183594,
    y: -2050.6486816406,
    code: "9304"
  },
  {
    x: 1133.3771972656,
    y: -2048.4389648438,
    code: "9305"
  },
  {
    x: 1099.4060058594,
    y: -2003.5888671875,
    code: "9306"
  },
  {
    x: 992.85186767578,
    y: -2015.4055175781,
    code: "9307"
  },
  {
    x: 1004.9475708008,
    y: -1976.4914550781,
    code: "9308"
  },
  {
    x: 1080.1566162109,
    y: -1966.4652099609,
    code: "9309"
  },
  {
    x: 1001.9356689453,
    y: -1938.7569580078,
    code: "9310"
  },
  {
    x: 1068.3026123047,
    y: -1934.0775146484,
    code: "9311"
  },
  {
    x: 1003.0715942383,
    y: -1870.3498535156,
    code: "9312"
  },
  {
    x: 1054.6960449219,
    y: -1853.2316894531,
    code: "9313"
  },
  {
    x: 998.73413085938,
    y: -1835.5299072266,
    code: "9314"
  },
  {
    x: 1054.0369873047,
    y: -1817.8415527344,
    code: "9315"
  },
  {
    x: 996.44519042969,
    y: -1804.2734375,
    code: "9316"
  },
  {
    x: 1002.0046386719,
    y: -1738.1887207031,
    code: "9317"
  },
  {
    x: 1007.0152587891,
    y: -1692.7485351563,
    code: "9318"
  },
  {
    x: 1009.063659668,
    y: -1639.0346679688,
    code: "9319"
  },
  {
    x: 1007.5717163086,
    y: -1587.1055908203,
    code: "9320"
  },
  {
    x: 1007.8425292969,
    y: -1538.1569824219,
    code: "9321"
  },
  {
    x: 1009.8638305664,
    y: -1490.3873291016,
    code: "9322"
  },
  {
    x: 991.84326171875,
    y: -1392.4138183594,
    code: "9323"
  },
  {
    x: 1206.3765869141,
    y: -1256.6513671875,
    code: "9324"
  },
  {
    x: 1151.7459716797,
    y: -1287.9846191406,
    code: "9325"
  },
  {
    x: 1204.5270996094,
    y: -1311.0207519531,
    code: "9326"
  },
  {
    x: 1149.8963623047,
    y: -1334.0708007813,
    code: "9327"
  },
  {
    x: 1200.9064941406,
    y: -1357.1208496094,
    code: "9328"
  },
  {
    x: 1147.4772949219,
    y: -1384.3026123047,
    code: "9329"
  },
  {
    x: 1196.14453125,
    y: -1406.1903076172,
    code: "9330"
  },
  {
    x: 1140.3162841797,
    y: -1481.7553710938,
    code: "9331"
  },
  {
    x: 1221.4600830078,
    y: -1483.5708007813,
    code: "9332"
  },
  {
    x: 1153.2701416016,
    y: -1523.1486816406,
    code: "9333"
  },
  {
    x: 1230.2770996094,
    y: -1527.8721923828,
    code: "9334"
  },
  {
    x: 1164.4307861328,
    y: -1565.0875244141,
    code: "9335"
  },
  {
    x: 1237.6911621094,
    y: -1575.8647460938,
    code: "9336"
  },
  {
    x: 1162.5869140625,
    y: -1613.5277099609,
    code: "9337"
  },
  {
    x: 1262.0091552734,
    y: -1637.7512207031,
    code: "9338"
  },
  {
    x: 1227.4664306641,
    y: -1736.3762207031,
    code: "9339"
  },
  {
    x: 1288.5411376953,
    y: -1704.5250244141,
    code: "9340"
  },
  {
    x: 1351.3620605469,
    y: -1743.5083007813,
    code: "9341"
  },
  {
    x: 1282.580078125,
    y: -1772.4735107422,
    code: "9342"
  },
  {
    x: 1215.5510253906,
    y: -1794.3403320313,
    code: "9343"
  },
  {
    x: 1228.8289794922,
    y: -1861.0512695313,
    code: "9344"
  },
  {
    x: 1301.6967773438,
    y: -1830.4056396484,
    code: "9345"
  },
  {
    x: 1385.7624511719,
    y: -1801.5263671875,
    code: "9346"
  },
  {
    x: 1390.1739501953,
    y: -1865.3000488281,
    code: "9347"
  },
  {
    x: 1313.1165771484,
    y: -1870.0721435547,
    code: "9348"
  },
  {
    x: 1263.2192382813,
    y: -1922.0444335938,
    code: "9349"
  },
  {
    x: 1360.8887939453,
    y: -1945.6610107422,
    code: "9350"
  },
  {
    x: 1290.3082275391,
    y: -2001.7761230469,
    code: "9351"
  },
  {
    x: 1127.673828125,
    y: -2132.865234375,
    code: "9352"
  },
  {
    x: 1107.8725585938,
    y: -2171.2678222656,
    code: "9353"
  },
  {
    x: 1138.2448730469,
    y: -2210.8486328125,
    code: "9354"
  },
  {
    x: 1098.9436035156,
    y: -2242.7248535156,
    code: "9355"
  },
  {
    x: 1143.4632568359,
    y: -2276.9858398438,
    code: "9356"
  },
  {
    x: 1103.0340576172,
    y: -2302.9584960938,
    code: "9357"
  },
  {
    x: 1147.5634765625,
    y: -2335.4653320313,
    code: "9358"
  },
  {
    x: 1090.5855712891,
    y: -2360.8818359375,
    code: "9359"
  },
  {
    x: 1087.3000488281,
    y: -2401.6291503906,
    code: "9360"
  },
  {
    x: 1175.5441894531,
    y: -2396.927734375,
    code: "9361"
  },
  {
    x: 1205.8970947266,
    y: -2355.6303710938,
    code: "9362"
  },
  {
    x: 1227.3927001953,
    y: -2301.9345703125,
    code: "9363"
  },
  {
    x: 1199.8991699219,
    y: -2245.8735351563,
    code: "9364"
  },
  {
    x: 1180.0726318359,
    y: -2176.2470703125,
    code: "9365"
  },
  {
    x: 1306.0710449219,
    y: -2080.625,
    code: "9366"
  },
  {
    x: 1348.8416748047,
    y: -2168.0109863281,
    code: "9367"
  },
  {
    x: 1380.3765869141,
    y: -2258.9526367188,
    code: "9368"
  },
  {
    x: 1390.6770019531,
    y: -2358.1665039063,
    code: "9369"
  },
  {
    x: 1366.7409667969,
    y: -2466.8110351563,
    code: "9370"
  },
  {
    x: 1296.7493896484,
    y: -2558.3432617188,
    code: "9371"
  },
  {
    x: 1413.8663330078,
    y: -2606.1623535156,
    code: "9372"
  },
  {
    x: 1594.7663574219,
    y: -2508.2138671875,
    code: "9373"
  },
  {
    x: 1583.8277587891,
    y: -2363.6318359375,
    code: "9374"
  },
  {
    x: 1603.5710449219,
    y: -2279.240234375,
    code: "9375"
  },
  {
    x: 1614.4672851563,
    y: -2189.5275878906,
    code: "9376"
  },
  {
    x: 1540.9575195313,
    y: -2138.7861328125,
    code: "9377"
  },
  {
    x: 1599.6800537109,
    y: -2038.4526367188,
    code: "9378"
  },
  {
    x: 1484.8383789063,
    y: -1946.4165039063,
    code: "9379"
  },
  {
    x: 1661.1246337891,
    y: -1895.2449951172,
    code: "9380"
  },
  {
    x: 1486.3830566406,
    y: -1781.7891845703,
    code: "9381"
  },
  {
    x: 1592.4521484375,
    y: -1723.3624267578,
    code: "9382"
  },
  {
    x: 1699.5831298828,
    y: -1697.4276123047,
    code: "9383"
  },
  {
    x: 1725.2248535156,
    y: -1630.7484130859,
    code: "9384"
  },
  {
    x: 1454.5555419922,
    y: -1683.2845458984,
    code: "9385"
  },
  {
    x: 1714.5651855469,
    y: -1546.9458007813,
    code: "9386"
  },
  {
    x: 1733.7318115234,
    y: -1469.6234130859,
    code: "9387"
  },
  {
    x: 1584.0625,
    y: -1536.9415283203,
    code: "9388"
  },
  {
    x: 1781.4957275391,
    y: -1350.4221191406,
    code: "9389"
  },
  {
    x: 1938.7570800781,
    y: -1018.7138671875,
    code: "9390"
  },
  {
    x: -1021.8845825195,
    y: -1994.0374755859,
    code: "10000"
  },
  {
    x: -946.05133056641,
    y: -2059.5708007813,
    code: "10001"
  },
  {
    x: -846.64013671875,
    y: -2153.4541015625,
    code: "10002"
  },
  {
    x: -720.03704833984,
    y: -2267.4235839844,
    code: "10003"
  },
  {
    x: -567.19012451172,
    y: -2297.6831054688,
    code: "10005"
  },
  {
    x: -643.64276123047,
    y: -2397.4567871094,
    code: "10006"
  },
  {
    x: -710.05786132813,
    y: -2500.2082519531,
    code: "10007"
  },
  {
    x: -788.90386962891,
    y: -2397.5417480469,
    code: "10008"
  },
  {
    x: -778.62176513672,
    y: -2611.2302246094,
    code: "10009"
  },
  {
    x: -848.00964355469,
    y: -2760,
    code: "10010"
  },
  {
    x: -873.72888183594,
    y: -2863.2985839844,
    code: "10011"
  },
  {
    x: -949.60260009766,
    y: -3003.7858886719,
    code: "10012"
  },
  {
    x: -1184.2764892578,
    y: -3463.6401367188,
    code: "10013"
  },
  {
    x: -1284.3541259766,
    y: -3403.44140625,
    code: "10014"
  },
  {
    x: -1358.4816894531,
    y: -3354.45703125,
    code: "10015"
  },
  {
    x: -1407.7902832031,
    y: -3296.6528320313,
    code: "10016"
  },
  {
    x: -1471.8472900391,
    y: -3266.0051269531,
    code: "10017"
  },
  {
    x: -1573.0844726563,
    y: -3227.0913085938,
    code: "10018"
  },
  {
    x: -1573.0844726563,
    y: -3227.0913085938,
    code: "10019"
  },
  {
    x: -1930.2440185547,
    y: -3038.2138671875,
    code: "10020"
  },
  {
    x: -1804.8181152344,
    y: -2797.4165039063,
    code: "10021"
  },
  {
    x: -1332.3444824219,
    y: -2632.7375488281,
    code: "10022"
  },
  {
    x: -1237.0220947266,
    y: -2800.9790039063,
    code: "10023"
  },
  {
    x: -1070.2985839844,
    y: -2798.6389160156,
    code: "10024"
  },
  {
    x: -941.36663818359,
    y: -2652.2802734375,
    code: "10025"
  },
  {
    x: -1019.6137084961,
    y: -2617.4733886719,
    code: "10026"
  },
  {
    x: -1037.0651855469,
    y: -2457.5346679688,
    code: "10027"
  },
  {
    x: -1207.3972167969,
    y: -2458.1403808594,
    code: "10028"
  },
  {
    x: -1280.8916015625,
    y: -2363.7055664063,
    code: "10029"
  },
  {
    x: -1156.0582275391,
    y: -2324.7915039063,
    code: "10030"
  },
  {
    x: -1142.8206787109,
    y: -2122.3347167969,
    code: "10031"
  },
  {
    x: -1141.9665527344,
    y: -2022.0026855469,
    code: "10032"
  },
  {
    x: -1057.8874511719,
    y: -2146.0083007813,
    code: "10033"
  },
  {
    x: -1086.5305175781,
    y: -2231.6403808594,
    code: "10034"
  },
  {
    x: -984.72900390625,
    y: -2211.5805664063,
    code: "10035"
  },
  {
    x: -1057.0612792969,
    y: -2364.4816894531,
    code: "10036"
  },
  {
    x: -964.13317871094,
    y: -2296.6179199219,
    code: "10037"
  },
  {
    x: -903.05792236328,
    y: -2382.240234375,
    code: "10038"
  },
  {
    x: -917.56365966797,
    y: -2530.4096679688,
    code: "10039"
  },
  {
    x: -474.59829711914,
    y: -2845.0678710938,
    code: "10040"
  },
  {
    x: -504.41088867188,
    y: -2782.5302734375,
    code: "10041"
  },
  {
    x: -424.00668334961,
    y: -2731.7861328125,
    code: "10042"
  },
  {
    x: -459.76351928711,
    y: -2650.931640625,
    code: "10043"
  },
  {
    x: -352.66604614258,
    y: -2647.4084472656,
    code: "10044"
  },
  {
    x: -297.56530761719,
    y: -2684.6904296875,
    code: "10045"
  },
  {
    x: -209.89566040039,
    y: -2661.62890625,
    code: "10046"
  },
  {
    x: -236.75959777832,
    y: -2585.5043945313,
    code: "10047"
  },
  {
    x: -244.77053833008,
    y: -2511.7653808594,
    code: "10048"
  },
  {
    x: -301.76354980469,
    y: -2463.3969726563,
    code: "10049"
  },
  {
    x: -169.87484741211,
    y: -2423.2609863281,
    code: "10050"
  },
  {
    x: -145.40510559082,
    y: -2464.0290527344,
    code: "10051"
  },
  {
    x: -74.323204040527,
    y: -2423.9111328125,
    code: "10052"
  },
  {
    x: -114.78554534912,
    y: -2489.470703125,
    code: "10053"
  },
  {
    x: -12.978828430176,
    y: -2471.2014160156,
    code: "10054"
  },
  {
    x: 54.585052490234,
    y: -2498.4028320313,
    code: "10055"
  },
  {
    x: 56.023921966553,
    y: -2579.3178710938,
    code: "10056"
  },
  {
    x: -133.77590942383,
    y: -2585.8427734375,
    code: "10057"
  },
  {
    x: -124.0620880127,
    y: -2680.87890625,
    code: "10058"
  },
  {
    x: -47.660713195801,
    y: -2703.9208984375,
    code: "10059"
  },
  {
    x: 60.614250183105,
    y: -2704.5400390625,
    code: "10060"
  },
  {
    x: 151.79632568359,
    y: -2609.5153808594,
    code: "10061"
  },
  {
    x: 218.74485778809,
    y: -2508.0222167969,
    code: "10062"
  },
  {
    x: 216.63217163086,
    y: -2449.0222167969,
    code: "10063"
  },
  {
    x: 232.24067687988,
    y: -2581.2719726563,
    code: "10064"
  },
  {
    x: 319.8544921875,
    y: -2603.1403808594,
    code: "10065"
  },
  {
    x: 343.10870361328,
    y: -2727.7387695313,
    code: "10066"
  },
  {
    x: 342.80514526367,
    y: -2806.2565917969,
    code: "10067"
  },
  {
    x: 222.08653259277,
    y: -2809.841796875,
    code: "10068"
  },
  {
    x: 139.70875549316,
    y: -2845.6511230469,
    code: "10069"
  },
  {
    x: 140.58364868164,
    y: -2956.08203125,
    code: "10070"
  },
  {
    x: 142.61405944824,
    y: -3027.5231933594,
    code: "10071"
  },
  {
    x: 136.99057006836,
    y: -3082.4460449219,
    code: "10072"
  },
  {
    x: 134.88229370117,
    y: -3140.8874511719,
    code: "10073"
  },
  {
    x: 134.55319213867,
    y: -3196.9763183594,
    code: "10074"
  },
  {
    x: 137.20489501953,
    y: -3256.5334472656,
    code: "10075"
  },
  {
    x: 136.90292358398,
    y: -3309.1843261719,
    code: "10076"
  },
  {
    x: 231.04737854004,
    y: -3296.2138671875,
    code: "10077"
  },
  {
    x: 231.29327392578,
    y: -3237.2219238281,
    code: "10078"
  },
  {
    x: 233.31416320801,
    y: -3179.9929199219,
    code: "10079"
  },
  {
    x: 220.00987243652,
    y: -3124.4958496094,
    code: "10080"
  },
  {
    x: 253.93916320801,
    y: -3047.2236328125,
    code: "10081"
  },
  {
    x: 240.0265045166,
    y: -2994.1252441406,
    code: "10082"
  },
  {
    x: 253.2794342041,
    y: -2944.5668945313,
    code: "10083"
  },
  {
    x: 501.31994628906,
    y: -2587.4873046875,
    code: "10085"
  },
  {
    x: 501.59371948242,
    y: -2646.5278320313,
    code: "10086"
  },
  {
    x: 621.66955566406,
    y: -2626.48046875,
    code: "10087"
  },
  {
    x: 657.95031738281,
    y: -2702.6457519531,
    code: "10088"
  },
  {
    x: 557.25573730469,
    y: -2723.8996582031,
    code: "10089"
  },
  {
    x: 480.21716308594,
    y: -2771.1220703125,
    code: "10090"
  },
  {
    x: 548.96545410156,
    y: -2798.8928222656,
    code: "10091"
  },
  {
    x: 620.66687011719,
    y: -2840.8093261719,
    code: "10092"
  },
  {
    x: 486.93087768555,
    y: -2918.7470703125,
    code: "10093"
  },
  {
    x: 477.15866088867,
    y: -2961.25,
    code: "10094"
  },
  {
    x: 581.92266845703,
    y: -2960.0693359375,
    code: "10095"
  },
  {
    x: 475.35305786133,
    y: -3007.3217773438,
    code: "10096"
  },
  {
    x: 581.89324951172,
    y: -3002.6276855469,
    code: "10097"
  },
  {
    x: 473.53244018555,
    y: -3084.1081542969,
    code: "10098"
  },
  {
    x: 564.69610595703,
    y: -3063.4899902344,
    code: "10099"
  },
  {
    x: 549.59582519531,
    y: -3117.8054199219,
    code: "10100"
  },
  {
    x: 548.07312011719,
    y: -3252.4333496094,
    code: "10101"
  },
  {
    x: 761.43371582031,
    y: -3197.5541992188,
    code: "10102"
  },
  {
    x: 780.36627197266,
    y: -3267.2524414063,
    code: "10103"
  },
  {
    x: 858.76013183594,
    y: -3309.2094726563,
    code: "10104"
  },
  {
    x: 983.59204101563,
    y: -3308.0690917969,
    code: "10105"
  },
  {
    x: 1113.1137695313,
    y: -3305.1486816406,
    code: "10106"
  },
  {
    x: 1216.6917724609,
    y: -3325.2189941406,
    code: "10107"
  },
  {
    x: 1218.1235351563,
    y: -3249.6943359375,
    code: "10108"
  },
  {
    x: 1114.5041503906,
    y: -3259.1442871094,
    code: "10109"
  },
  {
    x: 983.85168457031,
    y: -3255.2136230469,
    code: "10110"
  },
  {
    x: 894.91137695313,
    y: -3256.23046875,
    code: "10111"
  },
  {
    x: 845.85693359375,
    y: -3202.8271484375,
    code: "10112"
  },
  {
    x: 937.34619140625,
    y: -3203.740234375,
    code: "10113"
  },
  {
    x: 1026.1749267578,
    y: -3202.5693359375,
    code: "10114"
  },
  {
    x: 1127.9708251953,
    y: -3201.4191894531,
    code: "10115"
  },
  {
    x: 1218.5554199219,
    y: -3197.3176269531,
    code: "10116"
  },
  {
    x: 1218.8428955078,
    y: -3125.3359375,
    code: "10117"
  },
  {
    x: 1130.5513916016,
    y: -3150.1416015625,
    code: "10118"
  },
  {
    x: 1029.3150634766,
    y: -3148.3669433594,
    code: "10119"
  },
  {
    x: 935.14862060547,
    y: -3147.8098144531,
    code: "10120"
  },
  {
    x: 845.08093261719,
    y: -3150.8015136719,
    code: "10121"
  },
  {
    x: 846.52368164063,
    y: -3091.5949707031,
    code: "10122"
  },
  {
    x: 937.10565185547,
    y: -3094.2111816406,
    code: "10123"
  },
  {
    x: 1029.4763183594,
    y: -3095.4301757813,
    code: "10124"
  },
  {
    x: 1127.7114257813,
    y: -3093.1330566406,
    code: "10125"
  },
  {
    x: 1141.5694580078,
    y: -3041.7458496094,
    code: "10126"
  },
  {
    x: 1032.0513916016,
    y: -3041.75,
    code: "10127"
  },
  {
    x: 936.71813964844,
    y: -3043.4118652344,
    code: "10128"
  },
  {
    x: 847.27087402344,
    y: -3042.9594726563,
    code: "10129"
  },
  {
    x: 796.18920898438,
    y: -2985.1528320313,
    code: "10130"
  },
  {
    x: 936.33923339844,
    y: -2988.7416992188,
    code: "10131"
  },
  {
    x: 1031.6276855469,
    y: -2989.3403320313,
    code: "10132"
  },
  {
    x: 1140.5041503906,
    y: -2988.7595214844,
    code: "10133"
  },
  {
    x: 1249.4041748047,
    y: -2968.1401367188,
    code: "10134"
  },
  {
    x: 1141.6721191406,
    y: -2930.9624023438,
    code: "10135"
  },
  {
    x: 1032.1513671875,
    y: -2929.2290039063,
    code: "10136"
  },
  {
    x: 936.22802734375,
    y: -2931.6108398438,
    code: "10137"
  },
  {
    x: 833.19458007813,
    y: -2920.4348144531,
    code: "10138"
  },
  {
    x: 867.67919921875,
    y: -2876.1791992188,
    code: "10139"
  },
  {
    x: 1049.1584472656,
    y: -2876.1999511719,
    code: "10140"
  },
  {
    x: 1644.1221923828,
    y: 6456.0561523438,
    code: "1000"
  },
  {
    x: 1538.3503417969,
    y: 6344.6381835938,
    code: "1001"
  },
  {
    x: 1579.3702392578,
    y: 6591.4409179688,
    code: "1002"
  },
  {
    x: 1409.5551757813,
    y: 6563.380859375,
    code: "1003"
  },
  {
    x: 525.22381591797,
    y: 6591.1264648438,
    code: "1004"
  },
  {
    x: 664.33813476563,
    y: 6472.9379882813,
    code: "1005"
  },
  {
    x: 529.42224121094,
    y: 6483.48828125,
    code: "1006"
  },
  {
    x: 529.42248535156,
    y: 6483.48828125,
    code: "1007"
  },
  {
    x: 264.91348266602,
    y: 6651.58203125,
    code: "1008"
  },
  {
    x: 350.6750793457,
    y: 6493.5786132813,
    code: "1009"
  },
  {
    x: 268.71212768555,
    y: 6608.3237304688,
    code: "1010"
  },
  {
    x: 251.9838104248,
    y: 6486.3271484375,
    code: "1011"
  },
  {
    x: 162.81225585938,
    y: 6609.9672851563,
    code: "1012"
  },
  {
    x: 159.21286010742,
    y: 6470.6127929688,
    code: "1013"
  },
  {
    x: 94.202827453613,
    y: 6532.0102539063,
    code: "1014"
  },
  {
    x: 123.64725494385,
    y: 6432.8974609375,
    code: "1015"
  },
  {
    x: 58.179302215576,
    y: 6489.2016601563,
    code: "1016"
  },
  {
    x: 94.797012329102,
    y: 6396.873046875,
    code: "1017"
  },
  {
    x: 17.470808029175,
    y: 6448.9428710938,
    code: "1018"
  },
  {
    x: 51.979454040527,
    y: 6359.1142578125,
    code: "1019"
  },
  {
    x: -23.21159362793,
    y: 6411.6162109375,
    code: "1020"
  },
  {
    x: 7.8913064002991,
    y: 6316.7319335938,
    code: "1021"
  },
  {
    x: -64.347145080566,
    y: 6370.0634765625,
    code: "1022"
  },
  {
    x: -39.561515808105,
    y: 6268.4052734375,
    code: "1023"
  },
  {
    x: -99.09156036377,
    y: 6333.6215820313,
    code: "1024"
  },
  {
    x: -82.781867980957,
    y: 6226.4506835938,
    code: "1025"
  },
  {
    x: -148.220703125,
    y: 6284.8950195313,
    code: "1026"
  },
  {
    x: -133.62596130371,
    y: 6179.8168945313,
    code: "1027"
  },
  {
    x: -190.1768951416,
    y: 6245.0219726563,
    code: "1028"
  },
  {
    x: -174.72891235352,
    y: 6134.8852539063,
    code: "1029"
  },
  {
    x: -230.4298248291,
    y: 6202.61328125,
    code: "1030"
  },
  {
    x: -217.51998901367,
    y: 6094.6030273438,
    code: "1031"
  },
  {
    x: -279.58258056641,
    y: 6155.5864257813,
    code: "1032"
  },
  {
    x: -267.09341430664,
    y: 6047.9760742188,
    code: "1033"
  },
  {
    x: -330.22689819336,
    y: 6108.1186523438,
    code: "1034"
  },
  {
    x: -307.57904052734,
    y: 6003.4912109375,
    code: "1035"
  },
  {
    x: -378.52648925781,
    y: 6057.66015625,
    code: "1036"
  },
  {
    x: -352.06726074219,
    y: 5955.1591796875,
    code: "1037"
  },
  {
    x: -469.18984985352,
    y: 6007.6665039063,
    code: "1038"
  },
  {
    x: -469.39916992188,
    y: 6099.9770507813,
    code: "1039"
  },
  {
    x: -392.09533691406,
    y: 6090.6328125,
    code: "1040"
  },
  {
    x: -433.38018798828,
    y: 6151.5864257813,
    code: "1041"
  },
  {
    x: -346.1640625,
    y: 6137.7934570313,
    code: "1042"
  },
  {
    x: -374.97473144531,
    y: 6208.701171875,
    code: "1043"
  },
  {
    x: -305.74212646484,
    y: 6179.0537109375,
    code: "1044"
  },
  {
    x: -310.18420410156,
    y: 6285.7768554688,
    code: "1045"
  },
  {
    x: -254.49468994141,
    y: 6231.5395507813,
    code: "1046"
  },
  {
    x: -275.02786254883,
    y: 6317.8974609375,
    code: "1047"
  },
  {
    x: -210.02728271484,
    y: 6272.1098632813,
    code: "1048"
  },
  {
    x: -242.01275634766,
    y: 6353.8388671875,
    code: "1049"
  },
  {
    x: -175.75666809082,
    y: 6312.71875,
    code: "1050"
  },
  {
    x: -196.32781982422,
    y: 6388.9331054688,
    code: "1051"
  },
  {
    x: -123.28033447266,
    y: 6359.677734375,
    code: "1052"
  },
  {
    x: -167.09519958496,
    y: 6425.7084960938,
    code: "1053"
  },
  {
    x: -85.186561584473,
    y: 6396.4775390625,
    code: "1054"
  },
  {
    x: -119.70399475098,
    y: 6479.458984375,
    code: "1055"
  },
  {
    x: -42.021728515625,
    y: 6441.3334960938,
    code: "1056"
  },
  {
    x: -76.130386352539,
    y: 6520.498046875,
    code: "1057"
  },
  {
    x: -4.3509998321533,
    y: 6476.8276367188,
    code: "1058"
  },
  {
    x: -37.633438110352,
    y: 6558.9624023438,
    code: "1059"
  },
  {
    x: 34.14892578125,
    y: 6519.5629882813,
    code: "1060"
  },
  {
    x: 12.325073242188,
    y: 6597.4770507813,
    code: "1061"
  },
  {
    x: 74.358093261719,
    y: 6555.9448242188,
    code: "1062"
  },
  {
    x: 86.009437561035,
    y: 6652.0385742188,
    code: "1063"
  },
  {
    x: 10.838283538818,
    y: 6674.4462890625,
    code: "1064"
  },
  {
    x: -58.855964660645,
    y: 6644.7534179688,
    code: "1065"
  },
  {
    x: -112.46115112305,
    y: 6602.3979492188,
    code: "1066"
  },
  {
    x: -165.63864135742,
    y: 6555.3393554688,
    code: "1067"
  },
  {
    x: -270.03433227539,
    y: 6632.380859375,
    code: "1068"
  },
  {
    x: -201.63911437988,
    y: 6511.2241210938,
    code: "1069"
  },
  {
    x: -234.45983886719,
    y: 6465.0366210938,
    code: "1070"
  },
  {
    x: -273.66256713867,
    y: 6420.53125,
    code: "1071"
  },
  {
    x: -334.03851318359,
    y: 6390.0073242188,
    code: "1072"
  },
  {
    x: -386.79467773438,
    y: 6351.9189453125,
    code: "1073"
  },
  {
    x: -429.35076904297,
    y: 6311.615234375,
    code: "1074"
  },
  {
    x: -451.35699462891,
    y: 6268.455078125,
    code: "1075"
  },
  {
    x: -452.24588012695,
    y: 6208.68359375,
    code: "1076"
  },
  {
    x: -625.66784667969,
    y: 6126.9111328125,
    code: "1077"
  },
  {
    x: -568.72412109375,
    y: 5962.5751953125,
    code: "1078"
  },
  {
    x: -663.3935546875,
    y: 5785.9438476563,
    code: "1079"
  },
  {
    x: -745.76141357422,
    y: 5593.6225585938,
    code: "1080"
  },
  {
    x: -549.91040039063,
    y: 5539.8134765625,
    code: "1081"
  },
  {
    x: -521.32379150391,
    y: 5301.9467773438,
    code: "1082"
  },
  {
    x: -866.71606445313,
    y: 5274.794921875,
    code: "1083"
  },
  {
    x: -933.44134521484,
    y: 5172.6826171875,
    code: "1084"
  },
  {
    x: -1107.71484375,
    y: 4918.1157226563,
    code: "1085"
  },
  {
    x: -475.41387939453,
    y: 4956.7563476563,
    code: "1086"
  },
  {
    x: 460.43829345703,
    y: 5615.6508789063,
    code: "1087"
  },
  {
    x: -110.91479492188,
    y: 4656.4223632813,
    code: "1088"
  },
  {
    x: -133.98173522949,
    y: 4332.919921875,
    code: "1089"
  },
  {
    x: -257.10409545898,
    y: 4196.37890625,
    code: "1090"
  },
  {
    x: -238.30830383301,
    y: 4471.0419921875,
    code: "1091"
  },
  {
    x: -371.33514404297,
    y: 4337.6025390625,
    code: "1092"
  },
  {
    x: -447.29046630859,
    y: 4500.8354492188,
    code: "1093"
  },
  {
    x: -605.73547363281,
    y: 4384.0766601563,
    code: "1094"
  },
  {
    x: -648.34130859375,
    y: 4479.708984375,
    code: "1095"
  },
  {
    x: -837.50177001953,
    y: 4377.8969726563,
    code: "1096"
  },
  {
    x: -845.03680419922,
    y: 4481.4077148438,
    code: "1097"
  },
  {
    x: -1145.6888427734,
    y: 4329.6235351563,
    code: "1098"
  },
  {
    x: -1209.3537597656,
    y: 4432.23046875,
    code: "1099"
  },
  {
    x: -1674.9997558594,
    y: 4365.5014648438,
    code: "1100"
  },
  {
    x: -1623.6866455078,
    y: 4518.2045898438,
    code: "1101"
  },
  {
    x: -1918.1656494141,
    y: 4536.6293945313,
    code: "1102"
  },
  {
    x: -1742.2661132813,
    y: 4626.1162109375,
    code: "1103"
  },
  {
    x: -2160.5085449219,
    y: 4566.4223632813,
    code: "1104"
  },
  {
    x: -2372.5200195313,
    y: 4271.5224609375,
    code: "1105"
  },
  {
    x: 2170.171875,
    y: -639.21948242188,
    code: "9391"
  },
  {
    x: 2319.8759765625,
    y: -512.19512939453,
    code: "9392"
  },
  {
    x: 2502.6103515625,
    y: -386.83917236328,
    code: "9393"
  },
  {
    x: 2582.0139160156,
    y: -645.29943847656,
    code: "9394"
  },
  {
    x: 2790.5947265625,
    y: -753.72619628906,
    code: "9395"
  }
];

// sna-src/lib/postal.server.ts
var fivemExports = globalThis.exports;
function postalsEnabled() {
  return GetConvar("snailycad_use_postal", "false") === "true";
}
function getPostalCodes() {
  if (GetResourceState("sna-postals") === "started") {
    try {
      const postals = fivemExports["sna-postals"].readPostalCodes();
      if (Array.isArray(postals) && postals.length)
        return postals;
    } catch (error) {
      console.error(`[${GetCurrentResourceName()}] sna-postals:`, error);
    }
  }
  return postals_default;
}
function getPostal(position) {
  let nearest = null;
  let minDistance = Infinity;
  for (const point of getPostalCodes()) {
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance < minDistance) {
      nearest = point;
      minDistance = distance;
    }
  }
  return nearest ? String(nearest.code) : null;
}
function postalFor(position) {
  return postalsEnabled() ? getPostal(position) : null;
}

// sna-src/sync/server/traffic-stop.ts
var pending = /* @__PURE__ */ new Map();
RegisterCommand(
  "sn-traffic-stop" /* TrafficStop */,
  async (source, args) => {
    const player = Number(source);
    if (player <= 0)
      return;
    const description = args.join(" ").trim().slice(0, 2e3);
    if (!description) {
      chat(player, "Must provide a description for the traffic stop.");
      return;
    }
    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit)
      return;
    const name = GetPlayerName(player);
    pending.set(player, {
      unitId: result.user.unit.id,
      name,
      description,
      auth: result.auth,
      expiresAt: Date.now() + 3e4
    });
    emitNet("sna-sync:request-traffic-stop-flow" /* RequestTrafficStopFlow */, player, {
      unitId: result.user.unit.id,
      source: player,
      name,
      description: args
    });
  },
  false
);
onNet("sna-sync:on-traffic-stop-client-position" /* OnTrafficStopClientPosition */, async (data) => {
  const player = netSource();
  if (!player)
    return;
  const stop = pending.get(player);
  pending.delete(player);
  if (!stop || stop.expiresAt < Date.now())
    return;
  const body = data && typeof data === "object" ? data : {};
  const position = body.position ?? {};
  const [x, y, z] = [position.x, position.y, position.z].map(Number);
  if (![x, y, z].every(Number.isFinite))
    return;
  const heading = Number.isFinite(Number(position.heading)) ? Number(position.heading) : 0;
  const street = typeof body.streetName === "string" ? body.streetName.slice(0, 255) : "";
  const call = await cadRequest({
    method: "POST",
    path: "/911-calls",
    isFromDispatch: false,
    auth: stop.auth,
    quiet: true,
    data: {
      name: stop.name,
      location: street,
      description: stop.description,
      postal: postalFor({ x, y }),
      gtaMapPosition: { x, y, z, heading },
      assignedUnits: [{ id: stop.unitId, isPrimary: true }]
    }
  });
  if (!call.ok || !call.data?.id) {
    chat(
      player,
      call.ok ? "An error occurred while creating the traffic stop." : explainPlayerError(call)
    );
    return;
  }
  chat(
    player,
    `Successfully created a traffic stop call and assigned you to the call with the case number: ^5#${call.data.caseNumber}^7.`
  );
});
on("playerDropped", () => {
  pending.delete(Number(globalThis.source));
});
