(defpackage :rebbelib-system (:use #:asdf #:cl))
(in-package :rebbelib-system)

(defsystem :rebbelib
	:depends-on (:cxml :cl-ppcre :drakma :hunchentoot :xpath :cl-who)
	:serial t
        :components
        ((:file "package")
         (:file "package-map")
         (:file "variables")
         (:file "utility")
         (:file "server")
         (:file "book")
         (:file "book-map")
         (:file "aws")
;(:file "init")
         ))
