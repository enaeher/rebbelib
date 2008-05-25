var globalMap;
var globalCurrent;
var globalAnimationToggle = true;

// See base2 docs

base2.DOM.bind(document);
eval(base2.JavaScript.namespace);

bic = window.bic || {};

/*window.addEventListener ("load",
			 function () {
			     globalMap = document.querySelector ("div#map");			     
			     document.querySelectorAll ("img").forEach (bic.makeCover); 
			     window.addEventListener ("keydown", bic.handleKeys, false);
			 },
			 false); */    

bic.makeRow = function (row) {

    row.center = function (horizontalOffset, options) {
	if (globalAnimationToggle) {
	    Animator.apply (globalMap,
			    "top: " + ((innerHeight / 2) - ((row.offsetHeight / 2) + row.offsetTop)) + "px; left: " + horizontalOffset + "px;",
			    { duration : 50
			    }
			   ).play();
	} else {
            globalMap.style.top = (innerHeight / 2) - ((row.offsetHeight / 2) + row.offsetTop);
	    globalMap.style.left = horizontalOffset;
	}
    }

    row.setOffset = function (offset) {
	document.body.style.left = offset + 'px';
    }

    return row;
}

bic.makeCover = function (image) {

    var cover = image.parentNode;
    var row = bic.makeRow (cover.parentNode);
    var index = Array2.indexOf(row.childNodes, cover);

    cover.row = row;
    cover.index = index;

    base2.DOM.bind(cover); // necessary to use classList

    cover.makeCurrent = function () {
	cover.center()
	if (globalCurrent) {
	    globalCurrent.classList.remove("current");
	}
	globalCurrent = cover;
	globalCurrent.classList.add("current");
    }

    cover.center = function () {
	row.center ((innerWidth / 2) - ((cover.offsetWidth / 2) + cover.offsetLeft), {});
	row.centered = cover;
    }

    image.addEventListener ("click",
			    cover.makeCurrent,
			    false);

    return cover;
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
		globalCurrent.row.previousSibling.childNodes[globalCurrent.index].makeCurrent();
	    break;
	case 39:                                           // right arrow
	    globalCurrent.nextSibling && globalCurrent.nextSibling.makeCurrent();
	    break;
	case 40:                                           // down arrow
	    globalCurrent.row.nextSibling &&
		globalCurrent.row.nextSibling.childNodes[globalCurrent.index].makeCurrent();
	    break;
	default:
	    throw new Error ("Keycode is >= 37 and <= 40, but is not 37, 39, or 40. Possibly ");
	}
    }
}


globalMap = document.querySelector ("div#map");			     
globalMap.querySelectorAll ("img").forEach (bic.makeCover);
var aRow = globalMap.querySelector("div.container");
globalMap.childNodes[Math.floor(globalMap.childNodes.length / 2)].childNodes[Math.floor(aRow.childNodes.length / 2)].makeCurrent();
globalMap.classList.remove('hidden');
window.addEventListener ("keydown", bic.handleKeys, false);

