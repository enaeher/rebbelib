// timestamp: Sun, 06 Apr 2008 17:27:28

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// DOM/package.js
// =========================================================================

var DOM = new base2.Package(this, {
  name:    "DOM",
  version: "1.0 (beta 3)",
  imports: "Function2",
  exports:
    "Interface,Binding,Node,Document,Element,AbstractView,HTMLDocument,HTMLElement,"+
    "Selector,Traversal,CSSParser,XPathParser,NodeSelector,DocumentSelector,ElementSelector,"+
    "StaticNodeList,Event,EventTarget,DocumentEvent,ViewCSS,CSSStyleDeclaration,ClassList",
  
  bind: function(node) {
    // Apply a base2 DOM Binding to a native DOM node.
    if (node && node.nodeType) {
      var base2ID = assignID(node);
      if (!DOM.bind[base2ID]) {
        switch (node.nodeType) {
          case 1: // Element
            if (typeof node.className == "string") {
              // It's an HTML element, so use bindings based on tag name.
              (HTMLElement.bindings[node.tagName] || HTMLElement).bind(node);
            } else {
              Element.bind(node);
            }
            break;
          case 9: // Document
            if (node.writeln) {
              HTMLDocument.bind(node);
            } else {
              Document.bind(node);
            }
            break;
          default:
            Node.bind(node);
        }
        DOM.bind[base2ID] = true;
      }
    }
    return node;
  },
  
  "@MSIE5.+win": {
    bind: function(node) {
      if (node && node.writeln) {
        node.nodeType = 9;
      }
      return this.base(node);
    }
  }
});

eval(this.imports);

var _MSIE = detect("MSIE");
var _MSIE5 = detect("MSIE5");

// =========================================================================
// DOM/Interface.js
// =========================================================================

// The Interface module is the base module for defining DOM interfaces.
// Interfaces are defined with reference to the original W3C IDL.
// e.g. http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247

var Interface = Module.extend(null, {
  forEach: function(block, context) {
    forEach (this, function(method, name) {
      if (typeOf(method) == "function" && (this.prototype[name] || method._delegate)) {
        block.call(context, method, name, this);
      }
    }, this, Module);
  },
  
  implement: function(_interface) {
    if (typeof _interface == "object") {
      _extendModule(this, _interface);
    } else if (Interface.ancestorOf(_interface)) {
      for (var name in _interface) {
        if (_interface[name] && _interface[name]._delegate) {
          this[name] = bind(name, _interface);
          this[name]._delegate = name;
        }
      }
    }
    return this.base(_interface);
  }
});

function _extendModule(module, _interface) {
  for (var name in _interface) {
    var property = _interface[name];
    if (name.charAt(0) == "@") {
      _extendModule(module, property);
    } else if (!module[name] && typeof property == "function" && property.call) {
      // delegate a static method to the bound object
      //  e.g. for most browsers:
      //    EventTarget.addEventListener(element, type, listener, capture)
      //  forwards to:
      //    element.addEventListener(type, listener, capture)
      var fn = _createDelegate(name, property.length);
      fn._delegate = name;
      module[name] = fn;
      module.namespace += "var " + name + "=base2.lang.bind('" + name + "',base2.Module[" + module.toString("index") + "]);";
    }
  }
};

var _createDelegate = _MSIE ? function(name, length) {
  var FN = "function _staticModuleMethod(%2){%3.base=%3.%1.ancestor;var m=%3.base?'base':'%1';return %3[m](%4)}";
  var args = "abcdefghij".slice(-length).split("");
  eval(format(FN, name, args, args[0], args.slice(1)));
  return _staticModuleMethod;
} : function(name) {
  return function _staticModuleMethod(element) {
    element.base = element[name].ancestor;
    var method = element.base ? 'base' : name;
    return element[method].apply(element, Array2.slice(arguments, 1));
  };
};

// =========================================================================
// DOM/Binding.js
// =========================================================================

var Binding = Interface.extend(null, {
  bind: function(object) {
    return extend(object, this.prototype);
  }
});

// =========================================================================
// DOM/Node.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-1950641247

var Node = Binding.extend({  
  "@!(element.compareDocumentPosition)" : {
    compareDocumentPosition: function(node, other) {
      // http://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-compareDocumentPosition
      
      if (Traversal.contains(node, other)) {
        return 4|16; // following|contained_by
      } else if (Traversal.contains(other, node)) {
        return 2|8;  // preceding|contains
      }
      
      var nodeIndex = _getSourceIndex(node);
      var otherIndex = _getSourceIndex(other);
      
      if (nodeIndex < otherIndex) {
        return 4; // following
      } else if (nodeIndex > otherIndex) {
        return 2; // preceding
      }      
      return 0;
    }
  }
});

var _getSourceIndex = document.documentElement.sourceIndex ? function(node) {
  return node.sourceIndex;
} : function(node) {
  // return a key suitable for comparing nodes
  var key = 0;
  while (node) {
    key = Traversal.getNodeIndex(node) + "." + key;
    node = node.parentNode;
  }
  return key;
};

// =========================================================================
// DOM/Document.js
// =========================================================================

var Document = Node.extend(null, {
  bind: function(document) {
    extend(document, "createElement", function(tagName) {
      return DOM.bind(this.base(tagName));
    });
    AbstractView.bind(document.defaultView);
    if (document != window.document)
      new DOMContentLoadedEvent(document);
    return this.base(document);
  },
  
  "@!(document.defaultView)": {
    bind: function(document) {
      document.defaultView = Traversal.getDefaultView(document);
      return this.base(document);
    }
  }
});

// =========================================================================
// DOM/Element.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-745549614

// getAttribute() will return null if the attribute is not specified. This is
//  contrary to the specification but has become the de facto standard.

var _EVALUATED = /^(href|src)$/;
var _ATTRIBUTES = {
  "class": "className",
  "for": "htmlFor"
};

var Element = Node.extend({
  "@^Win.+MSIE[5-7]": { // MSIE
    getAttribute: function(element, name) {
      if (element.className === undefined) { // XML
        return this.base(element, name);
      }
      var attribute = _getAttributeNode(element, name);
      if (attribute && (attribute.specified || name == "value")) {
        if (_EVALUATED.test(name)) {
          return this.base(element, name, 2);
        } else if (name == "style") {
         return element.style.cssText;
        } else {
         return attribute.nodeValue;
        }
      } else if (name == "type" && element.nodeName == "INPUT") {
        var outerHTML = element.outerHTML;
  			with (outerHTML) outerHTML = slice(0, indexOf(">") + 1);
  			return match(outerHTML, /type="?([^\s">]*)"?/i)[1] || null;
      }
      return null;
    },

    removeAttribute: function(element, name) {
      if (element.className !== undefined) { // XML
        name = _ATTRIBUTES[name.toLowerCase()] || name;
      }
      this.base(element, name);
    },

    setAttribute: function(element, name, value) {
      if (element.className === undefined) { // XML
        this.base(element, name, value);
      } else if (name == "style") {
        element.style.cssText = value;
      } else {
        value = String(value);
        var attribute = _getAttributeNode(element, name);
        if (attribute) {
          attribute.nodeValue = value;
        } else {
          this.base(element, _ATTRIBUTES[name.toLowerCase()] || name, value);
        }
      }
    }
  },

  "@!(element.hasAttribute)": {
    hasAttribute: function(element, name) {
      if (element.className === undefined) { // XML
        return this.base(element, name);
      }
      return this.getAttribute(element, name) != null;
    }
  }
});

// remove the base2ID for clones
extend(Element.prototype, "cloneNode", function(deep) {
  var clone = this.base(deep || false);
  clone.removeAttribute("base2ID");
  if (clone.base2ID) delete clone.base2ID;
  return clone;
});

var _HTML_ATTRIBUTES = "colSpan,rowSpan,vAlign,dateTime,accessKey,tabIndex,encType,maxLength,readOnly,longDesc";
// Convert the list of strings to a hash, mapping the lowercase name to the camelCase name.
extend(_ATTRIBUTES, Array2.combine(_HTML_ATTRIBUTES.toLowerCase().split(","), _HTML_ATTRIBUTES.split(",")));

var _getAttributeNode = document.documentElement.getAttributeNode ? function(element, name) {
  return element.getAttributeNode(name);
} : function(element, name) {
  return element.attributes[name] || element.attributes[_ATTRIBUTES[name.toLowerCase()]];
};

// =========================================================================
// DOM/Traversal.js
// =========================================================================

// DOM Traversal. Just the basics.

var TEXT = _MSIE ? "innerText" : "textContent";

var Traversal = Module.extend({
  getDefaultView: function(node) {
    return this.getDocument(node).defaultView;
  },
  
  getNextElementSibling: function(node) {
    // return the next element to the supplied element
    //  nextSibling is not good enough as it might return a text or comment node
    while (node && (node = node.nextSibling) && !this.isElement(node)) continue;
    return node;
  },

  getNodeIndex: function(node) {
    var index = 0;
    while (node && (node = node.previousSibling)) index++;
    return index;
  },
  
  getOwnerDocument: function(node) {
    // return the node's containing document
    return node.ownerDocument;
  },
  
  getPreviousElementSibling: function(node) {
    // return the previous element to the supplied element
    while (node && (node = node.previousSibling) && !this.isElement(node)) continue;
    return node;
  },

  getTextContent: function(node, isHTML) {
    return node[isHTML ? "innerHTML" : TEXT];
  },

  isEmpty: function(node) {
    node = node.firstChild;
    while (node) {
      if (node.nodeType == 3 || this.isElement(node)) return false;
      node = node.nextSibling;
    }
    return true;
  },

  setTextContent: function(node, text, isHTML) {
    return node[isHTML ? "innerHTML" : TEXT] = text;
  },

  "@!MSIE": {
    setTextContent: function(node, text, isHTML) {
      // Destroy the DOM (slightly faster for non-MISE browsers)
      with (node) while (lastChild) parentNode.removeChild(lastChild);
      return this.base(node, text, isHTML);
    }
  },

  "@MSIE": {
    getDefaultView: function(node) {
      return (node.document || node).parentWindow;
    },
  
    "@MSIE5": {
      // return the node's containing document
      getOwnerDocument: function(node) {
        return node.ownerDocument || node.document;
      }
    }
  }
}, {
  contains: function(node, target) {
    node.nodeType; // throw an error if no node supplied
    while (target && (target = target.parentNode) && node != target) continue;
    return !!target;
  },
  
  getDocument: function(node) {
    // return the document object
    return this.isDocument(node) ? node : node.ownerDocument || node.document;
  },
  
  isDocument: function(node) {
    return !!(node && node.documentElement);
  },
  
  isElement: function(node) {
    return !!(node && node.nodeType == 1);
  },
  
  "@(element.contains)": {  
    contains: function(node, target) {
      return node != target && (this.isDocument(node) ? node == this.getOwnerDocument(target) : node.contains(target));
    }
  },
  
  "@MSIE5": {
    isElement: function(node) {
      return !!(node && node.nodeType == 1 && node.nodeName != "!");
    }
  }
});

// =========================================================================
// DOM/views/AbstractView.js
// =========================================================================

var AbstractView = Binding.extend();

// =========================================================================
// DOM/events/header.js
// =========================================================================

var _CAPTURE_TYPE = {};

var _CAPTURING_PHASE = 1,
    _AT_TARGET       = 2,
    _BUBBLING_PHASE  = 3;
    
var _MOUSE_BUTTON   = /^mouse(up|down)|click$/,
    _MOUSE_CLICK    = /click$/,
    _BUBBLES        = "abort|error|select|change|resize|scroll|", // + _CANCELABLE
    _CANCELABLE     = "(dbl)?click|mouse(down|up|over|move|out|wheel)|key(down|up)|submit|reset";

    _BUBBLES = new RegExp("^(" +_BUBBLES + _CANCELABLE + ")$");
    _CANCELABLE = new RegExp("^(" + _CANCELABLE + ")$");

if (_MSIE) {
  var _W3C_EVENT_TYPE = {focusin: "focus", focusout: "blur"};
      _CAPTURE_TYPE   = {focus: "focusin", blur: "focusout"};
}

// =========================================================================
// DOM/events/Event.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Event

var Event = Binding.extend({
  "@!(document.createEvent)": {
    initEvent: function(event, type, bubbles, cancelable) {
      event.type = String(type);
      event.bubbles = !!bubbles;
      event.cancelable = !!cancelable;
    },

    preventDefault: function(event) {
      if (event.cancelable !== false) {
        event.returnValue = false;
      }
    },

    stopPropagation: function(event) {
      event.cancelBubble = true;
    },
    
    "@MSIE": {
      preventDefault: function(event) {
        this.base(event);
        if (event.type == "mousedown") {
          var type = "onbeforedeactivate";
          var document = Traversal.getDocument(event.target);
          document.attachEvent(type, function(event) {
            // Allow a mousedown event to cancel a focus event.
            event.returnValue = false;
            document.detachEvent(type, arguments.callee);
          });
        }
      }
    }
  }
}, {
  "@!(document.createEvent)": {
    "@MSIE": {
      bind: function(event) {
        var type = event.type;
        if (!event.timeStamp) {
          event.bubbles = _BUBBLES.test(type);
          event.cancelable = _CANCELABLE.test(type);
          event.timeStamp = new Date().valueOf();
        }
        event.relatedTarget = event[(event.target == event.fromElement ? "to" : "from") + "Element"];
        return this.base(event);
      }
    }
  }
});

// =========================================================================
// DOM/events/EventDispatcher.js
// =========================================================================

var EventDispatcher = Base.extend({
  constructor: function(state) {
    this.state = state;
    this.events = state.events;
  },

  dispatch: function(nodes, event, phase) {
    event.eventPhase = phase;
    var map = this.events[event.type][phase];
    if (map) {
      var i = nodes.length;
      while (i--) {
        var target = nodes[i];
        var listeners = map[target.base2ID];
        if (listeners) {
          event.eventPhase = target == event.target ? _AT_TARGET : phase;
          event.currentTarget = target;
          for (var listenerID in listeners) {
            var listener = listeners[listenerID];
            if (typeof listener == "function") {
              listener.call(target, event);
            } else {
              listener.handleEvent(event);
            }
          }
        }
      }
    }
  },

  handleEvent: function(event) {
    Event.bind(event);
    var type = event.type;
    var w3cType = _W3C_EVENT_TYPE[type];
    if (w3cType) {
      event = extend({}, event);
      type = event.type = w3cType;
    }
    if (this.events[type]) {
      // Fix the mouse button (left=0, middle=1, right=2)
      if (_MOUSE_BUTTON.test(type)) {
        var button = event.button;
        if (_MOUSE_CLICK.test(type)) {
          button = this.state._button;
        }
        if (button != 2) button = button == 4 ? 1 : 0;
        if (event.button != button) {
          event = extend({}, event);
          event.button = button;
        }
      }
      // Collect nodes in the event hierarchy
      var target = event.target;
      var nodes = [], i = 0;
      while (target) {
        nodes[i++] = target;
        target = target.parentNode;
      }
      this.dispatch(nodes, event, _CAPTURING_PHASE);
      nodes.reverse();
      this.dispatch(nodes, event, _BUBBLING_PHASE);
    }
    return event.returnValue;
  }
});

// =========================================================================
// DOM/events/EventTarget.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Registration-interfaces

var EventTarget = Interface.extend({
  removeEventListener: function(target, type, listener, useCapture) {
    this.base(target, type, DocumentState[listener.base2ID] || listener, useCapture);
  },
  
  "@!(element.addEventListener)": {
    addEventListener: function(target, type, listener, useCapture) {
      var documentState = DocumentState.getInstance(target);

      // assign a unique id to both objects
      var targetID = assignID(target);
      var listenerID = assignID(listener);

      // create a hash table of event types for the target object
      var phase = useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE;
      var typeMap = documentState.registerEvent(type);
      var phaseMap = typeMap[phase];
      if (!phaseMap) phaseMap = typeMap[phase] = {};
      // focus/blur (MSIE)
      if (useCapture) type = _CAPTURE_TYPE[type] || type;
      // create a hash table of event listeners for each object/event pair
      var listeners = phaseMap[targetID];
      if (!listeners) listeners = phaseMap[targetID] = {};
      // store the event listener in the hash table
      listeners[listenerID] = listener;
    },
    
    dispatchEvent: function(target, event) {
      return DocumentState.getInstance(target).handleEvent(event);
    },
    
    removeEventListener: function(target, type, listener, useCapture) {
      var events = DocumentState.getInstance(target).events;
      // delete the event listener from the hash table
      var typeMap = events[type];
      if (typeMap) {
        var phaseMap = typeMap[useCapture ? _CAPTURING_PHASE : _BUBBLING_PHASE];
        if (phaseMap) {
          var listeners = phaseMap[target.base2ID];
          if (listeners) delete listeners[listener.base2ID];
        }
      }
    },

    "@(element.fireEvent)": {
      dispatchEvent: function(target, event) {
        event.target = target;
        return this.base(target, event);
      }
    }
  },

  "@Gecko": {
    addEventListener: function(target, type, listener, useCapture) {
      if (type == "mousewheel") {
        var onmousewheel = DocumentState[assignID(listener)] = listener;
        listener = function(event) {
          event = copy(event);
          event.__defineGetter__("type", K("mousewheel"));
          event.wheelDelta = (-event.detail * 40) || 0;
          if (typeof onmousewheel == "function") {
            onmousewheel.call(event.target, event);
          } else {
            onmousewheel.handleEvent(event);
          }
        };
        type = "DOMMouseScroll";
      }
      this.base(target, type, listener, useCapture);
    }
  },

  // http://unixpapa.com/js/key.html
  "@Linux|Mac|opera": {
    addEventListener: function(target, type, listener, useCapture) {
      // Some browsers do not fire repeated "keydown" events when a key
      // is held down. They do fire repeated "keypress" events though.
      // Cancelling the "keydown" event does not cancel the repeated
      // "keypress" events. We fix all of this here...
      if (type == "keydown") {
        var onkeydown = DocumentState[assignID(listener)] = listener;
        listener = function(keydown) {
          var firedCount = 0, cancelled = false;
          extend(keydown, "preventDefault", function() {
            this.base();
            cancelled = true;
          });
          function handleEvent(event) {
            if (cancelled) event.preventDefault();
            if (event == keydown || firedCount > 1) {
              if (typeof onkeydown == "function") {
                onkeydown.call(target, keydown);
              } else {
                onkeydown.handleEvent(keydown);
              }
            }
            firedCount++;
          };
          handleEvent(keydown);
          target.addEventListener("keyup", function() {
            target.removeEventListener("keypress", handleEvent, true);
            target.removeEventListener("keyup", arguments.callee, true);
          }, true);
          target.addEventListener("keypress", handleEvent, true);
        };
      }
      this.base(target, type, listener, useCapture);
    }
  }
});

// =========================================================================
// DOM/events/DocumentEvent.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-DocumentEvent

var DocumentEvent = Interface.extend({  
  "@!(document.createEvent)": {
    createEvent: function() {
      return Event.bind({});
    },
  
    "@(document.createEventObject)": {
      createEvent: function(document) {
        return Event.bind(document.createEventObject());
      }
    },

    createEvent: function(document, type) {
      var event = this.base(document);
      event.bubbles = false;
      event.cancelable = false;
      event.eventPhase = 0;
      event.target = document;
      event.currentTarget = null;
      event.relatedTarget = null;
      event.timeStamp = new Date().valueOf();
      return event;
    }
  },
  
  "@(document.createEvent)": {
    "@!(document.createEvent('Events'))": { // before Safari 3
      createEvent: function(document, type) {
        return this.base(document, type == "Events" ? "UIEvents" : type);
      }
    }
  }
});

// =========================================================================
// DOM/events/DOMContentLoadedEvent.js
// =========================================================================

// http://dean.edwards.name/weblog/2006/06/again

// TO DO: copy jQuery's technique for witing for style sheets to be loaded (opera/safari).

var DOMContentLoadedEvent = Base.extend({
  constructor: function(document) {
    var fired = false;
    this.fire = function() {
      if (!fired) {
        fired = true;
        // this function will be called from another event handler so we'll user a timer
        //  to drop out of any current event
        setTimeout(function() {
          var event = DocumentEvent.createEvent(document, "Events");
          Event.initEvent(event, "DOMContentLoaded", true, true);
          EventTarget.dispatchEvent(document, event);
        }, 1);
      }
    };
    // use the real event for browsers that support it (opera & firefox)
    EventTarget.addEventListener(document, "DOMContentLoaded", function() {
      fired = true;
    }, false);
    this.listen(document);
  },
  
  listen: Undefined,

  "@!Gecko": {
    listen: function(document) {
      // if all else fails fall back on window.onload
      EventTarget.addEventListener(Traversal.getDefaultView(document), "load", this.fire, false);
    }
  },

  "@MSIE.+win": {
    listen: function(document) {
      // http://javascript.nwbox.com/IEContentLoaded/
      try {
        document.body.doScroll("left");
        if (!this.__constructing) this.fire();
      } catch (e) {
        setTimeout(bind(this.listen, this, document), 10);
      }
    }
  },
  
  "@KHTML": {
    listen: function(document) {
      // John Resig
      if (/loaded|complete/.test(document.readyState)) { // loaded
        if (!this.__constructing) this.fire();
      } else {
        setTimeout(bind(this.listen, this, document), 10);
      }
    }
  }
});

// =========================================================================
// DOM/events/implementations.js
// =========================================================================

Document.implement(DocumentEvent);
Document.implement(EventTarget);

Element.implement(EventTarget);

// =========================================================================
// DOM/style/ViewCSS.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-ViewCSS

var _PIXEL   = /^\d+(px)?$/i;
var _METRICS = /(width|height|top|bottom|left|right|fontSize)$/;
var _COLOR   = /^(color|backgroundColor)$/;
var _RUBY    = /^ruby/;

var ViewCSS = Interface.extend({
  "@!(document.defaultView.getComputedStyle)": {
    "@MSIE": {
      getComputedStyle: function(view, element, pseudoElement) {
        // pseudoElement parameter is not supported
        var currentStyle = element.currentStyle;
        var computedStyle = {};
        for (var i in currentStyle) {
          if (_METRICS.test(i) || _COLOR.test(i)) {
            computedStyle[i] = this.getComputedPropertyValue(view, element, i);
          } else if (!_RUBY.test(i)) {
            computedStyle[i] = currentStyle[i];
          }
        }
        return computedStyle;
      }
    }
  },
  
  getComputedStyle: function(view, element, pseudoElement) {
    return _CSSStyleDeclaration_ReadOnly.bind(this.base(view, element, pseudoElement));
  }
}, {
  getComputedPropertyValue: function(view, element, propertyName) {
    return CSSStyleDeclaration.getPropertyValue(this.getComputedStyle(view, element, null), propertyName);
  },
  
  "@MSIE": {
    getComputedPropertyValue: function(view, element, propertyName) {
      propertyName = this.toCamelCase(propertyName);
      if (_METRICS.test(propertyName))
        return _MSIE_getPixelValue(element, element.currentStyle[propertyName]) + "px";
      if (_COLOR.test(propertyName))
        return _MSIE_getColorValue(element, propertyName == "color" ? "ForeColor" : "BackColor");
      return element.currentStyle[propertyName];
    }
  },
  
  toCamelCase: function(string) {
    return string.replace(/\-([a-z])/g, flip(String2.toUpperCase));
  }
});

function _MSIE_getPixelValue(element, value) {
  if (_PIXEL.test(value)) return parseInt(value);
  var styleLeft = element.style.left;
  var runtimeStyleLeft = element.runtimeStyle.left;
  element.runtimeStyle.left = element.currentStyle.left;
  element.style.left = value || 0;
  value = element.style.pixelLeft;
  element.style.left = styleLeft;
  element.runtimeStyle.left = runtimeStyleLeft;
  return value;
};

function _MSIE_getColorValue(element, value) {
  // elements need to have "layout" for this to work.
  if (element.createTextRange) {
    var range = element.createTextRange();
  } else {
    element.document.body.createTextRange();
    range.moveToElementText(element);
  }
  var color = range.queryCommandValue(value);
  return format("rgb(%1, %2, %3)", color & 0xff, (color & 0xff00) >> 8,  (color & 0xff0000) >> 16);
};

// =========================================================================
// DOM/style/CSSStyleDeclaration.js
// =========================================================================

// http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration

var _CSSStyleDeclaration_ReadOnly = Binding.extend({
  getPropertyValue: function(style, propertyName) {
    return this.base(style, _CSSPropertyNameMap[propertyName] || propertyName);
  },
  
  "@MSIE.+win": {
    getPropertyValue: function(style, propertyName) {
      return propertyName == "float" ? style.styleFloat : style[ViewCSS.toCamelCase(propertyName)];
    }
  }
});

var CSSStyleDeclaration = _CSSStyleDeclaration_ReadOnly.extend({
  setProperty: function(style, propertyName, value, priority) {
    return this.base(style, _CSSPropertyNameMap[propertyName] || propertyName, value, priority);
  },
  
  "@MSIE.+win": {
    setProperty: function(style, propertyName, value, priority) {
      if (propertyName == "opacity") {
        value *= 100;
        style.opacity = value;
        style.zoom = 1;
        style.filter = "Alpha(opacity=" + value + ")";
      } else {
        if (priority == "important") {
          style.cssText += format(";%1:%2!important;", propertyName, value);
        } else {
          style.setAttribute(propertyName, value);
        }
      }
    }
  }
}, {
  "@MSIE": {
    bind: function(style) {
      style.getPropertyValue = this.prototype.getPropertyValue;
      style.setProperty = this.prototype.setProperty;
      return style;
    }
  }
});

var _CSSPropertyNameMap = new Base({
  "@Gecko": {
    opacity: "-moz-opacity"
  },
  
  "@KHTML": {
    opacity: "-khtml-opacity"
  }
});

with (CSSStyleDeclaration.prototype) getPropertyValue.toString = setProperty.toString = K("[base2]");

// =========================================================================
// DOM/style/implementations.js
// =========================================================================

AbstractView.implement(ViewCSS);

// =========================================================================
// DOM/selectors-api/NodeSelector.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/

var NodeSelector = Interface.extend({
  "@(element.querySelector)": {
    querySelector: function(node, selector) {
      try {
        var element = this.base(node, trim(selector));
        if (element) return element;
      } catch(x) {}
      // assume it's an unsupported selector
      return new Selector(selector).exec(node, 1);
    },
    
    querySelectorAll: function(node, selector) {
      try {
        var nodeList = this.base(node, trim(selector));
        if (nodeList) return new StaticNodeList(nodeList);
      } catch(x) {}
      // assume it's an unsupported selector
      return new Selector(selector).exec(node);
    }
  },

  "@!(element.querySelector)": {
    querySelector: function(node, selector) {
      return new Selector(selector).exec(node, 1);
    },

    querySelectorAll: function(node, selector) {
      return new Selector(selector).exec(node);
    }
  }
});

// automatically bind objects retrieved using the Selectors API

extend(NodeSelector.prototype, {
  querySelector: function(selector) {
    return DOM.bind(this.base(selector));
  },

  querySelectorAll: function(selector) {
    return extend(this.base(selector), "item", function(index) {
      return DOM.bind(this.base(index));
    });
  }
});

// =========================================================================
// DOM/selectors-api/DocumentSelector.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#documentselector

var DocumentSelector = NodeSelector.extend();

// =========================================================================
// DOM/selectors-api/ElementSelector.js
// =========================================================================

var ElementSelector = NodeSelector.extend({
  "@!(element.matchesSelector)": { // future-proof
    matchesSelector: function(element, selector) {
      return new Selector(selector).test(element);
    }
  }
});

// =========================================================================
// DOM/selectors-api/CSSParser.js
// =========================================================================

var _CSS_ESCAPE =           /'(\\.|[^'\\])*'|"(\\.|[^"\\])*"/g,
    _CSS_IMPLIED_ASTERISK = /([\s>+~,]|[^(]\+|^)([#.:\[])/g,
    _CSS_IMPLIED_SPACE =    /(^|,)([^\s>+~])/g,
    _CSS_WHITESPACE =       /\s*([\s>+~(),]|^|$)\s*/g,
    _CSS_WILD_CARD =        /\s\*\s/g,
    _CSS_UNESCAPE =         /\x01(\d+)/g,
    _QUOTE =                /'/g;
  
var CSSParser = RegGrp.extend({
  constructor: function(items) {
    this.base(items);
    this.cache = {};
    this.sorter = new RegGrp;
    this.sorter.add(/:not\([^)]*\)/, RegGrp.IGNORE);
    this.sorter.add(/([ >](\*|[\w-]+))([^: >+~]*)(:\w+-child(\([^)]+\))?)([^: >+~]*)/, "$1$3$6$4");
  },
  
  cache: null,
  ignoreCase: true,

  escape: function(selector, simple) {
    // remove strings
    var strings = this._strings = [];
    selector = this.optimise(this.format(String(selector).replace(_CSS_ESCAPE, function(string) {
      return "\x01" + strings.push(string.slice(1, -1).replace(_QUOTE, "\\'"));
    })));
    if (simple) selector = selector.replace(/^ \*?/, "");
    return selector;
  },
  
  format: function(selector) {
    return selector
      .replace(_CSS_WHITESPACE, "$1")
      .replace(_CSS_IMPLIED_SPACE, "$1 $2")
      .replace(_CSS_IMPLIED_ASTERISK, "$1*$2");
  },
  
  optimise: function(selector) {
    // optimise wild card descendant selectors
    return this.sorter.exec(selector.replace(_CSS_WILD_CARD, ">* "));
  },
  
  parse: function(selector, simple) {
    return this.cache[selector] ||
      (this.cache[selector] = this.unescape(this.exec(this.escape(selector, simple))));
  },
  
  unescape: function(selector) {
    // put string values back
    var strings = this._strings;
    return selector.replace(_CSS_UNESCAPE, function(match, index) {
      return strings[index - 1];
    });
  }
});

function _nthChild(match, args, position, last, not, and, mod, equals) {
  // ugly but it works for both CSS and XPath
  last = /last/i.test(match) ? last + "+1-" : "";
  if (!isNaN(args)) args = "0n+" + args;
  else if (args == "even") args = "2n";
  else if (args == "odd") args = "2n+1";
  args = args.split("n");
  var a = args[0] ? (args[0] == "-") ? -1 : parseInt(args[0]) : 1;
  var b = parseInt(args[1]) || 0;
  var negate = a < 0;
  if (negate) {
    a = -a;
    if (a == 1) b++;
  }
  var query = format(a == 0 ? "%3%7" + (last + b) : "(%4%3-%2)%6%1%70%5%4%3>=%2", a, b, position, last, and, mod, equals);
  if (negate) query = not + "(" + query + ")";
  return query;
};

// =========================================================================
// DOM/selectors-api/XPathParser.js
// =========================================================================

// XPath parser
// converts CSS expressions to *optimised* XPath queries

// This code used to be quite readable until I added code to optimise *-child selectors. 

var XPathParser = CSSParser.extend({
  constructor: function() {
    this.base(XPathParser.build());
    // The sorter sorts child selectors to the end because they are slow.
    // For XPath we need the child selectors to be sorted to the beginning,
    // so we reverse the sort order. That's what this line does:
    this.sorter.putAt(1, "$1$4$3$6");
  },
  
  escape: function(selector, simple) {
    return this.base(selector, simple).replace(/,/g, "\x02");
  },
  
  unescape: function(selector) {
    return this.base(selector
      .replace(/\[self::\*\]/g, "")   // remove redundant wild cards
      .replace(/(^|\x02)\//g, "$1./") // context
      .replace(/\x02/g, " | ")        // put commas back      
    ).replace(/'[^'\\]*\\'(\\.|[^'\\])*'/g, function(match) { // escape single quotes
      return "concat(" + match.split("\\'").join("',\"'\",'") + ")";
    });
  }
  
/*"@opera": {
    unescape: function(selector) {
      // opera does not seem to support last() but I can't find any 
      //  documentation to confirm this
      return this.base(selector.replace(/last\(\)/g, "count(preceding-sibling::*)+count(following-sibling::*)+1"));
    }
  }*/
}, {
  build: function() {
    // build the rules collection
    this.values.attributes[""] = "[@$1]";
    forEach (this.types, function(add, type) {
      forEach (this.values[type], add, this.rules);
    }, this);
    this.build = K(this.rules);
    return this.rules;
  },
  
  optimised: {
    pseudoClasses: {
      "first-child": "[1]",
      "last-child":  "[last()]",
      "only-child":  "[last()=1]"
    }
  },
  
  rules: extend({}, {
    "@!KHTML": { // these optimisations do not work on Safari
      // fast id() search
      "(^|\\x02) (\\*|[\\w-]+)#([\\w-]+)": "$1id('$3')[self::$2]",
      // optimise positional searches
      "([ >])(\\*|[\\w-]+):([\\w-]+-child(\\(([^)]+)\\))?)": function(match, token, tagName, pseudoClass, $4, args) {
        var replacement = (token == " ") ? "//*" : "/*";
        if (/^nth/i.test(pseudoClass)) {
          replacement += _xpath_nthChild(pseudoClass, args, "position()");
        } else {
          replacement += XPathParser.optimised.pseudoClasses[pseudoClass];
        }
        return replacement + "[self::" + tagName + "]";
      }
    }
  }),
  
  types: {
    identifiers: function(replacement, token) {
      this[rescape(token) + "([\\w-]+)"] = replacement;
    },
    
    combinators: function(replacement, combinator) {
      this[rescape(combinator) + "(\\*|[\\w-]+)"] = replacement;
    },
    
    attributes: function(replacement, operator) {
      this["\\[([\\w-]+)\\s*" + rescape(operator) +  "\\s*([^\\]]*)\\]"] = replacement;
    },
    
    pseudoClasses: function(replacement, pseudoClass) {
      this[":" + pseudoClass.replace(/\(\)$/, "\\(([^)]+)\\)")] = replacement;
    }
  },
  
  values: {
    identifiers: {
      "#": "[@id='$1'][1]", // ID selector
      ".": "[contains(concat(' ',@class,' '),' $1 ')]" // class selector
    },
    
    combinators: {
      " ": "/descendant::$1", // descendant selector
      ">": "/child::$1", // child selector
      "+": "/following-sibling::*[1][self::$1]", // direct adjacent selector
      "~": "/following-sibling::$1" // indirect adjacent selector
    },
    
    attributes: { // attribute selectors
      "*=": "[contains(@$1,'$2')]",
      "^=": "[starts-with(@$1,'$2')]",
      "$=": "[substring(@$1,string-length(@$1)-string-length('$2')+1)='$2']",
      "~=": "[contains(concat(' ',@$1,' '),' $2 ')]",
      "|=": "[contains(concat('-',@$1,'-'),'-$2-')]",
      "!=": "[not(@$1='$2')]",
      "=":  "[@$1='$2']"
    },
    
    pseudoClasses: { // pseudo class selectors
      "empty":            "[not(child::*) and not(text())]",
//-   "lang()":           "[boolean(lang('$1') or boolean(ancestor-or-self::*[@lang][1][starts-with(@lang,'$1')]))]",
      "first-child":      "[not(preceding-sibling::*)]",
      "last-child":       "[not(following-sibling::*)]",
      "not()":            _xpath_not,
      "nth-child()":      _xpath_nthChild,
      "nth-last-child()": _xpath_nthChild,
      "only-child":       "[not(preceding-sibling::*) and not(following-sibling::*)]",
      "root":             "[not(parent::*)]"
    }
  }
  
/*"@opera": {
    build: function() {
      this.optimised.pseudoClasses["last-child"] = this.values.pseudoClasses["last-child"];
      this.optimised.pseudoClasses["only-child"] = this.values.pseudoClasses["only-child"];
      return this.base();
    }
  }*/
});

// these functions defined here to make the code more readable
var _notParser;
function _xpath_not(match, args) {
  if (!_notParser) _notParser = new XPathParser;
  return "[not(" + _notParser.exec(trim(args))
    .replace(/\[1\]/g, "") // remove the "[1]" introduced by ID selectors
    .replace(/^(\*|[\w-]+)/, "[self::$1]") // tagName test
    .replace(/\]\[/g, " and ") // merge predicates
    .slice(1, -1)
  + ")]";
};

function _xpath_nthChild(match, args, position) {
  return "[" + _nthChild(match, args, position || "count(preceding-sibling::*)+1", "last()", "not", " and ", " mod ", "=") + "]";
};

// =========================================================================
// DOM/selectors-api/Selector.js
// =========================================================================

// This object can be instantiated, however it is probably better to use
// the querySelector/querySelectorAll methods on DOM nodes.

// There is no public standard for this object.

var Selector = Base.extend({
  constructor: function(selector) {
    this.toString = K(trim(selector));
  },
  
  exec: function(context, count, simple) {
    return Selector.parse(this, simple)(context, count);
  },

  isSimple: function() {
    if (!_parser.exec) _parser = new CSSParser(_parser);
    return !_COMBINATOR.test(trim(_parser.escape(this)));
  },

  test: function(element) {
    if (this.isSimple()) {
      return Selector.parse(this, true)(element, 1);
    } else {
      element.setAttribute("b2-test", true);
      var result = new Selector(this + "[b2-test]").exec(Traversal.getOwnerDocument(element), 1);
      element.removeAttribute("b2-test");
      return result == element;
    }
  },
  
  toXPath: function(simple) {
    return Selector.toXPath(this, simple);
  },
  
  "@(XPathResult)": {
    exec: function(context, count, simple) {
      // use DOM methods if the XPath engine can't be used
      if (_NOT_XPATH.test(this)) {
        return this.base(context, count, simple);
      }
      var document = Traversal.getDocument(context);
      var type = count == 1
        ? 9 /* FIRST_ORDERED_NODE_TYPE */
        : 7 /* ORDERED_NODE_SNAPSHOT_TYPE */;
      var result = document.evaluate(this.toXPath(simple), context, null, type, null);
      return count == 1 ? result.singleNodeValue : result;
    }
  },
  
  "@MSIE": {
    exec: function(context, count, simple) {
      if (typeof context.selectNodes != "undefined" && !_NOT_XPATH.test(this)) { // xml
        var method = single ? "selectSingleNode" : "selectNodes";
        return context[method](this.toXPath(simple));
      }
      return this.base(context, count, simple);
    }
  },
  
  "@(true)": {
    exec: function(context, count, simple) {
      try {
        // TO DO: more efficient selectors for:
        //   #ID
        //   :hover/active/focus/target
        var result = this.base(context || document, count, simple);
      } catch (error) { // probably an invalid selector =)
        throw new SyntaxError(format("'%1' is not a valid CSS selector.", this));
      }
      return count == 1 ? result : new StaticNodeList(result);
    }
  }
}, {  
  toXPath: function(selector, simple) {
    if (!_xpathParser) _xpathParser = new XPathParser;
    return _xpathParser.parse(selector, simple);
  }
});

var _COMBINATOR = /[\s+>~]/;

var _NOT_XPATH = ":(checked|disabled|enabled|contains|hover|active|focus)|^(#[\\w-]+\\s*)?\\w+$";
if (detect("KHTML")) {
  if (detect("WebKit5")) {
    _NOT_XPATH += "|nth\\-|,";
  } else {
    _NOT_XPATH = ".";
  }
}
_NOT_XPATH = new RegExp(_NOT_XPATH);

// Selector.parse() - converts CSS selectors to DOM queries.

// Hideous code but it produces fast DOM queries.
// Respect due to Alex Russell and Jack Slocum for inspiration.

Selector.operators = {
  "=":  "%1=='%2'",
//"!=": "%1!='%2'", //  not standard but other libraries support it
  "~=": /(^| )%1( |$)/,
  "|=": /^%1(-|$)/,
  "^=": /^%1/,
  "$=": /%1$/,
  "*=": /%1/
};
Selector.operators[""] = "%1!=null";

Selector.pseudoClasses = { //-dean: lang()
  "checked":     "e%1.checked",
  "contains":    "e%1[TEXT].indexOf('%2')!=-1",
  "disabled":    "e%1.disabled",
  "empty":       "Traversal.isEmpty(e%1)",
  "enabled":     "e%1.disabled===false",
  "first-child": "!Traversal.getPreviousElementSibling(e%1)",
  "last-child":  "!Traversal.getNextElementSibling(e%1)",
  "only-child":  "!Traversal.getPreviousElementSibling(e%1)&&!Traversal.getNextElementSibling(e%1)",
  "root":        "e%1==Traversal.getDocument(e%1).documentElement",
  "target":      "e%1.id&&e%1.id==location.hash.slice(1)",
  "hover":       "DocumentState.getInstance(d).isHover(e%1)",
  "active":      "DocumentState.getInstance(d).isActive(e%1)",
  "focus":       "DocumentState.getInstance(d).hasFocus(e%1)"
//"link":        "d.links&&Array2.indexOf(d.links,e%1)!=-1", // not implemented (security)
// nth-child     defined below
};

var _INDEXED = detect("(element.sourceIndex)") ;
var _VAR = "var p%2=0,i%2,e%2,n%2=e%1.";
var _ID = _INDEXED ? "e%1.sourceIndex" : "assignID(e%1)";
var _TEST = "var g=" + _ID + ";if(!p[g]){p[g]=1;";
var _STORE = "r[k++]=e%1;if(s==1)return e%1;if(k===s){_selectorFunction.state=[%2];return r;";
var _FN = "var _selectorFunction=function(e0,s%1){_indexed++;var r=[],p={},reg=[%3],d=Traversal.getDocument(e0),c=d.writeln?'toUpperCase':'toString',k=0;";

var _xpathParser;

// variables used by the parser

var _reg;        // a store for RexExp objects
var _index;
var _wild;       // need to flag certain wild card selectors as MSIE includes comment nodes
var _list;       // are we processing a node list?
var _duplicate;  // possible duplicates?
var _cache = {}; // store parsed selectors

// a hideous parser
var _parser = {
  "^(\\*|[\\w-]+)": function(match, tagName) {
    return tagName == "*" ? "" : format("if(e0.nodeName=='%1'[c]()){", tagName);
  },
  
  "^ \\*:root": function(match) { // :root pseudo class
    _wild = false;
    var replacement = "e%2=d.documentElement;if(Traversal.contains(e%1,e%2)){";
    return format(replacement, _index++, _index);
  },
  
  " (\\*|[\\w-]+)#([\\w-]+)": function(match, tagName, id) { // descendant selector followed by ID
    _wild = false;
    var replacement = "var e%2=_byId(d,'%4');if(e%2&&";
    if (tagName != "*") replacement += "e%2.nodeName=='%3'[c]()&&";
    replacement += "Traversal.contains(e%1,e%2)){";
    if (_list) replacement += format("i%1=n%1.length;", _list);
    return format(replacement, _index++, _index, tagName, id);
  },
  
  " (\\*|[\\w-]+)": function(match, tagName) { // descendant selector
    _duplicate++; // this selector may produce duplicates
    _wild = tagName == "*";
    var replacement = _VAR;
    // IE5.x does not support getElementsByTagName("*");
    replacement += (_wild && _MSIE5) ? "all" : "getElementsByTagName('%3')";
    replacement += ";for(i%2=a%2||0;(e%2=n%2[i%2]);i%2++){";
    return format(replacement, _index++, _list = _index, tagName);
  },
  
  ">(\\*|[\\w-]+)": function(match, tagName) { // child selector
    var children = _MSIE && _list;
    _wild = tagName == "*";
    var replacement = _VAR;
    // use the children property for _MSIE as it does not contain text nodes
    //  (but the children collection still includes comments).
    // the document object does not have a children collection
    replacement += children ? "children": "childNodes";
    if (!_wild && children) replacement += ".tags('%3')";
    replacement += ";for(i%2=a%2||0;(e%2=n%2[i%2]);i%2++){";
    if (_wild) {
      replacement += "if(e%2.nodeType==1){";
      _wild = _MSIE5;
    } else {
      if (!children) replacement += "if(e%2.nodeName=='%3'[c]()){";
    }
    return format(replacement, _index++, _list = _index, tagName);
  },
  
  "\\+(\\*|[\\w-]+)": function(match, tagName) { // direct adjacent selector
    var replacement = "";
    if (_wild && _MSIE) replacement += "if(e%1.nodeName!='!'){";
    _wild = false;
    replacement += "e%1=Traversal.getNextElementSibling(e%1);if(e%1";
    if (tagName != "*") replacement += "&&e%1.nodeName=='%2'[c]()";
    replacement += "){";
    return format(replacement, _index, tagName);
  },
  
  "~(\\*|[\\w-]+)": function(match, tagName) { // indirect adjacent selector
    var replacement = "";
    if (_wild && _MSIE) replacement += "if(e%1.nodeName!='!'){";
    _wild = false;
    _duplicate = 2; // this selector may produce duplicates
    replacement += "while(e%1=e%1.nextSibling){if(e%1.b2_adjacent==_indexed)break;if(";
    if (tagName == "*") {
      replacement += "e%1.nodeType==1";
      if (_MSIE5) replacement += "&&e%1.nodeName!='!'";
    } else replacement += "e%1.nodeName=='%2'[c]()";
    replacement += "){e%1.b2_adjacent=_indexed;";
    return format(replacement, _index, tagName);
  },
  
  "#([\\w-]+)": function(match, id) { // ID selector
    _wild = false;
    var replacement = "if(e%1.id=='%2'){";
    if (_list) replacement += format("i%1=n%1.length;", _list);
    return format(replacement, _index, id);
  },
  
  "\\.([\\w-]+)": function(match, className) { // class selector
    _wild = false;
    // store RegExp objects - slightly faster on IE
    _reg.push(new RegExp("(^|\\s)" + rescape(className) + "(\\s|$)"));
    return format("if(e%1.className&&reg[%2].test(e%1.className)){", _index, _reg.length - 1);
  },
  
  ":not\\((\\*|[\\w-]+)?([^)]*)\\)": function(match, tagName, filters) { // :not pseudo class
    var replacement = (tagName && tagName != "*") ? format("if(e%1.nodeName=='%2'[c]()){", _index, tagName) : "";
    replacement += _parser.exec(filters);
    return "if(!" + replacement.slice(2, -1).replace(/\)\{if\(/g, "&&") + "){";
  },
  
  ":nth(-last)?-child\\(([^)]+)\\)": function(match, last, args) { // :nth-child pseudo classes
    _wild = false;
    last = format("e%1.parentNode.b2_length", _index);
    var replacement = "if(p%1!==e%1.parentNode)p%1=_register(e%1.parentNode);";
    replacement += "var i=e%1[p%1.b2_lookup];if(p%1.b2_lookup!='b2_index')i++;if(";
    return format(replacement, _index) + _nthChild(match, args, "i", last, "!", "&&", "%", "==") + "){";
  },
  
  ":([\\w-]+)(\\(([^)]+)\\))?": function(match, pseudoClass, $2, args) { // other pseudo class selectors
    return "if(" + format(Selector.pseudoClasses[pseudoClass] || "throw", _index, args || "") + "){";
  },
  
  "\\[([\\w-]+)\\s*([^=]?=)?\\s*([^\\]]*)\\]": function(match, attr, operator, value) { // attribute selectors
    var alias = _ATTRIBUTES[attr] || attr;
    var getAttribute = "e%1.getAttribute('%2',2)";
    if (operator) {
      if (!_EVALUATED.test(attr)) {
        getAttribute = "e%1.%3||" + getAttribute;
      }
    } else {
      getAttribute = "Element.getAttribute(e%1,'%2')";
    }
    getAttribute = format(getAttribute, _index, attr, alias);
    var replacement = Selector.operators[operator || ""];
    if (instanceOf(replacement, RegExp)) {
      _reg.push(new RegExp(format(replacement.source, rescape(_parser.unescape(value)))));
      replacement = "reg[%2].test(%1)";
      value = _reg.length - 1;
    }
    return "if(" + format(replacement, getAttribute, value) + "){";
  }
};

(function(_no_shrink_) {
  // IE confuses the name attribute with id for form elements,
  // use document.all to retrieve all elements with name/id instead
  var _byId = detect("MSIE[5-7]") ? function(document, id) {
    var result = document.all[id] || null;
    // returns a single element or a collection
    if (!result || result.id == id) return result;
    // document.all has returned a collection of elements with name/id
    for (var i = 0; i < result.length; i++) {
      if (result[i].id == id) return result[i];
    }
    return null;
  } : function(document, id) {
    return document.getElementById(id);
  };

  // register a node and index its children
  var _indexed = 1;
  function _register(element) {
    if (element.rows) {
      element.b2_length = element.rows.length;
      element.b2_lookup = "rowIndex";
    } else if (element.cells) {
      element.b2_length = element.cells.length;
      element.b2_lookup = "cellIndex";
    } else if (element.b2_indexed != _indexed) {
      var index = 0;
      var child = element.firstChild;
      while (child) {
        if (child.nodeType == 1 && child.nodeName != "!") {
          child.b2_index = ++index;
        }
        child = child.nextSibling;
      }
      element.b2_length = index;
      element.b2_lookup = "b2_index";
    }
    element.b2_indexed = _indexed;
    return element;
  };
  
  Selector.parse = function(selector, simple) {
    if (!_cache[selector]) {
      if (!_parser.exec) _parser = new CSSParser(_parser);
      _reg = []; // store for RegExp objects
      _index = 0;
      var fn = "";
      var selectors = _parser.escape(selector, simple).split(",");
      for (var i = 0; i < selectors.length; i++) {
        _wild = _index = _list = 0; // reset
        _duplicate = selectors.length > 1 ? 2 : 0; // reset
        var block = _parser.exec(selectors[i]) || "throw;";
        if (_wild && _MSIE) { // IE's pesky comment nodes
          block += format("if(e%1.nodeName!='!'){", _index);
        }
        // check for duplicates before storing results
        var store = (_duplicate > 1) ? _TEST : "";
        block += format(store + _STORE, _index, "%2");
        // add closing braces
        block += Array(match(block, /\{/g).length + 1).join("}");
        fn += block;
      }
      fn = _parser.unescape(fn);
      if (selectors.length > 1) fn += "r.unsorted=1;";
      var args = "";
      var state = [];
      for (var i = 1; i <= _list; i++) {
        args += ",a" + i;
        state.push(format("typeof i%1!='undefined'&&i%1?i%1-1:0", i));
      }
      state.push(_list ? format("!!(n%1&&i%1==n%1.length)", i - 1) : true); // complete
      fn += "_selectorFunction.state=[%2];return s==1?null:r}";
      eval(format(_FN + fn, args, state.join(","), _reg));
      _cache[selector] = _selectorFunction;
    }
    return _cache[selector];
  };
})();

// =========================================================================
// DOM/selectors-api/StaticNodeList.js
// =========================================================================

// http://www.w3.org/TR/selectors-api/#staticnodelist

// A wrapper for an array of elements or an XPathResult.
// The item() method provides access to elements.
// Implements Enumerable so you can forEach() to your heart's content... :-)

var StaticNodeList = Base.extend({
  constructor: function(nodes) {
    nodes = nodes || [];
    this.length = nodes.length;
    this.item = function(index) {
      return nodes[index];
    };
/*  // Sorting large node lists can be slow so only do it if necessary.
    // You must still explicitly call sort() to get a sorted node list.
    if (nodes.unsorted) this.sort = function() {
      nodes.sort(_SORTER);
      return this;
    }; */
  },
  
  length: 0,
  
  forEach: function(block, context) {
    for (var i = 0; i < this.length; i++) {
      block.call(context, this.item(i), i, this);
    }
  },

  item: Undefined, // defined in the constructor function
//sort: This,

  "@(XPathResult)": {
    constructor: function(nodes) {
      if (nodes && nodes.snapshotItem) {
        this.length = nodes.snapshotLength;
        this.item = function(index) {
          return nodes.snapshotItem(index);
        };
      } else this.base(nodes);
    }
  }
});

StaticNodeList.implement(Enumerable);

/*
var _SORTER = _INDEXED ? function(node1, node2) {
  return node2.sourceIndex - node2.sourceIndex;
} : function(node1, node2) {
  return (Node.compareDocumentPosition(node1, node2) & 2) - 1;
};
*/

// =========================================================================
// DOM/selectors-api/implementations.js
// =========================================================================

Document.implement(DocumentSelector);
Element.implement(ElementSelector);

// =========================================================================
// DOM/html/HTMLDocument.js
// =========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/#htmldocument

var HTMLDocument = Document.extend(null, {
  bind: function(document) {
    DocumentState.createState(document);
    return this.base(document);
  }
});

// =========================================================================
// DOM/html/HTMLElement.js
// =========================================================================

var HTMLElement = Element.extend(null, {
  bindings: {},
  tags: "*",
  
  bind: function(element) {
    if (!element.classList) {
      element.classList = new _ElementClassList(element);
    }
    if (!element.ownerDocument) {
      element.ownerDocument = Traversal.getOwnerDocument(element);
    }
    return this.base(element);
  },

  extend: function() {
    // Maintain HTML element bindings.
    // This allows us to map specific interfaces to elements by reference
    // to tag name.
    var binding = base(this, arguments);
    forEach.csv(binding.tags, function(tagName) {
      HTMLElement.bindings[tagName] = binding;
    });
    return binding;
  }
});

HTMLElement.extend(null, {
  tags: "APPLET,EMBED",  
  bind: I // Binding not allowed for these elements.
});

// =========================================================================
// DOM/html/ClassList.js
// =========================================================================

// http://www.whatwg.org/specs/web-apps/current-work/#domtokenlist0

// I'm not supporting length/index(). What's the point?

var ClassList = Module.extend({
  add: function(element, token) {
    if (!this.has(element, token)) {
      element.className += (element.className ? " " : "") + token;
    }
  },

  has: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)");
    return regexp.test(element.className);
  },

  remove: function(element, token) {
    var regexp = new RegExp("(^|\\s)" + token + "(\\s|$)", "g");
    element.className = trim(element.className.replace(regexp, "$2"));
  },

  toggle: function(element, token) {
    this[this.has(element, token) ? "remove" : "add"](element, token);
  }
});

function _ElementClassList(element) {
  this.add = function(token) {
    ClassList.add(element, token);
  };
  this.has = function(token) {
    return ClassList.has(element, token);
  };
  this.remove = function(token) {
    ClassList.remove(element, token);
  };
};

_ElementClassList.prototype.toggle = function(token) {
  this[this.has(token) ? "remove" : "add"](token);
};

// =========================================================================
// DOM/DocumentState.js
// =========================================================================

// Store some state for HTML documents.
// Used for fixing event handlers and supporting the Selectors API.

var DocumentState = Base.extend({
  constructor: function(document) {
    this.document = document;
    this.events = {};
    this._hoverElement = document.documentElement;
    this.isBound = function() {
      return !!DOM.bind[document.base2ID];
    };
    forEach (this, function(method, name, documentState) {
      if (/^on((DOM)?\w+|[a-z]+)$/.test(name)) {
        documentState.registerEvent(name.slice(2));
      }
    });
  },

  includes: function(element, target) {
    return target && (element == target || Traversal.contains(element, target));
  },

  hasFocus: function(element) {
    return element == this._focusElement;
  },

  isActive: function(element) {
    return this.includes(element, this._activeElement);
  },

  isHover: function(element) {
    return this.includes(element, this._hoverElement);
  },
  
  handleEvent: function(event) {
    return this["on" + event.type](event);
  },

  onblur: function(event) {
    delete this._focusElement;
  },

  onmouseover: function(event) {
    this._hoverElement = event.target;
  },

  onmouseout: function(event) {
    delete this._hoverElement;
  },

  onmousedown: function(event) {
    this._activeElement = event.target;
  },

  onfocus: function(event) {
    this._focusElement = event.target;
  },

  onmouseup: function(event) {
    delete this._activeElement;
  },

  registerEvent: function(type) {
    this.document.addEventListener(type, this, true);
    this.events[type] = true;
  },
  
  "@(document.activeElement===undefined)": {
    constructor: function(document) {
      this.base(document);
      if (this.isBound()) {
        document.activeElement = document.body;
      }
    },

    onfocus: function(event) {
      this.base(event);
      if (this.isBound()) {
        this.document.activeElement = this._focusElement;
      }
    },

    onblur: function(event) {
      this.base(event);
      if (this.isBound()) {
        this.document.activeElement = this.document.body;
      }
    }
  },

  "@!(element.addEventListener)": {
    constructor: function(document) {
      this.base(document);
      var dispatcher = new EventDispatcher(this);
      this._dispatch = function(event) {
        event.target = event.target || event.srcElement || state.document;
        dispatcher.handleEvent(event);
      };
      this.handleEvent = function(event) {
        if (this["on" + event.type]) {
          this["on" + event.type](event);
        }
        return dispatcher.handleEvent(event);
      };
    },
    
    registerEvent: function(type) {
      var events = this.events[type];
      if (!events) {
        var state = this;
        state.document["on" + type] = function(event) {
          if (!event) {
            event = Traveral.getDefaultiew(this).event;
          }
          if (event) state.handleEvent(event);
        };
        events = this.events[type] = {};
      }
      return events;
    }
  },

  "@MSIE": {
    constructor: function(document) {
      this.base(document);
      var forms = {};
      this._registerForm = function(form) {
        var formID = assignID(form);
        if (!forms[formID]) {
          forms[formID] = true;
          form.attachEvent("onsubmit", this._dispatch);
          form.attachEvent("onreset", this._dispatch);
        }
      };
    },
    
    registerEvent: function(type) {
      var events = this.events[type];
      if (!events) {
        var state = this;
        state.document.attachEvent("on" + type, function(event) {
          event.target = event.srcElement || state.document;
          state.handleEvent(event);
        });
        events = this.events[type] = {};
      }
      return events;
    },

    onDOMContentLoaded: function(event) {
      forEach (event.target.forms, this._registerForm, this);
    },

    onmousedown: function(event) {
      this.base(event);
      this._button = event.button;
    },

    onmouseup: function(event) {
      this.base(event);
      if (this._button == null) {
        event.target.fireEvent("onmousedown", event);
      }
      delete this._button;
    },

    onfocusin: function(event) {
      this.onfocus(event);
      var target = event.target;
      if (target.value !== undefined) {
        var dispatch = this._dispatch;
        target.attachEvent("onchange", dispatch);
        target.attachEvent("onblur", function() {
          target.detachEvent("onblur", arguments.callee);
          target.detachEvent("onchange", dispatch);
        });
      }
    },

    onfocusout: function(event) {
      this.onblur(event);
    },

    onclick: function(event) {
      var target = event.target;
      if (target.form) this._registerForm(target.form);
    },

    ondblclick: function(event) {
      event.target.fireEvent("onclick", event);
    }
  }
}, {
  init: function() {
    assignID(document);
    DocumentState = this;
    this.createState(document);
    new DOMContentLoadedEvent(document);
  },

  createState: function(document) {
    var base2ID = document.base2ID;
    if (!this[base2ID]) {
      this[base2ID] = new this(document);
    }
    return this[base2ID];
  },

  getInstance: function(target) {
    return this[Traversal.getDocument(target).base2ID];
  }
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
