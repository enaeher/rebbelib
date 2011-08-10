(defpackage :rebbelib-system (:use #:asdf #:cl))
(in-package :rebbelib-system)

(defsystem :rebbelib
	:depends-on (:cxml :cl-ppcre :drakma :hunchentoot :xpath :cl-who :cl-json :stefil)
	:serial t
        :components
        ((:file "package")
         (:file "package-map")
         (:file "variables")
         (:file "utility")
         (:file "server")
         (:file "book")
         (:file "book-map")
         (:file "render")
         (:file "aws")
         (:file "test-suites")
         (:file "test-aws")
;(:file "init")
         ))
