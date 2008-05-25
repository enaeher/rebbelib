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
                    :reader image-uri)))

(defun make-book (&rest rest)
  (apply #'make-instance (cons 'book rest)))