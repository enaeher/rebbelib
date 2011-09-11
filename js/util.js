util = window.util || {};

util.getIndex = function () {
  return Array2.indexOf(this.parentNode.childNodes, this);
}

util.getMoreBooks = function (similarTo, quantity, callback) {
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