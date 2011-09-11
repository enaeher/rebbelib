var globalMap;
var globalCurrent;

// See base2 docs

base2.DOM.bind(document);
eval(base2.JavaScript.namespace);

toplevel = window.toplevel || {};

toplevel.handleKeys = function (e) {
  if (e.keyCode >= 37 && e.keyCode <= 40) {
    e.stopPropagation();
    e.preventDefault();
    switch (e.keyCode) {
    case 37:                                           // left arrow
      globalCurrent.previousSibling && globalCurrent.previousSibling.makeCurrent();
      break;
    case 38:                                           // up arrow
      globalCurrent.row.previousSibling &&
	globalCurrent.row.previousSibling.childNodes[globalCurrent.getIndex()].makeCurrent();
      break;
    case 39:                                           // right arrow
      globalCurrent.nextSibling && globalCurrent.nextSibling.makeCurrent();
      break;
    case 40:                                           // down arrow
      globalCurrent.row.nextSibling &&
	globalCurrent.row.nextSibling.childNodes[globalCurrent.getIndex()].makeCurrent();
      break;
    default:
      throw new Error ("Keycode is >= 37 and <= 40, but is not 37, 39, or 40. Possibly ");
    }
  }
}

makeDetailPane = function (element) {

  var fields = ["asin", "title", "author", "binding", "label", "formatted-price",
    "detail-page-uri", "image-uri"];

  element.fields = {};

  Array2.forEach (fields,
		  function (field) {
		    element.fields[field] = element.querySelector("." + field);
		  }
		 );

  element.showBook = function (book) {
    Array2.forEach (["title"],
		    function (field) {
		      if (element.fields[field]) {
			element.fields[field].innerHTML = '';
			/*				Array2.forEach (element.fields[field].childNodes,
						function (child) {
						    element.fields[field].removeChild (child);
						}
					       ); */
			element.fields[field].appendChild (document.createTextNode (book.metadata[field]))
		      }
		    }
		   )
  }
  return element;
}

window.addEventListener ("load",
			 function () {
			   globalDetailPane = makeDetailPane (document.querySelector ("div#footer"));
			   globalMap = makeMap (document.querySelector ("div#map"));
			   window.addEventListener ("keydown", toplevel.handleKeys, false);
			 },
			 false); 


//globalMap.classList.remove('hidden');
window.addEventListener ("keydown", toplevel.handleKeys, false);