row = window.row || {};

// center

row.centerHorizontally = function () {
  this.childNodes[Math.floor(this.childNodes.length / 2)].center(true);
}

row.centerVertically = function (suppressAnimation) {
  var offsetToCenter = ((-this.offsetTop + ((innerHeight / 2) - (this.map.rowPixelHeight / 2))));
  if (suppressAnimation === true) {
    this.map.style.top = offsetToCenter;
  } else {
    Animator.apply (this.map,
		    "top: " + offsetToCenter + "px",
		    { duration : 500
		    }
		   ).play();
  }
}

row.refresh = function () {
  this.querySelectorAll("img").forEach (makeBook);
  this.centerHorizontally();
}

row.fillWithBooks = function (books) {
  var row = this;
  books.forEach (
    function (book) {
      var cover = row.appendChild (document.createElement ("div")),
	newImg = document.createElement ("img");
      cover.classList.add ('cover');
      cover.appendChild (newImg);
      newImg.width = book.imageWidth;
      newImg.src = book.imageUri;
      cover.metadata = book;
    }
  );
  row.refresh();
}

row.setOffset = function (offset) {
  document.body.style.left = offset + 'px';
}

row.appendBook = function (newBook) {
  var bookToRemove = this.childNodes[0],
    adjustmentPixelWidth = bookToRemove.offsetWidth;

  this.removeChild (bookToRemove);
  this.style.marginLeft = parseInt (this.style.marginLeft) + adjustmentPixelWidth + 'px';

  var newCover = document.createElement ("div"),
    coverImage = newCover.appendChild (document.createElement ("img"));
  
  newCover.classList.add ("cover");
  coverImage.src = newBook.imageUri;
  coverImage.width = newBook.imageWidth;
  newCover.metadata = newBook;

  this.appendChild (newCover);

  makeBook (coverImage);
}

row.prependBook = function (newBook) {
  var bookToRemove = this.lastChild;

  this.removeChild (bookToRemove);

  var newCover = document.createElement ("div"),
    coverImage = newCover.appendChild (document.createElement ("img"));
  
  newCover.classList.add ("cover");
  coverImage.src = newBook.imageUri;
  coverImage.width = newBook.imageWidth;
  newCover.metadata = newBook;

  this.insertBefore (newCover, this.firstChild);
  this.style.marginLeft = parseInt (this.style.marginLeft) - (coverImage.width + 10) + 'px';

  makeBook (coverImage);
}

row.initialize = function () {
  this.initialize = row.initialize;
  this.centerVertically = row.centerVertically;
  this.centerHorizontally= row.centerHorizontally
  this.fillWithBooks = row.fillWithBooks;
  this.appendBook = row.appendBook;
  this.prependBook = row.prependBook;
  this.refresh = row.refresh;
  this.setOffset = row.setOffset;
  this.getIndex = util.getIndex;
  this.map = this.parentNode;
  return this;
}

newRow = function (books) {
  var newRow = document.createElement ("div");
    newRow.classList.add ("row");
  newRow.initialize = row.initialize;
  return newRow;
}
