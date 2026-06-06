#ifndef ZSS_LANG_WASM_WRITER_HPP
#define ZSS_LANG_WASM_WRITER_HPP

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

namespace zss_lang {

inline void leb128u32(std::vector<uint8_t>& out, uint32_t value) {
  do {
    uint8_t byte = value & 0x7f;
    value >>= 7;
    if (value)
      byte |= 0x80;
    out.push_back(byte);
  } while (value);
}

inline void leb128s32(std::vector<uint8_t>& out, int32_t value) {
  bool more = true;
  while (more) {
    uint8_t byte = value & 0x7f;
    value >>= 7;
    more = !(((value == 0) && ((byte & 0x40) == 0)) ||
             ((value == -1) && ((byte & 0x40) != 0)));
    if (!more)
      byte &= 0x7f;
    else
      byte |= 0x80;
    out.push_back(byte);
  }
}

inline void f64bytes(std::vector<uint8_t>& out, double value) {
  uint64_t bits;
  static_assert(sizeof(double) == sizeof(uint64_t), "f64 size");
  std::memcpy(&bits, &value, sizeof(bits));
  for (int i = 0; i < 8; ++i) {
    out.push_back(static_cast<uint8_t>((bits >> (8 * i)) & 0xff));
  }
}

class WasmInstrEmitter {
public:
  std::vector<uint8_t> body;
  int local_i32 = 0;

  void emit_u8(uint8_t b) { body.push_back(b); }

  void emit_unreachable() { emit_u8(0x00); }

  void emit_i32_const(int32_t v) {
    emit_u8(0x41);
    leb128s32(body, v);
  }

  void emit_f64_const(double v) {
    emit_u8(0x44);
    f64bytes(body, v);
  }

  void emit_local_get(int idx) {
    emit_u8(0x20);
    leb128u32(body, static_cast<uint32_t>(idx));
  }

  void emit_local_set(int idx) {
    emit_u8(0x21);
    leb128u32(body, static_cast<uint32_t>(idx));
  }

  void emit_call(int funcidx) {
    emit_u8(0x10);
    leb128u32(body, static_cast<uint32_t>(funcidx));
  }

  void emit_return() { emit_u8(0x0f); }

  void emit_drop() { emit_u8(0x1a); }

  void emit_i32_eqz() { emit_u8(0x45); }

  void emit_i32_eq() { emit_u8(0x46); }

  void emit_i32_sub() { emit_u8(0x6b); }

  void emit_if(int blocktype = 0x40) {
    emit_u8(0x04);
    emit_u8(static_cast<uint8_t>(blocktype));
  }

  void emit_block(int type = 0x40) {
    emit_u8(0x02);
    emit_u8(static_cast<uint8_t>(type));
  }

  void emit_loop(int type = 0x40) {
    emit_u8(0x03);
    emit_u8(static_cast<uint8_t>(type));
  }

  void emit_end() { emit_u8(0x0b); }

  void emit_br(uint32_t depth) {
    emit_u8(0x0c);
    leb128u32(body, depth);
  }

  void emit_br_if(uint32_t depth) {
    emit_u8(0x0d);
    leb128u32(body, depth);
  }

  void emit_hostcall(int hostimport, int hostindex) {
    emit_i32_const(hostindex);
    emit_call(hostimport);
  }

  void emit_push_i32(int importidx, int32_t v) {
    emit_i32_const(v);
    emit_call(importidx);
  }

  void emit_push_f64(int importidx, double v) {
    emit_f64_const(v);
    emit_call(importidx);
  }

  void emit_push_str(int importidx, int32_t ptr, int32_t len) {
    emit_i32_const(ptr);
    emit_i32_const(len);
    emit_call(importidx);
  }
};

struct WasmModuleBuilder {
  static const int IMPORT_CALL = 0;
  static const int IMPORT_PUSH_I32 = 1;
  static const int IMPORT_PUSH_F64 = 2;
  static const int IMPORT_PUSH_STR = 3;
  static const int FUNC_RUN = 4;

  std::vector<uint8_t> data;
  uint32_t dataoffset = 0;

  uint32_t addstring(const std::string& s) {
    uint32_t ptr = dataoffset;
    for (unsigned char c : s)
      data.push_back(c);
    dataoffset = static_cast<uint32_t>(data.size());
    return ptr;
  }

  std::vector<uint8_t> finish(WasmInstrEmitter& runbody) {
    std::vector<uint8_t> out;
    const uint8_t header[] = {0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00};
    out.insert(out.end(), header, header + 8);

    auto writesection = [&](uint8_t id, const std::vector<uint8_t>& payload) {
      out.push_back(id);
      std::vector<uint8_t> lenbuf;
      leb128u32(lenbuf, static_cast<uint32_t>(payload.size()));
      out.insert(out.end(), lenbuf.begin(), lenbuf.end());
      out.insert(out.end(), payload.begin(), payload.end());
    };

    {
      std::vector<uint8_t> types;
      leb128u32(types, 5);
      auto functype = [&](const std::vector<uint8_t>& params, uint8_t ret) {
        types.push_back(0x60);
        leb128u32(types, static_cast<uint32_t>(params.size()));
        types.insert(types.end(), params.begin(), params.end());
        leb128u32(types, ret ? 1u : 0u);
        if (ret)
          types.push_back(ret);
      };
      functype({0x7f}, 0x7f);
      functype({0x7f}, 0);
      functype({0x7c}, 0);
      functype({0x7f, 0x7f}, 0);
      functype({}, 0x7f);
      writesection(1, types);
    }

    {
      std::vector<uint8_t> imports;
      leb128u32(imports, 4);
      auto importfunc = [&](const char* name, int namelen, uint32_t typeidx) {
        leb128u32(imports, 4);
        imports.insert(imports.end(), {'h', 'o', 's', 't'});
        leb128u32(imports, static_cast<uint32_t>(namelen));
        for (int i = 0; i < namelen; ++i) {
          imports.push_back(static_cast<uint8_t>(name[i]));
        }
        imports.push_back(0x00);
        leb128u32(imports, typeidx);
      };
      importfunc("call", 4, 0);
      importfunc("push_i32", 8, 1);
      importfunc("push_f64", 8, 2);
      importfunc("push_str", 8, 3);
      writesection(2, imports);
    }

    {
      std::vector<uint8_t> funcs;
      leb128u32(funcs, 1);
      leb128u32(funcs, 4);
      writesection(3, funcs);
    }

    {
      std::vector<uint8_t> mem;
      leb128u32(mem, 1);
      mem.push_back(0x00);
      leb128u32(mem, 1);
      writesection(5, mem);
    }

    {
      std::vector<uint8_t> exports;
      leb128u32(exports, 2);
      leb128u32(exports, 3);
      exports.insert(exports.end(), {'r', 'u', 'n'});
      exports.push_back(0x00);
      leb128u32(exports, FUNC_RUN);
      leb128u32(exports, 6);
      exports.insert(exports.end(), {'m', 'e', 'm', 'o', 'r', 'y'});
      exports.push_back(0x02);
      leb128u32(exports, 0);
      writesection(7, exports);
    }

    {
      std::vector<uint8_t> codes;
      leb128u32(codes, 1);
      std::vector<uint8_t> func;
      leb128u32(func, static_cast<uint32_t>(runbody.local_i32));
      for (int i = 0; i < runbody.local_i32; ++i) {
        leb128u32(func, 1);
        func.push_back(0x7f);
      }
      func.insert(func.end(), runbody.body.begin(), runbody.body.end());
      leb128u32(codes, static_cast<uint32_t>(func.size()));
      codes.insert(codes.end(), func.begin(), func.end());
      writesection(10, codes);
    }

    {
      std::vector<uint8_t> datasec;
      leb128u32(datasec, 1);
      leb128u32(datasec, 0);
      datasec.push_back(0x41);
      leb128s32(datasec, 0);
      datasec.push_back(0x0b);
      leb128u32(datasec, static_cast<uint32_t>(data.size()));
      datasec.insert(datasec.end(), data.begin(), data.end());
      writesection(11, datasec);
    }

    return out;
  }
};

} // namespace zss_lang

#endif
