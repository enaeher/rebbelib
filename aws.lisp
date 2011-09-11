(in-package :rebbelib)

(defun aws (&key operation item-id keywords)
  (let* ((parameters (sort `(("Service" . "AWSECommerceService")
			     ("AWSAccessKeyId" . ,*aws-access-key-id*)
			     ("Version" . "2011-08-01")
			     ("AssociateTag" . ,*aws-associate-tag*)
			     ("ResponseGroup" . "ItemAttributes,Images")
			     ("SimilarityType" . "Random")
			     ("Timestamp" . ,(zs3::iso8601-date-string))
			     ,@(when operation
				     `(("Operation" . ,operation)))
			     ,@(when item-id
				     `(("ItemId" . ,item-id)))
			     ,@(when keywords
				     `(("SearchIndex" . "Books")
				       ("Keywords" . ,keywords))))
			   #'string< :key #'car))
	 (signature (zs3::sign-string *aws-secret-key*
				      (format nil "GET~%ecs.amazonaws.com~%/onca/xml~%~A"
					      (zs3::alist-to-url-encoded-string parameters)))))
    (multiple-value-bind (stream status headers uri)
	(drakma:http-request *aws-base-uri*
			     :parameters (append parameters `(("Signature" . ,signature)))
			     :want-stream t)
      (ecase status
	(200
	 (cxml:parse stream (cxml-dom:make-dom-builder)))
	(503
	 (error (princ-to-string (xpath:evaluate "Error" (dom:document-element (cxml:parse stream (cxml-dom:make-dom-builder)))))))))))

(defmacro with-aws-response ((response (&rest aws-arguments)) &body body)
  `(let ((,response (aws ,@aws-arguments)))
     (xpath:with-namespaces (("" *aws-namespace-uri*))
       #-(and)
       (format (swank::connection.user-output (swank::default-connection)) "~%[~a] ~a" (get-universal-time) (list ,@aws-arguments))
       ,@body)))

(defun node-set-to-books (xml &key require-images)
  "Convert a nodeset of Items to a list of books. ")

(defun node-to-book (xml)
  (xpath:with-namespaces (("" *aws-namespace-uri*))
    (apply #'make-book
           `(
             :asin ,(xpath:string-value (xpath:evaluate "ASIN" xml))
             :title ,(xpath:string-value (xpath:evaluate "ItemAttributes/Title" xml))
             :author ,(xpath:string-value (xpath:evaluate "ItemAttributes/Author" xml))
             :binding ,(xpath:string-value (xpath:evaluate "ItemAttributes/Binding" xml))
             :label ,(xpath:string-value (xpath:evaluate "ItemAttributes/Label" xml))
             :formatted-price ,(xpath:string-value (xpath:evaluate "ItemAttributes/FormattedPrice" xml))
             :detail-page-uri ,(xpath:string-value (xpath:evaluate "ItemAttributes/DetailPageURL" xml))
             ,@(let ((image-node-set (xpath:evaluate "MediumImage" xml)))
                 (unless (xpath:node-set-empty-p image-node-set)
                   (let* ((image-node (xpath:first-node image-node-set))
                          (image-scaling-ratio (ppcre:register-groups-bind (max-dimension-for-image)
                                                   ("SL([0-9]+)" (xpath:string-value (xpath:evaluate "URL" image-node)))
                                                 (when max-dimension-for-image
                                                   (/ *cover-image-max-dimension* 
                                                      (parse-integer max-dimension-for-image :radix 10))))))
                     `(
                       :image-width ,(* image-scaling-ratio
                                        (xpath:number-value (xpath:evaluate "Width" image-node)))
                       :image-height ,(* image-scaling-ratio
                                         (xpath:number-value (xpath:evaluate "Height" image-node)))
                       :image-uri ,(ppcre:regex-replace
                                    "SL[0-9]+"
                                    (xpath:string-value (xpath:evaluate "URL" image-node))
                                    (format nil "SL~d" *cover-image-max-dimension*))))))))))

(defun find-item-by-keyword (keyword)
  (with-aws-response (response (:operation "ItemSearch" :keywords keyword))
    (when-bind (node (xpath:first-node (xpath:evaluate "Items/Item" (dom:document-element response))))
      (node-to-book node))))

(let ((similarity-data (make-hash-table :test #'equal)))

  (defun get-similarity-data () similarity-data)
  
  (defmethod similarity-lookup ((asin string))
    (format (swank::connection.user-output (swank::default-connection)) "~%[~a] it's a string" (get-universal-time))
    (or (when-bind (items (gethash asin similarity-data))
          (format (swank::connection.user-output (swank::default-connection)) "~%[~a] ~a ~a" (get-universal-time) "cache hit! for " asin)
          items)
        (with-aws-response (response (:operation "SimilarityLookup" :item-id asin))
          (let ((item-node-set (xpath:evaluate "Items/Item" (dom:document-element response)))
                (items))
            (xpath:map-node-set            
             (lambda (item)
               (when-bind (item (node-to-book item))
                 (when (image-uri item)
                   (push item items))))
             item-node-set)
            (setf (gethash asin similarity-data) items)
            items))))

  (defmethod similarity-lookup ((asins list))
    (format (swank::connection.user-output (swank::default-connection)) "~%[~a] it's a list" (get-universal-time))
    (or #-(and) (when-bind (items (gethash asins similarity-data))
          (format (swank::connection.user-output (swank::default-connection)) "~%[~a] ~a ~a" (get-universal-time) "cache hit! for " asins)
          items)
        (with-aws-response (response (:operation "SimilarityLookup"
                                                 :item-id  (apply #'concatenate 
                                                                  (cons 'string
                                                                        (loop for asin in asins
                                                                           nconcing (list asin ","))))))
          (let ((item-node-set (xpath:evaluate "Items/Item" (dom:document-element response)))
                (items))
            (xpath:map-node-set
             (lambda (item)
               (when-bind (item (node-to-book item))
                 (when (image-uri item)
                   (push item items))))
             item-node-set)
            (setf (gethash asins similarity-data) items)
            items)))))

(defun item-lookup (asin)
  (with-aws-response (response (:operation "ItemLookup" :item-id asin))
    (node-to-book (xpath:first-node (xpath:evaluate "Items/Item" (dom:document-element response))))))