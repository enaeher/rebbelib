bookmap = window.bookmap || {};

bookmap.getRows = function () {
  return this.querySelectorAll("div.row").map (function (row) { return row } );
}

bookmap.addRow = function () {
  var row = newRow();
  row.style.height = this.rowPixelHeight + "px";
  return row;
}

bookmap.shiftUp = function () {
  this.removeChild (this.getRows()[this.getRows().length - 1]);
  var newRow = this.addRow ();
  this.insertBefore (newRow, this.getRows()[0]);
  newRow.initialize();
  this.style.top = (parseInt (this.style.top) - this.rowPixelHeight + 'px'); // FIXME
  return newRow;
}

bookmap.shiftDown = function () {
  this.removeChild (this.getRows()[0]);
  var newRow = this.addRow ();
  this.appendChild (newRow);
  newRow.initialize();
  this.style.top = (parseInt (this.style.top) + this.rowPixelHeight + 'px'); // FIXME
  return newRow;
}

bookmap.shiftVertically = function (yOffset) {
  var shiftFn = (yOffset > 0) ? this.shiftDown : this.shiftUp,
    booksToQueryBy = this.getRows()[(yOffset > 0) ? 0 : this.getRows().length - 1].childNodes,
    newEmptyRows = new Array2,
    rowLength = this.rowLength;

  for (i = 0; i < Math.abs(yOffset); i++) {    
    newEmptyRows.push (shiftFn.call (this));
  }
  util.getMoreBooks (
    Array2.map (booksToQueryBy, function (book) { return book.metadata.asin; }),
    Math.abs (yOffset) * rowLength,
    function (books) {
      for (i = 0; i < Math.abs (yOffset); i++) {
	newEmptyRows[0].fillWithBooks (books.slice (rowLength * i, rowLength * i + rowLength));
      }
    }
  );
}


function makeMap (elem) {

  var aRow = elem.querySelector("div.row");
  var rowPixelHeight = aRow.offsetHeight;
  var rowLength = aRow.childNodes.length;

  elem.getRows = bookmap.getRows;
  
  elem.getRows().map (function (newRow) { row.initialize.apply(newRow); });

  elem.querySelectorAll ("img").forEach (makeBook);
  elem.currentBook = elem.getRows()[Math.floor(elem.getRows().length / 2)].childNodes[Math.floor(aRow.childNodes.length / 2)];

  elem.aRow = aRow;
  elem.rowPixelHeight = rowPixelHeight;
  elem.rowLength = rowLength;

  elem.addRow = bookmap.addRow;
  elem.shiftUp = bookmap.shiftUp;
  elem.shiftDown = bookmap.shiftDown;

  elem.shiftVertically = bookmap.shiftVertically;

    elem.shiftHorizontally = function (xOffset, books) {
	for (i = 0; i < Math.abs(xOffset); i++) {

	  elem.getRows().forEach (
		function (thisRow) {
		  var newBook = books[ (i + 1) * thisRow.getIndex() ];
		  if (xOffset > 0) {
		    thisRow.appendBook (newBook);
		  } else {
		    thisRow.prependBook (newBook);
		  }
		}
	    );
	}
    }

  elem.currentBook.makeCurrent();
  
  return elem;
}