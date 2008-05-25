(in-package :rebbelib)

(defun book-map ()
  (let ((asin (or (h:cookie-in "ASIN")
                  "0881792063")))
    (who:with-html-output-to-string (var)
      (:html
       (:head
        (:title "by its cover")
        (:script :src "http://flyoverblues.com/scratch/rebbelib/js/lib/base2-dom-fp.js")
        (:script :src "http://flyoverblues.com/scratch/rebbelib/js/animator.js")
        (:link :rel "stylesheet" :type "text/css" :href "http://flyoverblues.com/scratch/rebbelib/css/bic.css"))
       (:body
        (:div :id "map"
              (who:str (map-to-html (or (gethash asin *map-hash*)                     
                                        (setf (gethash asin *map-hash*) (build-map asin))))))
        (:div :id "header" :class "overlay"
              "&larr; &rarr; &uarr; &darr; or click to navigate")
        (:div :id "footer" :class "overlay"
              "lorem ipsum dolor sic amet")
        (:div :id "footer" " ")
        (:script :src "http://flyoverblues.com/scratch/rebbelib/js/movement.js"))))))

(defun build-map (asin)
  "Given an ASIN as a string, build a *MAP-WIDTH* by *MAP-HEIGHT*
two-dimensional array of book instances. The book at the midpoint
is that referenced by ASIN. For each concentric box proceeding
outward, populate using a similarity lookup on the constituents of
the respective edge (top, bottom, left, right) of the preceding box."
  (assert (every #'oddp (list *map-width* *map-height*)))
  (let ((map (make-array (list *map-width* *map-height*)
                         :element-type 'book
                         :initial-element nil))
        (book (get-book asin))
        (similar-books (similarity-lookup asin))
        (x-midpoint (/ (1- *map-width*) 2))
        (y-midpoint (/ (1- *map-height*) 2)))
    (setf (aref map x-midpoint y-midpoint) book) ; main book in the center
    (loop with edge-points = (remove-duplicates 
                              (reduce #'nconc (bounding-box-edge-indices (1- x-midpoint) (1- y-midpoint)
                                                                         (1+ x-midpoint) (1+ y-midpoint)))
                              :test #'equal)
       for i from 0 upto (length edge-points)
       for (x . y) in edge-points
       do
         (setf (aref map x y) (elt similar-books i)))
    (flet ((corners-for-offset (offset)
             (list (- x-midpoint offset) (- y-midpoint offset)
                   (+ x-midpoint offset) (+ y-midpoint offset))))
      (loop for offset-from-center from 2 upto (/ (1- (max *map-width* *map-height*)) 2)
         do
         (let ((last-bounding-box (corners-for-offset (1- offset-from-center)))
               (this-bounding-box (corners-for-offset offset-from-center))
               (threads-to-join nil))
           (loop
              for last-edge in (apply #'bounding-box-edge-indices last-bounding-box)
              for this-edge in (apply #'bounding-box-edge-indices this-bounding-box)
              do
              (push (let ((last-edge last-edge)
                          (this-edge this-edge))
                      (sb-thread:make-thread
                       (lambda ()
                         (loop
                            for book in (loop for similar = (similarity-lookup
                                                             (loop for (x . y) in last-edge
                                                                for i from 0 upto 9 
                                                                collecting (amazon-id (aref map x y))))
                                           nconcing similar into all-similar
                                           until (>= (length all-similar) (length this-edge))
                                           finally (return all-similar))
                            for (x . y) in this-edge
                            do
                            (setf (aref map x y) book)))))
                    threads-to-join))
           (mapc #'sb-thread:join-thread threads-to-join))))
    map))

(defun map-to-html (map)
  (check-type map (array book 2))
  (who:with-html-output-to-string (var)
    (loop for x from 0 upto (1- *map-width*)
       do
       (who:htm (:div :class "container"
                      (loop for y from 0 upto (1- *map-height*)
                         do
                         (who:htm (:div :class "cover"
                                        (when-bind (book (aref map x y))                                    
                                          (who:htm (:img :align "left" :src (image-uri book))))))))))))

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
  "Given two sets of indices X1, Y1 and X2, X2,
return a list of edges to the box bounded by the points.
Each edge is a list of points along it, with indices
represented as conses."
  (assert (notany #'minusp (list x1 y1 x2 y2)))
  (flet ((collect-edge (&key x y start end)
           (loop for i from (min start end) to (max start end)                
              collecting (if x
                             (progn
                               (assert (notany #'minusp (list x i))) (cons x i))
                             (progn
                               (assert (notany #'minusp (list i y)))
                               (cons i y))))))
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