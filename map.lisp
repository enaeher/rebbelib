;;; Set up an interface to a map data structure for lazily caching similarity data.

(in-package :rebbelib)

(defclass book-map ()
  )

(defmethod find-book-in-map ((book book) (map book-map))
  "Auxiliary method allowing FIND-BOOK-IN-MAP to be called
with a book object."
  (find-book-in-map (amazon-id book) map)

(defmethod find-book-in-map ((asin string) (map book-map))
  "Looks up the book designated by ASIN in MAP. Returns
two values if the book was found: a list of the row and
column indices, and the book object. Otherwise, returns
NIL."
  ))



(defmethod )