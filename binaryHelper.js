/**
 * Created with JetBrains WebStorm.
 * User: ssteveli
 * Date: 11/17/14
 * Time: 3:44 PM
 * To change this template use File | Settings | File Templates.
 */
exports.binaryHelper = {
    writeUTF: function(str, isgetbytes) {
        var back = [],
            bytesize = 0,
            binaryPool = ["0xxxxxxxx", "110xxxxx 10xxxxxx", "1110xxxx 10xxxxxx 10xxxxxx", "11110xxx 10xxxxxx 10xxxxxx 10xxxxxx"];
        for (var i = 0; i < str.length; i++) {
            var type = 0,
                code = str.charCodeAt(i),
                bin = code.toString(2);
            if (code >= 0 && code <= 127) {
                bytesize += 1;
                back.push(code);
                continue;
            } else if (code >= 128 && code <= 2047) {
                bytesize += 2;
                type = 1;
            } else if (code >= 2048 && code <= 65535) {
                bytesize += 3;
                type = 2;
            }
            var temp = binaryPool[type].split(" "),
                val = bin.slice(0, bin.length - 6 * type);
            if (val.length < 6 - type) {
                var zz = "";
                for (var z = 0; z < 6 - type - val.length; z++) {
                    zz += "0";
                }
                val = zz + val;
            }
            var wa = "";
            for (var l = 0; l < 6 - type; l++) {
                wa += "x";
            }
            back.push(parseInt(temp[0].replace(wa, val), 2));
            for (var t = 0; t < type; t++) {
                back.push(parseInt(temp[t + 1].replace("xxxxxx", bin.slice(bin.length - (type - t) * 6, bin.length - (type - t - 1) * 6)), 2));
            }
        }
        if (isgetbytes) {
            return back;
        }
        if (bytesize <= 255) {
            back = [0, bytesize].concat(back);
        } else {
            var bl = bytesize.toString(2);
            back = [parseInt(bl.slice(0, bl.length - 8), 2), parseInt(bl.slice(bl.length - 8), 2)].concat(back);
        }
        return back;
    },
    readUTF:function(arr){
        var UTF="";
        for (var i =0; i < arr.length; i++) {
            var one = arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if (v && one.length == 8) {
                var bytelength = v[0].length,
                    store = arr[i].toString(2).slice(7 - bytelength);
                for (var st = 1; st < bytelength; st++)
                    store += arr[st + i].toString(2).slice(2);
                UTF += String.fromCharCode(parseInt(store, 2));
                i += bytelength - 1;
            } else {
                UTF += String.fromCharCode(arr[i]);
            }
        }
        return UTF;
    },
    convertStream: function(x) {
        if (x instanceof RongIMStream) {
            return x;
        } else {
            return new RongIMStream(x);
        }
    },
    toMQttString: function(str) {
        return this.writeUTF(str);
    },
    skey: [108, 77, 21, 33, 16, 39, 22, 119],
    obfuscation: function(data, start) {
        var dataLen = data.length,
            b = 0,
            _data = data,
            convertTobyte = function(x) {
                if (x > 255)
                    return parseInt(x.toString(2).slice(-8), 2);
                return x;
            };
        for (var i = start; i < dataLen; i += this.skey.length) {
            b = i;
            for (var j = 0; j < skeyLen && b < dataLen; j++, b++) {
                _data[b] = convertTobyte(_data[b] ^ this.skey[j]);
            }
        }
        return _data;
    }
};

var RongIMStream = function(arr) {
    var pool = init(arr),
        check = (function(z) {
            return function(x) {
                return z.position >= pool.length;
            };
        })(this);
    this.position = 0;
    this.writen = 0;

    function init(array) {
        for (var i = 0; i < array.length; i++)
            if (array[i] < 0)
                array[i] += 256;
        return array;
    }

    this.baseRead = function(m, i, a) {
        var t = a ? a : [];
        for (var start = 0; start < i; start++) {
            t[start] = pool[m.position++];
        }
        return t;
    }

    this.readLong = function() {
        if (check()) {
            return -1;
        }
        var end = "";
        for (var i = 0; i < 8; i++) {
            end += pool[this.position++].toString(16);
        }
        return parseInt(end, 16);
    };
    this.readInt = function() {
        if (check()) {
            return -1;
        }
        var end = "";
        for (var i = 0; i < 4; i++) {
            end += pool[this.position++].toString(16);
        }
        return parseInt(end, 16);
    };
    this.readByte = function() {
        if (check()) {
            return -1;
        }
        var tempval = pool[this.position++];
        if (tempval > 255) {
            tempval = parseInt(tempval.toString(2).slice(-8), 2);
        }
        return tempval;
    };
    this.read = function(bytesArray) {
        if (check()) {
            return -1;
        }
        if (bytesArray) {
            this.baseRead(this, bytesArray.length, bytesArray);
        } else {
            return this.baseRead(this, 1)[0];
        }
    };
    this.readUTF = function() {
        var _offset = this.position,
            back = {
                UTF: "",
                offset: 0
            },
            arr = pool;
        var bl = arr.slice(_offset, _offset + 2),
            len = bl[1].toString(16);
        if (len.length < 2)
            len = "0" + len;
        back.offset = 2 + parseInt(bl[0].toString(16) + len, 16);
        for (var i = _offset + 2; i < _offset + back.offset; i++) {
            var one = arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if (v && one.length == 8) {
                var bytelength = v[0].length,
                    store = arr[i].toString(2).slice(7 - bytelength);
                for (var st = 1; st < bytelength; st++)
                    store += arr[st + i].toString(2).slice(2);
                back.UTF += String.fromCharCode(parseInt(store, 2));
                i += bytelength - 1;
            } else {
                back.UTF += String.fromCharCode(arr[i]);
            }
        }
        this.position += back.offset;
        return back.UTF;
    };

    this.write = function(byte) {
        var b = byte;
        if (Object.prototype.toString.call(b).toLowerCase() == "[object array]") {
            pool = pool.concat(b);
        } else if (+b == b) {
            if (b > 255) {
                var s = b.toString(2);
                b = parseInt(s.slice(s.length - 8), 2);
            }
            pool.push(b);
            this.writen++;
        }
        return b;
    };
    this.writeChar = function(v) {
        if (+v != v)
            throw new Error("arguments type is error");
        this.write((v >> 8) & 0xFF);
        this.write(v & 0xFF);
        this.writen += 2;
    };
    this.writeUTF = function(str) {
        var back = [],
            bytesize = 0;
        for (var i = 0; i < str.length; i++) {
            var code = str.charCodeAt(i);
            if (code >= 0 && code <= 127) {
                bytesize += 1;
                back.push(code);
            } else if (code >= 128 && code <= 2047) {
                bytesize += 2;
                back.push((0xc0 | (0x1f & (code >> 6))));
                back.push((0x80 | (0x3f & code)));
            } else if (code >= 2048 && code <= 65535) {
                bytesize += 3;
                back.push((0xe0 | (0x0f & (code >> 12))));
                back.push((0x80 | (0x3f & (code >> 6))));
                back.push((0x80 | (0x3f & code)));
            }
        }
        for (i = 0; i < back.length; i++) {
            if (back[i] > 255) {
                var s = back[i].toString(16);
                back[i] = parseInt(s.slice(s.length - 2), 16);
            }
        }
        if (bytesize <= 255) {
            pool = pool.concat([0, bytesize].concat(back));
        } else {
            var bl = bytesize.toString(16);
            pool = pool.concat([parseInt(bl.slice(0, bl.length - 2), 16), parseInt(bl.slice(bl.length - 2), 16)].concat(back));
        }
        //this.position += back.length + 2;
        this.writen += back.length + 2;
    };
    this.writeLong = function(v) {
        this.write(0xff & (v >> 56));
        this.write(0xff & (v >> 48));
        this.write(0xff & (v >> 40));
        this.write(0xff & (v >> 32));
        this.write(0xff & (v >> 24));
        this.write(0xff & (v >> 16));
        this.write(0xff & (v >> 8));
        this.write(0xff & v);
        this.writen += 8;
    };
    this.writeInt = function(v) {
        this.write(0xff & (v >> 24));
        this.write(0xff & (v >> 16));
        this.write(0xff & (v >> 8));
        this.write(0xff & v);
        this.writen += 4;
    };
    //补码  先取反再加1
    this.toComplements = function() {
        var _tPool = pool;
        for (var i = 0; i < _tPool.length; i++)
            if (_tPool[i] > 128)
                _tPool[i] -= 256;
        return _tPool;
    };
    this.getBytesArray = function(isCom) {
        if (isCom) {
            return this.toComplements();
        }
        return pool;
    };
};