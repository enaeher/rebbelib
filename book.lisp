(in-package :rebbelib)

(defclass book ()
  ((asin            :initarg :asin
                    :reader amazon-id)
   (title           :initarg :title
                    :reader title)
   (author          :initarg :author
                    :reader author)
   (binding         :initarg :binding
                    :reader binding)
   (label           :initarg :label
                    :reader label)
   (formatted-price :initarg :formatted-price
                    :reader formatted-price)
   (detail-page-uri :initarg :detail-page-uri
                    :reader detail-page-uri)
   (image-uri       :initarg :image-uri
                    :reader image-uri
                    :initform nil)
   (image-width     :initarg :image-width
                    :reader image-width
                    :initform nil)
   (image-height    :initarg :image-height
                    :reader image-height
                    :initform nil)))

(defun make-book (&rest rest)
  (apply #'make-instance (cons 'book rest)))