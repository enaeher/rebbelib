;;; I don't like :use-ing library packages, because I prefer it to be obvious,
;;; when writing or reading code, which functions are part of the current
;;; system and which are part of an interface to some subsidiary system.
;;;
;;; However, many package names are somewhat long, and having every other
;;; function call begin with e.g. "hunchentoot:" quickly becomes cumbersome.
;;; So here I assign short (some might say "cryptic") nicknames to several of
;;; the packages used by Mnemosyne.
;;;
;;; This may be very bad style.

(eval-when (:compile-toplevel :load-toplevel :execute)
  (loop for (package-name . nicknames) in '((hunchentoot . (h)))
     do (rename-package package-name package-name nicknames)))