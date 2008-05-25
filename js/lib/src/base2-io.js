// timestamp: Sat, 29 Mar 2008 20:54:59

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// IO/package.js
// =========================================================================

var IO = new base2.Package(this, {
  name:    "IO",
  version: "0.8",
  imports: "Function2,Enumerable",
  exports: "FileSystem,Directory,LocalFileSystem,LocalDirectory,LocalFile,JSONFileSystem,JSONDirectory"
});

eval(this.imports);

function NOT_SUPPORTED() {
  throw new Error("Not supported.");
};

// =========================================================================
// utils/XPCOM.js
// =========================================================================

// some useful methods for dealing with XPCOM

var XPCOM = Module.extend({
  privelegedMethod: I, // no such thing as priveleged for non-Mozilla browsers
  privelegedObject: I,
  
  "@(Components)": {
    createObject: function(classPath, interfaceId) {
      if (classPath.charAt(0) != "@") {
        classPath = "@mozilla.org/" + classPath;
      }
      try {
        return new (new Components.Constructor(classPath, interfaceId));
      } catch (error) {
        throw new Error(format("Failed to create object '%1' (%2).", interfaceId, error.message));
      }
    },
    
    privelegedMethod: function(method) {
      return function() {
        netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
        return method.apply(this, arguments);
      };
    },
    
    privelegedObject: function(object) {
      Base.forEach (object, function(method, name) {
        if (typeof method == "function") {
          object[name] = XPCOM.privelegedMethod(method);
        }
      });
    }
  }
});

// =========================================================================
// IO/FileSystem.js
// =========================================================================

// A base class to derive file systems from.
// Here we'll define all the path management code.

var FileSystem = Base.extend({
  path: "/",
  
  chdir: function(path) {
    // set the current path
    path = this.makepath(path);
    if (!/\/$/.test(path)) { // trailing slash?
      if (this.isDirectory(path)) {
        // if it's a directory add the slash
        path += "/";
      } else {
        // if it's not then trim to the last slash
        path = path.replace(/[^\/]+$/, "");
      }
    }
    this.path = path;
  },
  
  makepath: function(path1, path2) {
    if (arguments.length == 1) {
      path2 = path1;
      path1 = this.path;
    }
    return FileSystem.resolve(path1, path2);
  }, 
    
  copy: NOT_SUPPORTED,
  exists: NOT_SUPPORTED,
  isDirectory: NOT_SUPPORTED,
  isFile: NOT_SUPPORTED,
  mkdir: NOT_SUPPORTED,
  move: NOT_SUPPORTED,
  read: NOT_SUPPORTED,
  remove: NOT_SUPPORTED,
  write: NOT_SUPPORTED
}, {
  resolve: function(path1, path2) {
    var FILENAME = /[^\/]+$/;
    var RELATIVE = /\/[^\/]+\/\.\./;
    // stringify
    path1 = String(path1 || "");
    path2 = String(path2 || "");
    // create a full path from two paths
    if (path2.charAt(0) == "/") {
      var path = "";
    } else {
      path = path1.replace(FILENAME, "");
    }
    path += path2;
    // get rid of ../ relative paths
    while (RELATIVE.test(path)) {
      path = path.replace(RELATIVE, "");
    }
    return path;
  }
});

// =========================================================================
// IO/Directory.js
// =========================================================================

// A collection of stubs that map out the directory structure.
// -- it's too expensive to create full file objects...

var Directory = Collection.extend({
  sort: function() {
    return this.base(function(file1, file2, name1, name2) {
      if (file1.isDirectory != file2.isDirectory) {
        return file1.isDirectory ? -1 : 1; 
      } else {
        return name1 < name2 ? -1 : 1; 
      }
    });
  }
}, {
  Item: {
    constructor: function(name, isDirectory, size) {
      this.name = String(name);
      this.isDirectory = Boolean(isDirectory);
      this.size = Number(size || 0);
    },
    
    toString: function() {
      return this.name;
    }
  }
});

// =========================================================================
// IO/LocalFileSystem.js
// =========================================================================

var LocalFileSystem = FileSystem.extend({
  read: function(path) {
    return LocalFile.read(path);
  },

  write: function(path, text) {
    return LocalFile.write(path, text);
  },

  "@(ActiveXObject)": {
    constructor: function() {
      this.$fso = new ActiveXObject("Scripting.FileSystemObject");
    },
    
    copy: function(path1, path2) {
      var method = this.isDirectory(path1) ? "CopyFolder" : "CopyFile";
      this.$fso[method](path1, path2, true);
    },

    exists: function(path) {
      return this.isFile() || this.isDirectory();
    },

    isFile: function(path) {
      return this.$fso.FileExists(path);
    },
    
    isDirectory: function(path) {
      return this.$fso.FolderExists(path);
    },
  
    mkdir: function(path) {
      return this.$fso.CreateFolder(path);
    },
    
    move: function(path1, path2) {
      var method = this.isDirectory(path1) ? "MoveFolder" : "MoveFile";
      this.$fso[method](path1, path2);
    },
    
    read: function(path) {
      if (this.isDirectory(path)) {
        return new LocalDirectory(this.$fso.GetFolder(path));
      }
      return this.base(path);
    },
    
    remove: function(path) {
      if (this.isFile(path)) {
        this.$fso.DeleteFile(path);
      } else if (this.isDirectory(path)) {
        this.$fso.DeleteFolder(path);
      }
    }
  },

  "@(Components)": { // XPCOM
    constructor: function() {
      this.$nsILocalFile = LocalFile.$createObject();
    },
    
    copy: function(path1, path2) {
      return this.$nsILocalFile.copyTo(path2);
    },
    
    exists: function(path) {
      return this.$nsILocalFile.exists();
    },
    
    isFile: function(path) {
      return this.exists() && this.$nsILocalFile.isFile();
    },
    
    isDirectory: function(path) {
      return this.exists() && this.$nsILocalFile.isDirectory();
    },
  
    mkdir: function(path) {
      return this.$nsILocalFile.create(1);
    },
    
    move: function(path1, path2) {
      return this.$nsILocalFile.moveTo(path2);
    },
    
    read: function(path) {
      if (this.isDirectory(path)) {
        return new LocalDirectory(this.$nsILocalFile.directoryEntries);
      }
      return this.base(path);
    },
    
    remove: function(path) {
      this.$nsILocalFile.remove(false);
    }
  },

  "@(java && !global.Components)": {
    exists: function(path) {
      return new java.io.File(path).exists();
    }
  }
}, {
  "@(Components)": { // XPCOM
    init: function() {
      XPCOM.privelegedObject(this.prototype);
    }
  }
});

// =========================================================================
// IO/LocalDirectory.js
// =========================================================================

var LocalDirectory = Directory.extend({
  "@(ActiveXObject)": {
    constructor: function(directory) {
      this.base();
      var files = directory.files;
      var length = files.Count();      
      for (var i = 0; i < length; i++) {
        this.put(files.item(i));
      }
    }
  },

  "@(Components)": { // XPCOM
    constructor: XPCOM.privelegedMethod(function(directory) {
      this.base();
      var enumerator = directory.QueryInterface(Components.interfaces.nsIDirectoryEnumerator);
      while (enumerator.hasMoreElements()) {
        this.put(enumerator.nextFile);
      }
    })
  }
}, {
  "@(ActiveXObject)": {  
    create: function(name, file) {
      return new this.Item(file.Name, file.Type | 16, file.Size);
    }
  },

  "@(Components)": {
    create: function(name, file) {
      return new this.Item(file.leafName, file.isDirectory(), file.fileSize);
    }
  }
});

// =========================================================================
// IO/LocalFile.js
// =========================================================================

// A class for reading/writing the local file system. Works for Moz/IE/Opera(java)
// the java version seems a bit buggy when writing...?

var LocalFile = Base.extend({
  constructor: function(path, mode) {
    assignID(this);
    this.path = LocalFile.makepath(path);
    if (mode) this.open(mode);
  },

  mode: 0,
  path: "",

  close: function() {
    delete LocalFile.opened[this.base2ID];
    delete this.$stream;
    this.mode = LocalFile.CLOSED;
  },

  open: function(mode) {
    this.mode = mode || LocalFile.READ;
    LocalFile.opened[this.base2ID] = this;
  },

  exists: NOT_SUPPORTED,
  read: NOT_SUPPORTED,
  remove: NOT_SUPPORTED,
  write: NOT_SUPPORTED,

  "@(ActiveXObject)": {
    constructor: function(path, mode) {
      this.$fso = new ActiveXObject("Scripting.FileSystemObject");
      this.base(path, mode);
    },

    close: function() {
      if (this.$stream) {
        this.$stream.Close();
        this.base();
      }
    },

    exists: function() {
      return this.$fso.FileExists(this.path);
    },

    open: function(mode) {
      if (!this.$stream) {
        this.base(mode);
        switch (this.mode) {
          case LocalFile.READ:
            if (!this.exists()) {
              this.mode = LocalFile.CLOSED;
              break;
            }
            this.$stream = this.$fso.OpenTextFile(this.path, 1);
            break;
          case LocalFile.WRITE:
            this.$stream = this.$fso.OpenTextFile(this.path, 2, -1, 0);
            break;
        }
      }
    },

    read: function() {
      return this.$stream.ReadAll();
    },

    remove: function() {
      return this.$fso.GetFile(this.path).Delete();
    },

    write: function(text) {
      this.$stream.Write(text || "");
    }
  },

  "@(Components)": { // XPCOM
    constructor: function(path, mode) {
      this.$nsILocalFile = LocalFile.$createObject();
      this.base(path, mode);
    },

    $init: function() {
      var file = this.$nsILocalFile;
      try {
        file.initWithPath(this.path);
      } catch (error) {
        file.initWithPath(location.pathname);
        file.setRelativeDescriptor(file, this.path);
      }
      return file;
    },

    close: function() {
      if (this.$stream) {
        if (this.mode == LocalFile.WRITE) this.$stream.flush();
        this.$stream.close();
        this.base();
      }
    },

    exists: function() {
      return this.$init().exists();
    },

    open: function(mode) {
      if (!this.$stream) {
        this.base(mode);
        var file = this.$init();
        switch (this.mode) {
          case LocalFile.READ:
            if (!file.exists()) {
              this.mode = LocalFile.CLOSED;
              break;
            }
            var $stream = XPCOM.createObject("network/file-input-stream;1", "nsIFileInputStream");
            $stream.init(file, 0x01, 00004, null);
            this.$stream = XPCOM.createObject("scriptableinputstream;1", "nsIScriptableInputStream");
            this.$stream.init($stream);
            break;
          case LocalFile.WRITE:
            if (!file.exists()) file.create(0, 0664);
            this.$stream = XPCOM.createObject("network/file-output-stream;1", "nsIFileOutputStream");
            this.$stream.init(file, 0x20 | 0x02, 00004, null);
            break;
        }
      }
    },

    read: function() {
      return this.$stream.read(this.$stream.available());
    },

    remove: function() {
      this.$init().remove(false);
    },

    write: function(text) {
      if (text == null) text = "";
      this.$stream.write(text, text.length);
    }
  },

  "@(java && !global.Components)": {
    close: function() {
      if (this.$stream) {
        this.$stream.close();
        this.base();
      }
    },

    exists: function() {
      return new java.io.File(this.path).exists();
    },

    open: function(mode) {
      if (!this.$stream) {
        this.base(mode);
        switch (this.mode) {
          case LocalFile.READ:
            var file = new java.io.FileReader(this.path);
            this.$stream = new java.io.BufferedReader(file);
            break;
          case LocalFile.WRITE:
            var file = new java.io.FileOutputStream(this.path);
            this.$stream = new java.io.PrintStream(file);
            break;
        }
      }
    },

    read: function() {
      var lines = [];
      var line, i = 0;
      while ((line = this.$stream.readLine()) != null) {
        lines[i++] = line;
      }
      return lines.join("\r\n");
    },

    write: function(text) {
      this.$stream.print(text || "");
    }
  }
}, {
  CLOSED: 0,
  READ: 1,
  WRITE: 2,

  opened: {},

  backup: function(fileName, backupName) {
    var text = this.read(fileName);
    this.write(backupName || (fileName + ".backup"), text);
    return text;
  },

  closeAll: function() {
    var files = this.opened;
    for (var i in files) files[i].close();
  },

  exists: function(fileName) {
    return new this(fileName).exists();
  },

  makepath: function(fileName) {
    var TRIM = /[^\/]+$/;
    var path = location.pathname.replace(TRIM, "");
    path = FileSystem.resolve(path, fileName);
    return decodeURIComponent(path);
  },

  "@win(32|64)": {
    makepath: function(fileName) {
      var SLASH = /\//g;
      var BACKSLASH = /\\/g;
      var TRIM = /[^\/]+$/;
      fileName = String(fileName || "").replace(BACKSLASH, "/");
      var path = location.pathname.replace(BACKSLASH, "/").replace(TRIM, "");
      path = FileSystem.resolve(path, fileName).slice(1);
      return decodeURIComponent(path.replace(SLASH, "\\"));
    }
  },

  read: function(fileName) {
    var file = new this(fileName, this.READ);
    var text = file.mode ? file.read() : "";
    file.close();
    return text;
  },

  remove: function(fileName) {
    var file = new this(fileName);
    file.remove();
  },

  write: function(fileName, text) {
    var file = new this(fileName, this.WRITE);
    file.write(text);
    file.close();
  },

  "@(Components)": {
    init: function() {
      XPCOM.privelegedObject(this.prototype);
      this.$createObject = XPCOM.privelegedMethod(function() {
        return XPCOM.createObject("file/local;1", "nsILocalFile");
      });
    }
  }
});

// =========================================================================
// IO/JSONFileSystem.js
// =========================================================================

var _FETCH = "#fetch";

var JSONFileSystem = FileSystem.extend({
  constructor: function(data) {
    this[_FETCH] = function(path) {
      // fetch data from the JSON object, regardless of type
      path = this.makepath(path);
      return reduce(path.split("/"), function(file, name) {
        if (file && name) file = (undefined === file[name]) ? undefined : file[name];
        return file;
      }, data);
    };
  },
  
  exists: function(path) {
    return this[_FETCH](path) !== undefined;
  },
  
  isFile: function(path) {
    return typeof this[_FETCH](path) == "string";
  },
  
  isDirectory: function(path) {
    return typeof this[_FETCH](path) == "object";
  },

  copy: function(path1, path2) {
    var data = this[_FETCH](path1);
    this.write(path2, JSON.copy(data));
  },
  
  mkdir: function(path) {
    // create a directory
    this.write(path, {});
  },
  
  move: function(path1, path2) {
    var data = this[_FETCH](path1);
    this.write(path2, data);
    this.remove(path1);
  },

  read: function(path) {    
    // read text from the JSON object
    var file = this[_FETCH](path);
    return typeof file == "object" ?
      new JSONDirectory(file) : file || ""; // make read safe
  },
  
  remove: function(path) {
    // remove data from the JSON object
    path = path.replace(/\/$/, "").split("/");
    var filename = path.splice(path.length - 1, 1);
    var directory = this[_FETCH](path.join("/"));
    if (directory) delete directory[filename];
  },

  write: function(path, data) {
    // write data to the JSON object
    path = path.split("/");
    var filename = path.splice(path.length - 1, 1);
    var directory = this[_FETCH](path.join("/"));
    assert(directory, "Directory not found."); 
    return directory[filename] = data || "";
  }
});

// =========================================================================
// IO/JSONDirectory.js
// =========================================================================

var JSONDirectory = Directory.extend(null, {
  create: function(name, item) {
    return new this.Item(name, typeof item == "object", typeof item == "string" ? item.length : 0);
  }
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
