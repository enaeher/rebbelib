(in-package :rebbelib)

(stefil:in-root-suite)

(stefil:defsuite aws)
(stefil:defsuite bookmap)

(defparameter *asin-list* nil)
(defparameter *single-asin* nil)

(stefil:defixture asin-list
  (:setup (setf *asin-list* (list "0060839783" "0961392142" "0471347116" "1401207928" "0881792063")))
  (:teardown (setf *asin-list* nil)))

(stefil:defixture single-asin
  (:setup (stefil:with-fixture asin-list
            (setf *single-asin* (elt *asin-list* (random (1- (length *asin-list*)))))))
  (:teardown (setf *single-asin* nil)))


