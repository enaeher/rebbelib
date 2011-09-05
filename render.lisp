(in-package :rebbelib)

(h:define-easy-handler (render-map :uri "/" :default-request-type :get)
    (asin)
  (let* ((asin (or asin
		   "0394719654"
		   "0805026983"
                   (h:cookie-in "ASIN")
                   "0060839783"                   
                   "0961392142"
                   "0471347116"
                   "1401207928"
                   "0881792063"))
         (map (get-or-build-map asin)))
    (who:with-html-output-to-string (var nil :prologue "<!doctype html5>")
      (:html
       (:head
        (:title "by its cover")
        (:script :src "http://base2.googlecode.com/svn/version/1.0.2/base2-dom-fp.js")
        (:script :src "js/animator.js")
        (:script "var globalJSONMap = "
                 (who:str (json:encode-json-to-string
                           (loop for row from 0 upto (1- *map-height*)
                              collecting
                              (loop for column from 0 upto (1- *map-width*)                              
                                 collecting (book-to-alist (gethash column (gethash row (rows map))))))))
                 ", globalMapASIN = "
                 (who:str (json:encode-json-to-string asin))
		 ", globalImageHeight = "
		 (who:str *cover-image-max-dimension*))
        (:link :rel "stylesheet" :type "text/css" :href "css/bic.css"))
       (:body
        (:div :id "map"
              (who:str (map-to-html map)))
        (:div :id "header" :class "overlay"
              "&larr; &rarr; &uarr; &darr; or click to navigate")
        (:div :id "footer" :class "overlay"
              (:div :class "asin")
              (:div :class "title")
              (:div :class "author")
              (:div :class "binding")
              (:div :class "label")
              (:div :class "detail-page-uri"))
        (:script :src "js/movement.js"))))))

(defun map-to-html (map)
  (check-type map book-map)
  (who:with-html-output-to-string (var)
    (loop for x from 0 upto (1- *map-width*)
       do
       (who:htm (:div :class "row"
                      (loop for y from 0 upto (1- *map-height*)
                         do
                         (who:htm (:div :class "cover"
                                        (when-bind (book (map-ref map y x))
                                          (who:htm (:img :align "left" :src (image-uri book))))))))))))

(defun get-or-build-map (asin)
  (or (gethash asin *map-hash*)                     
      (setf (gethash asin *map-hash*) (build-map asin))))

(defun book-to-alist (book)
  `((:asin . ,(amazon-id book))
    (:title .,(title book))
    (:author . ,(author book))
    (:label . ,(label book))
    (:formatted-price . ,(formatted-price book))
    (:detail-page-uri . ,(detail-page-uri book))
    (:image-uri . ,(image-uri book))
    (:image-width . ,(image-width book))
    (:image-height . ,(image-height book))))

(h:define-easy-handler (more-books :uri "/more-books" :default-request-type :get)
    ((asin :parameter-type '(list string))
     (quantity :parameter-type 'integer))

  (format (swank::connection.user-output (swank::default-connection)) "~%[~a] ~a" (get-universal-time) (list asin quantity))
  (let ((similar (n-similar-books asin
                                  quantity)))
    (format (swank::connection.user-output (swank::default-connection)) "~%[~a] quantity: ~a -- (length similar): ~d" (get-universal-time) quantity (length similar))
    (format (swank::connection.user-output (swank::default-connection)) "~%[~a] similar: ~a" (get-universal-time) similar)
    (assert (= quantity (length similar)))
    (json:encode-json-to-string 
     (mapcar #'book-to-alist
             similar))))

#-(and)
(h:define-easy-handler (grow-map :uri "/grow-map/" :default-request-type :post)
    (asin
     (row-offset :parameter-type 'integer)
     (column-offset :parameter-type 'integer))
  (let* ((asin (or asin
                  (h:cookie-in "ASIN")
                  "0060839783"
                  "0061549231"
                  "0961392142"
                  "0471347116"                  #-(and) "1401216862"
                  "1401207928"
                  "0881792063"))
         (map (get-or-build-map asin)))
    
    
    ))