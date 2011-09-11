var globalMap;
var globalCurrent;

// See base2 docs

base2.DOM.bind(document);
eval(base2.JavaScript.namespace);

bic = window.bic || {};

bic.fillWithBooks = function (books) {
  books.forEach (
    function (book) {
      var cover = newRow.appendChild (document.createElement ("div")),
	newImg = document.createElement ("img");
      cover.classList.add ('cover');
      cover.appendChild (newImg);
      newImg.width = book.imageWidth;
      newImg.src = book.imageUri;
      cover.metadata = book;
    }
  );
  bic.makeRow (this); 
  this.map.refreshForRow (tow);
}

bic.newRow = function (books) {
  var newRow = document.createElement ("div");
    newRow.classList.add ("row");
  newRow.style.height = this.rowPixelHeight + "px";
  return newRow;
}

// move the currently-selected book vertically
// books: the new book objects from the server, used to populate the new row in the direction of the shift

bic.refreshForRow = function (newRow) {
  newRow.querySelectorAll("img").forEach (bic.makeCover);
  newRow.childNodes[Math.floor(newRow.childNodes.length / 2)].center(true);
}

bic.shiftUp = function () {
  console.log (this);
  console.log (this.getRows()[this.getRows().length - 1].parentNode);
  this.removeChild (this.getRows()[this.getRows().length - 1]);
  var newRow = this.newRow ();
  this.insertBefore (newRow, this.getRows()[0]);
  this.style.top = (parseInt (this.style.top) - this.rowPixelHeight + 'px'); // FIXME
  return newRow;
}

bic.shiftDown = function () {
  this.removeChild (this.getRows()[0]);
  var newRow = this.newRow ();
  this.appendChild (newRow);
  this.style.top = (parseInt (this.style.top) + this.rowPixelHeight + 'px'); // FIXME
  return newRow;
}


bic.shiftVertically = function (yOffset) {
  var shiftFn = (yOffset > 0) ? this.shiftDown : this.shiftUp,
    rowToQueryBy = this.getRows()[(yOffset > 0) ? 0 : this.getRows().length - 1],
    newEmptyRows = new Array2;

  for (i = 0; i < Math.abs(yOffset); i++) {    
    newEmptyRows.push (shiftFn.call (this));
  }
  bic.getMoreBooks (
    Array2.map (rowToQueryBy, function (book) { return book.metadata.asin; }),
    Math.abs (yOffset) * this.rowLength,
    function (books) {
      for (i = 0; i < Math.abs (yOffset); i++) {
	newEmptyRows[0].fillWithBooks (books.slice (this.rowLength * 0, this.rowLength * i + this.rowLength));
      }
    }
  );
}

bic.getRows = function () {
  return this.querySelectorAll("div.row").map (function (row) { return row } );;
//  bookMap.querySelectorAll("div.row").map ( function (row) { return row } );
}

bic.makeMap = function (bookMap) {
  this.bookMap = bookMap;

  var aRow = bookMap.querySelector("div.row");
  var rowPixelHeight = aRow.offsetHeight;
  var rowLength = aRow.childNodes.length;

  bookMap.getRows = bic.getRows;
  
  bookMap.getRows().map (bic.makeRow);

  bookMap.querySelectorAll ("img").forEach (bic.makeCover);
  bookMap.currentBook = bookMap.getRows()[Math.floor(bookMap.getRows().length / 2)].childNodes[Math.floor(aRow.childNodes.length / 2)];
  
  bookMap.aRow = aRow;
  bookMap.rowPixelHeight = rowPixelHeight;
  bookMap.rowLength = rowLength;

  bookMap.newRow = bic.newRow;
  bookMap.refreshForRow = bic.refreshForRow;
  bookMap.shiftUp = bic.shiftUp;
  bookMap.shiftDown = bic.shiftDown;

  bookMap.shiftVertically = bic.shiftVertically;

    bookMap.shiftHorizontally = function (xOffset, books) {
	for (i = 0; i < Math.abs(xOffset); i++) {

	  bookMap.getRows().forEach (
		function (row) {
		    var damocles = row.childNodes [ xOffset > 0 ? i : (row.childNodes.length - 1)]; /* I thought I was so fucking clever and now I can't remember what the fuck this is */
		    var adjustmentPixelWidth = damocles.offsetWidth;
		    
		    row.removeChild (damocles);
		    
		    if (xOffset > 0) {
			row.style.marginLeft = parseInt (row.style.marginLeft) + adjustmentPixelWidth + 'px';
		    }
		    
		    var newCover = document.createElement ("div"),
			newBook = books[ (i + 1) * row.getIndex() ],
			coverImage = newCover.appendChild(document.createElement("img"));
		    
		    newCover.classList.add ("cover");
		    coverImage.src = newBook.imageUri;
		    coverImage.width = newBook.imageWidth;
		    newCover.metadata = newBook;
		    
		    if (xOffset > 0) {
			row.appendChild (newCover);
		    } else {
			row.insertBefore (newCover, row.childNodes[0]);
			row.style.marginLeft = parseInt (row.style.marginLeft) - (coverImage.width + 10) + 'px'; /* 10px for margin -- need to do it right */
		    }
		    
		    bic.makeCover (coverImage);
		}
	    );
	}
    }

  bookMap.currentBook.makeCurrent();
  
  return bookMap;
};   

bic.makeRow = function (row) {

    row.map = row.parentNode;

    row.center = function (dontAnimate) {
      
      var offsetToCenter = ((-row.offsetTop + ((innerHeight / 2) - (row.map.rowPixelHeight / 2))));
	if (dontAnimate === true) {
          row.map.style.top = offsetToCenter;
	} else {
	    Animator.apply (row.map,
			    "top: " + offsetToCenter + "px",
			    { duration : 500
			    }
			   ).play();
	}
    }

    row.setOffset = function (offset) {
	document.body.style.left = offset + 'px';
    }

    return row;
}

bic.getIndex = function () {
    return Array2.indexOf(this.parentNode.childNodes, this);
}

bic.getMoreBooks = function (similarTo, quantity, callback) {
    // quick and dirty AJAX for now, until I can find some suitable
    // cross-browser library or rewrite Oddjobs

    var handler = function (res) {
	// this is a legitimate use of eval please do not give me shit
	var books = eval('(' + res.responseText + ')');
	callback (books);
    }

    var req = new XMLHttpRequest();
    req.open('GET', 'more-books?' + similarTo.map(function (asin) { return 'asin=' + asin; }).join('&') + '&quantity=' + quantity + '&map-asin=' + globalMapASIN, true);
    req.onreadystatechange = function () {
	if (req.readyState == 4 && req.status == 200) { handler(req); }
    }
    
    req.send(null);

}

bic.makeCurrent = function () {
	var previousX,
	  previousY, 
	  that = this;

	if (globalCurrent) {
	    previousX = globalCurrent.getIndex();
	    previousY = globalCurrent.row.getIndex();
	    globalCurrent.classList.remove("current");
	}
	globalCurrent = this;
	globalCurrent.classList.add("current");
	globalDetailPane.showBook (globalCurrent);
	var xOffset = previousX ? globalCurrent.getIndex() - previousX : 0;
	var yOffset = previousY ? globalCurrent.row.getIndex() - previousY : 0;

	if (xOffset != 0) {
	    bic.getMoreBooks (
	      Array2.map (this.row.map.getRows(),
			    function (row) {
				return row[(xOffset > 0) ? "lastChild" : "firstChild"].metadata.asin;
			    }
			   ),
		Math.abs (xOffset) * 9,
		function (books) { that.row.map.shiftHorizontally (xOffset, books) }
	    );
	}
	if (yOffset != 0) {
	  this.row.map.shiftVertically (yOffset);
	}

	this.row.center();

	Array2.forEach (this.row.parentNode.childNodes,
			function (row) {
			  if (row.center) {
			    row.childNodes[that.getIndex()].center(); 
			  }
			}
		       );

	window.focus();

}

bic.makeCover = function (image) {
  var cover = image.parentNode;
  var row = cover.parentNode;
  
  cover.row = row;
  cover.getIndex = bic.getIndex;
  cover.row.getIndex = bic.getIndex;
  
  base2.DOM.bind(cover); // necessary to use classList
  
  cover.makeCurrent = bic.makeCurrent;
	
    cover.metadata = cover.metadata || globalJSONMap[cover.getIndex()][row.getIndex()];

    image.width = cover.metadata.imageWidth;

    cover.center = function (dontAnimate) {
	if (dontAnimate == true) {
	    row.style.marginLeft = ((window.innerWidth / 2) - ((cover.offsetWidth / 2) + cover.offsetLeft));
	} else {
	    Animator.apply (row,
			    "margin-left: " + ((window.innerWidth / 2) - ((cover.offsetWidth / 2) + cover.offsetLeft)) + "px;",
			    { duration : 150 }
			   ).play();	
	    row.centered = cover;
	}
    }
	

    image.addEventListener ("click",
			    cover.makeCurrent,
			    false);

    return cover;
}

bic.makeDetailPane = function (element) {

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

bic.handleKeys = function (e) {
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

window.addEventListener ("load",
			 function () {
			   globalDetailPane = bic.makeDetailPane (document.querySelector ("div#footer"));
			   globalMap = bic.makeMap (document.querySelector ("div#map"));
			   window.addEventListener ("keydown", bic.handleKeys, false);
			 },
			 false); 


//globalMap.classList.remove('hidden');
window.addEventListener ("keydown", bic.handleKeys, false);

