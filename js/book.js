book = window.book || {};

book.makeCurrent = function () {

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
    util.getMoreBooks (
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

  this.row.centerVertically();

  Array2.forEach (this.row.parentNode.childNodes,
		  function (row) {
		    if (row.firstChild) { // is initialized?
		      row.childNodes[that.getIndex()].center(); 
		    }
		  }
		 );

  window.focus();

}


book.center = function (suppressAnimation) {
    if (suppressAnimation == true) {
      this.row.style.marginLeft = ((window.innerWidth / 2) - ((this.offsetWidth / 2) + this.offsetLeft));
    } else {
      Animator.apply (this.row,
		      "margin-left: " + ((window.innerWidth / 2) - ((this.offsetWidth / 2) + this.offsetLeft)) + "px;",
		      { duration : 150 }
		     ).play();	
      this.row.centered = this;
    }  
}

makeBook = function (image) {

  var newBook = image.parentNode;
  
  newBook.row = newBook.parentNode;
  newBook.getIndex = util.getIndex;
  
  base2.DOM.bind(newBook); // necessary to use classList
  
  newBook.makeCurrent = book.makeCurrent;
	
  newBook.metadata = newBook.metadata || globalJSONMap[newBook.getIndex()][newBook.row.getIndex()];
  
  image.width = newBook.metadata.imageWidth;
  
  newBook.center = book.center;
  
  image.addEventListener ("click",
			  newBook.makeCurrent,
			  false);
  
  return newBook;
}