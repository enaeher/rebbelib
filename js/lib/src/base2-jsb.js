// timestamp: Sun, 30 Mar 2008 19:29:12

new function(_no_shrink_) { ///////////////  BEGIN: CLOSURE  ///////////////

// =========================================================================
// JSB/package.js
// =========================================================================

// JavaScript Behaviors

var JSB = new base2.Package(this, {
  name:    "JSB",
  version: "0.9.1",
  imports: "Function2,Enumerable,DOM",
  exports: "Behavior,Rule,RuleList,ExtendedMouse"
});

eval(this.imports);

if (typeof console2 == "undefined") console2={log:Undefined,update:Undefined};

// =========================================================================
// JSB/header.js
// =========================================================================

var _MSIE  = detect("MSIE");

// Max time for hogging the processor.
var _MAX_PROCESSING_TIME = 200; // milliseconds

// Restrict the number of elements returned by a DOM query
// This ensures that the recalc() function does not run for too long.
// It also ensures that elements are returned in batches
// appropriate for consistent rendering.
var _MAX_ELEMENTS = 200;

var _TICK =  0;

var _EVENT          = /^on(DOM\w+|[a-z]+)$/,
    _EVENT_BUTTON   = /^mouse(up|down)|click$/,
    _EVENT_CAPTURE  = /^(focus|blur)$/,
    _EVENT_CLICK    = /click$/,
    _EVENT_MOUSE    = /^mouse|click$/,
    _EVENT_TEXT     = /^(key|text)/;

var _MOUSE_BUTTON_LEFT = /^[^12]$/;

// =========================================================================
// JSB/Behavior.js
// =========================================================================

var Behavior = Module.extend(null, {
  attach: I,
  detach: I,

  extend: function(_interface, _static) {
    // Extend a behavior to create a new behavior.
    var behavior = this.base(_interface, _static);
    behavior.EventDelegator = this.EventDelegator || EventDelegator;
    if (_static && _static.EventDelegator) {
      behavior.EventDelegator = behavior.EventDelegator.extend(_static.EventDelegator);
    }
    var events = {}, attributes = {}, methods;
    var attachedElementIDs = {}; // base2IDs
    var eventListener = new EventListener(new behavior.EventDelegator(behavior, attachedElementIDs));

    // Extract behavior properties.
    behavior.forEach (function(property, name) {
      if (_EVENT.test(name)) {
        // Store event handlers.
        events[name.slice(2)] = property;
      } else {
        // Store methods.
        if (!methods) methods = {};
        methods[name] = behavior.prototype[name];
      }
    });
    forEach.detect (_interface, function(property, name) {
      // Store attributes.
      if (typeOf(property) != "function") {
        attributes[name] = property;
      }
    });

    var docID = document.base2ID;
    behavior.attach = function(element) {
      //if (!element) return;
      var base2ID = element.base2ID || assignID(element);
      if (!attachedElementIDs[base2ID]) { // Don't attach more than once.
        attachedElementIDs[base2ID] = true;
        if (element.id) global["$" + ViewCSS.toCamelCase(element.id)] = element;
        // If the document is bound then bind the element.
        if (DOM.bind[docID]) DOM.bind(element);
        // Add event handlers
        if (events) {
          forEach (events, bind(flip(eventListener.add), eventListener));
          events = null; // We are using event delegation. ;-)
        }
        // Extend the element.
        for (var name in attributes) {
          var attribute = attributes[name];
          if (element[name] === undefined && typeof attribute != "object") {
            element.setAttribute(name, attribute)
          } else {
            element[name] = attribute;
          }
        }
        if (methods) extend(element, methods);
        // Call pseudo events.
        if (behavior.onattach) behavior.onattach(element);
        if (behavior.oncontentready) {
          if (DocumentState.isContentReady(element)) {
            behavior.oncontentready(element);
          } else {
            DocumentState.readyQueue.push({element: element, behavior: behavior});
          }
        }
      }
      return element;
    };

    behavior.detach = function(element) {
      var base2ID = element.base2ID || assignID(element);
      if (attachedElementIDs[base2ID]) {
        if (behavior.ondetach) behavior.ondetach(element);
        delete attachedElementIDs[base2ID];
      }
      return element;
    };
    
    if (behavior.init) behavior.init();

    return behavior;
  },

  EventDelegator: null,

  dispatchEvent: function(element, event, data) {
    if (typeof event == "string") {
      var type = event;
      event = DocumentEvent.createEvent(document, "Events");
      Event.initEvent(event, type, true, false);
    }
    EventTarget.dispatchEvent(element, extend(event, data));
  },

  handleEvent: function(element, event, type) {
    // We could use the passed event type but we can't trust the descendant
    // classes to always pass it. :-)
    type = event.type;
    var handler = "on" + type;
    if (handler) {
      if (_EVENT_MOUSE.test(type)) {
        if (!_EVENT_BUTTON.test(type) || _MOUSE_BUTTON_LEFT.test(event.button)) {
          if (type == "mousewheel") {
            this[handler](element, event, event.wheelDelta);
          } else {
            this[handler](element, event, event.offsetX, event.offsetY, event.screenX, event.screenY);
          }
        }
      } else if (_EVENT_TEXT.test(type)) {
        this[handler](element, event, event.keyCode, event.shiftKey, event.ctrlKey, event.altKey, event.metaKey);
      } else {
        this[handler](element, event);
      }
    }
  },

  getComputedStyle: function(element, propertyName) {
    var view = document.defaultView;
    if (propertyName) return ViewCSS.getComputedPropertyValue(view, element, propertyName);
    return ViewCSS.getComputedStyle(view, element, null);
  },

  getCSSProperty: function(element, propertyName) {
    CSSStyleDeclaration.getPropertyValue(element.style, propertyName);
  },

  setCSSProperty: function(element, propertyName, value, important) {
    CSSStyleDeclaration.setProperty(element.style, propertyName, value, important ? "important" : "");
  }
});

forEach ([
  EventTarget,
  NodeSelector,
  Node,
  Element
], function(_interface) {
  _interface.forEach(function(method, name) {
    if (!Behavior[name]) {
      Behavior[name] = bind(method, _interface);
    }
  });
});

ClassList.forEach(function(method, name) {
  Behavior[name + "Class"] = bind(method, ClassList);
});

// =========================================================================
// JSB/Rule.js
// =========================================================================

// A Selector associated with a Behavior.

var Rule = Base.extend({
  constructor: function(selector, behavior) {
    if (!instanceOf(selector, Selector)) {
      selector = new Selector(selector);
    }
    if (!Behavior.ancestorOf(behavior)) {
      behavior = Behavior.extend(behavior);
    }
    
    this.refresh = function() {
      selector.exec(document).forEach(behavior.attach);
    };

    this.toString = selector.toString;
    
    DocumentState.addRule(selector, behavior);
  },
  
  refresh: Undefined // defined in the constructor function
});

// =========================================================================
// JSB/RuleList.js
// =========================================================================

// A collection of Rule objects

var RuleList = Collection.extend({
  constructor: function(rules) {
    this.base(extend({}, rules));
  },
  
  refresh: function() {
    this.invoke("refresh");
  }
}, {
  Item: Rule
});

// =========================================================================
// JSB/EventListener.js
// =========================================================================

var EventListener = Base.extend({
  constructor: function(delegator) {
    this.delegator = delegator;
  },
  
  delegator: null,

  add: function(type) {
    EventTarget.addEventListener(document, type, this, _EVENT_CAPTURE.test(type));
  },
  
  handleEvent: function(event) {
    this.delegator.handleEvent(event);
  },

  "@MSIE" : {
    handleEvent: function(event) {
      var target = event.target;
      if (_EVENT_MOUSE.test(event.type) && !target.currentStyle.hasLayout) {
        event = extend({}, event);
        event.offsetX -= target.offsetLeft;
        event.offsetY -= target.offsetTop;
      }
      this.delegator.handleEvent(event);
    }
  },

  "@Gecko" : {
    handleEvent: function(event) {
      if (_EVENT_MOUSE.test(event.type)) {
        var box = document.getBoxObjectFor(event.target);
        event.offsetX = event.pageX - box.x;
        event.offsetY = event.pageY - box.y;
      }
      this.delegator.handleEvent(event);
    }
  }
});

// =========================================================================
// JSB/EventDelegator.js
// =========================================================================

var EventDelegator = Base.extend({
  constructor: function(behavior, attached) {
    this.behavior = behavior;
    this.attached = attached;
  },

  behavior: null,
  attached: null,
  
  handleEvent: function(event) {
    var type = event.type;
    var behavior = this.behavior;
    if (type == "documentready") {
      if (behavior.ondocumentready) {
        forEach (this.attached, bind(behavior.ondocumentready, behavior, event));
      }
  //} else if (_EVENT_MOUSE.test(type) && MouseCapture._handleEvent) {
  //  // Pass captured events to the MouseCapture object
  //  MouseCapture._handleEvent(event);
    } else {
      var target = event.target;
      // make sure it's an attached element
      if (target && this.attached[target.base2ID]) {
        behavior.handleEvent(target, event, type);
      }
    }
  }
});

// =========================================================================
// JSB/ExtendedMouse.js
// =========================================================================

// The default behavior for JSB is to only handle mouse events for the left
// mouse button.
// This behavior allows any button click. Relevant events get the "button"
// parameter as the first argument after the "event" parameter.

var ExtendedMouse = Behavior.extend(null, {
  handleEvent: function(element, event, type) {
    type = event.type;
    if (_EVENT_BUTTON.test(type)) {
      var handler = this["on" + type];
      if (handler) {
        this[handler](element, event, event.button, event.offsetX, event.offsetY, event.screenX, event.screenY);
      }
    } else {
      this.base(element, event);
    }
  }
});

// =========================================================================
// JSB/DocumentState.js
// =========================================================================

;;; console2.log("START");
;;; console2.update();
;;; var start = Date2.now();

var DocumentState = Behavior.extend({
  onDOMContentLoaded: function() {
    this.loaded = true;
    ;;; console2.log("DOMContentLoaded");
    ;;; console2.log("Document load time: " + (Date2.now() - start));
  },

  onkeydown: function() {
    this.active = this.busy = true;
  },

  onkeyup: function() {
    this.active = this.busy = false;
  },

  onmousedown: function(element, x, y) {
    // If the user has clicked on a scrollbar then carry on processing.
    this.active = this.busy = (
      x >= 0 &&
      x < element.offsetWidth &&
      y >= 0 &&
      y < element.offsetHeight
    );
  },

  onmouseup: function() {
    this.active = this.busy = false;
  },

  onmousemove: function() {
    if (!this.busy) this.setBusyState(true)
  }
}, {
  EventDelegator: {
    handleEvent: function(event) {
      this.behavior["on" + event.type](event.target, event.offsetX, event.offsetY);
    }
  },
  
  active: false,
  busy:   false,
  loaded: false,
  ready:  false,

  readyQueue: [],
  rules: new Array2,
  
  init: function() {
    this.attach(document);
  },
  
  addRule: function(selector, behavior) {
    assert(!/:/.test(selector), format("Pseudo class selectors not allowed in JSB (selector='%2').", selector));
    var query = Selector.parse(selector);
    this.rules.push({query: query, behavior: behavior});
    if (this.rules.length == 1) this.recalc(); // start the timer
  },

  isContentReady: function(element) {
    if (this.loaded || !element.canHaveChildren) return true;
    while (element && !element.nextSibling) {
      element = element.parentNode;
    }
    return !!element;
  },

  recalc: function(i, j, elements) {
    // This method is overridden once the document has loaded.
    //;;; console2.log("TICK: busy=" + this.busy);
    var rules = this.rules;
    if (!this.busy) {
      // Process the contentready queue.
      var readyQueue = this.readyQueue;
      var now = Date2.now(), start = now, k = 0;
      while (readyQueue.length && (now - start < _MAX_PROCESSING_TIME)) {
        var ready = readyQueue[0];
        if (this.isContentReady(ready.element)) {
          ready.behavior.oncontentready(ready.element);
          readyQueue.shift();
        }
        if (k++ < 5 || k % 50 == 0) now = Date2.now();
      }
      
      // Process attachments.
      var count = rules.length;
      while (count && rules.length && (now - start < _MAX_PROCESSING_TIME)) {
        if (i == null) i = j = 0;
        var rule = rules[i];
        var behavior = rule.behavior;
        
        // Execute a DOM query.
        var queryComplete = false;
        if (!elements) {
          var query = rule.query;
          var state = query.state || [];
          state.unshift(document, _MAX_ELEMENTS);
          elements = query.apply(null, state);
          queryComplete = Array2.item(query.state, -1);
        }
        
        now = Date2.now(); // update the clock
        
        // Attach behaviors.
        var length = elements.length, k = 0;
        while (j < length && (now - start < _MAX_PROCESSING_TIME)) {
          behavior.attach(elements[j++]);
          if (k++ < 5 || k % 50 == 0) now = Date2.now();
        }
        
        // Maintain the loop.
        if (j == length) { // no more elements
          j = 0;
          elements = null;
          if (this.loaded && queryComplete) { // stop processing after DOMContentLoaded
            rules.removeAt(i);
          } else i++;
        }
        if (i > rules.length - 1) i = 0; // at end, loop to first rule
        count--;
      }
    }
    if (rules.length) {
      setTimeout(bind(this.recalc, this, i, j, elements), _TICK);
    } else {
      if (!this.ready) this.fireReady(document);
    }
  },

  fireReady: function() {
    if (!this.ready) {
      this.ready = true;
      this.dispatchEvent(document, "documentready");
      ;;; console2.log("documentready");
      ;;; console2.log("Document ready time: " + (Date2.now()  - start));
    }
  },
  
  setBusyState: function(state) {
    this.busy = this.active || !!state;
    if (this.busy) setTimeout(bind(this.setBusyState, this), 250);
  }
});

eval(this.exports);

}; ////////////////////  END: CLOSURE  /////////////////////////////////////
