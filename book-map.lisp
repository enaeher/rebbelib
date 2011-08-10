;;; Set up an interface to a map data structure for lazily caching similarity data.

(in-package :rebbelib)

  (defclass book-map ()
    ((rows    :initform (make-hash-table :test #'equal)
              :accessor rows)
     (books-in-map :initform nil
                   :accessor books-in-map)))

(let ((books-seen (make-hash-table :test #'equal)))

  (defmethod book-seen-p ((book book))
    "Auxiliary method allowing FIND-BOOK-IN-MAP to be called
with a book object."
    (book-seen-p (amazon-id book)))

  (defmethod book-seen-p ((asin string))
    "Looks up the book designated by ASIN in BOOKS-SEEN.
Returns two values if the book was found: a list of the row
and column indices, and the book-map in which it was found.
Otherwise, returns NIL."
    (apply #'values (gethash asin books-seen)))
  
  (defun get-book (asin)
    (or (multiple-value-bind (coordinates book-map)
            (book-seen-p asin)
          (when (and coordinates book-map)
            (map-ref book-map (first coordinates) (second coordinates))))
        (item-lookup asin)))

  (defun frobbery () books-seen)

  (defmethod (setf map-ref) ((new-value book) (map book-map) (row-index integer) (column-index integer))
    (assert new-value)
    (sb-thread:with-mutex (*map-hash-mutex*)
      (multiple-value-bind (row present-p)
          (gethash row-index (rows map) (make-hash-table))
        (unless present-p
          (setf (gethash row-index (rows map)) row))
        (setf (gethash (amazon-id
                        (setf (gethash column-index row) new-value))
                       books-seen)
              (list (list row-index column-index) map))))))

(defmethod map-ref ((map book-map) (row-index integer) (column-index integer))
  "Returns the value at ROW and COLUMN in MAP."
  (sb-thread:with-mutex (*map-hash-mutex*)
    (when-bind (row (gethash row-index (rows map)))
      (gethash column-index row))))

(defun make-book-map (&rest rest)
  (apply #'make-instance (cons 'book-map rest)))

(defun scramble-list (list)
  (sort list (lambda (a b)
               (declare (ignore a b))
               (zerop (random 2)))))

(defun build-map (asin)
  "Given an ASIN as a string, build a *MAP-WIDTH* by *MAP-HEIGHT*
two-dimensional array of book instances. The book at the midpoint
is that referenced by ASIN. For each concentric box proceeding
outward, populate using a similarity lookup on the constituents of
the respective edge (top, bottom, left, right) of the preceding box."
  (assert (every #'oddp (list *map-width* *map-height*)))
  (let ((map (make-book-map))
        (book (get-book asin))
        (similar-books (similarity-lookup asin))
        (column-midpoint (floor (/ *map-width* 2)))
        (row-midpoint (floor (/ *map-height* 2))))    
    (setf (map-ref map row-midpoint column-midpoint) book) ; main book in the center
    (loop with edge-points = (remove-duplicates 
                              (reduce #'nconc (bounding-box-edge-indices (1- column-midpoint) (1- row-midpoint)
                                                                         (1+ column-midpoint) (1+ row-midpoint)))
                              :test #'equal)
       for i from 0 upto (1- (min (length edge-points)
                                  (length similar-books)))
       for (column . row) in edge-points
       do
       (setf (map-ref map row column) (elt similar-books i)))
    (setf (books-in-map map) (cons book similar-books))
    (flet ((corners-for-offset (offset)
             (list (- column-midpoint offset) (- row-midpoint offset)
                   (+ column-midpoint offset) (+ row-midpoint offset))))
      (loop for offset-from-center from 2 upto (/ (1- (max *map-width* *map-height*)) 2)
         do
         (let ((last-bounding-box (corners-for-offset (1- offset-from-center)))
               (this-bounding-box (corners-for-offset offset-from-center))
               (threads-to-join nil))
           (loop
              for last-edge in (apply #'bounding-box-edge-indices last-bounding-box)
              for this-edge in (apply #'bounding-box-edge-indices this-bounding-box)
              do
                (let ((last-edge last-edge)
                      (this-edge this-edge))
                  (push (sb-thread:make-thread
                         (lambda ()
                           (loop
                              for book in (n-similar-books-for-map (remove-if
                                                                    #'null
                                                                    (loop for (column . row) in last-edge
                                                                                 collecting (map-ref map row column)))
                                                                   map
                                                                   (length this-edge))
                              for (column . row) in this-edge
                              do
                                (assert book)
                                (setf (map-ref map row column) book))))
                        threads-to-join)))
           (mapc #'sb-thread:join-thread threads-to-join))))
    map))

(defun n-similar-books-for-map (similar-to map quantity)
  ""
  (loop
     for i from 0 upto 3 
     for similar = (set-difference
                    (similarity-lookup (mapcar #'amazon-id similar-to))
                    (books-in-map map)
                    :key #'amazon-id
                    :test #'equal)
     do (setf (books-in-map map) (append similar (books-in-map map)))
     nconcing similar into all-similar
     until (>= (length all-similar) quantity)
     finally (return all-similar)))

(defun n-similar-books (similar-to quantity)
  (assert (listp similar-to))
  (loop
     for similar = (similarity-lookup similar-to)
     do (format (swank::connection.user-output (swank::default-connection)) "one iteration")
     nconcing similar into all-similar
     until (>= (length all-similar) quantity)
     finally (return (subseq all-similar 0 quantity))))

(defun grow-map (map direction)
  (cond ))

#-(and)
(defun bounding-box-contains (array x1 y1 x2 y2)
  "Given a two-dimensional ARRAY and two points
X1,Y1, and X2,X2, return array members contained
by the bounding box formed by those points, in
no particular order"
  (loop for x from (min x1 x2) to (max x1 x2)
       nconcing
       (loop for y from (min y1 y2) to (max y1 y2)
            collecting (aref array x y))))

(defun bounding-box-edge-indices (x1 y1 x2 y2)
  "Given two sets of indices X1, Y1 and X2, Y2,
return a list of edges to the box bounded by the points.
Each edge is a list of points along it, with indices
represented as conses."
  (flet ((collect-edge (&key x y start end)
           (loop for i from (min start end) to (max start end)                
              collecting (if x
                             (cons x i)
                             (cons i y)))))
    (list (collect-edge :x (min x1 x2) :start y1 :end y2)     ; top
          (collect-edge :x (max x1 x2) :start y1 :end y2)     ; bottom
          (collect-edge :y (min y1 y2) :start x1 :end x2)     ; left
          (collect-edge :y (max y1 y2) :start x1 :end x2))))  ; right

#-(and)
(defun shift-array (array axis-number magnitude &key (initial-element 0))
  "Shift ARRAY along the axis indicated by AXIS-NUMBER by MAGNITUDE
elements. AXIS-NUMBER must be a non-negative integer less than the rank
of ARRAY, and has the same semantics as the same-named argument to
ARRAY-DIMENSION. MAGNITUDE may be a positive or negative integer, the
magnitude of which cannot exceed the dimension of ARRAY for AXIS-NUMBER."
  (loop for rank from 0 upto axis-number  ; for each axis of the array....
       (loop for )))

#-(and)
(defun shift-map (map direction amount &key initial-element)
  "Shift MAP (actually, any "
  (assert (= 2 (array-rank map)))
  (let ((width (array-dimension map 0))
        (height (array-dimension map 1)))
    (adjust-array map (ecase direction
                        ((:up :down) (list width (1+ height)))
                        ((:left :right) (list (1+ width) height)))
                  :initial-element nil)))