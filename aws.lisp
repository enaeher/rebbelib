(in-package :rebbelib)

(defun aws (&key operation item-id)
  (cxml:parse (drakma:http-request *aws-base-uri*
                                   :parameters `(("Service" . "AWSECommerceService")
                                                 ("AWSAccessKeyId" . ,*aws-access-key-id*)
                                                 ("AssociateTag" . ,*aws-associate-tag*)
                                                 ("ResponseGroup" . "ItemAttributes,Images")
                                                 ("SimilarityType" . "Random")
                                                 ,@(when operation
                                                         `(("Operation" . ,operation)))
                                                 ,@(when item-id
                                                         `(("ItemId" . ,item-id))))
                                   :want-stream t)
              (cxml-dom:make-dom-builder)))

(defmacro with-aws-response ((response (&rest aws-arguments)) &body body)
  `(let ((,response (aws ,@aws-arguments)))
     (xpath:with-namespaces (("" *aws-namespace-uri*))
       ,@body)))


(defun node-to-book (xml)
  (xpath:with-namespaces (("" *aws-namespace-uri*))
    (make-book :asin (xpath:string-value (xpath:evaluate "ASIN" xml))
               :title (xpath:string-value (xpath:evaluate "ItemAttributes/Title" xml))
               :author (xpath:string-value (xpath:evaluate "ItemAttributes/Author" xml))
               :binding (xpath:string-value (xpath:evaluate "ItemAttributes/Binding" xml))
               :label (xpath:string-value (xpath:evaluate "ItemAttributes/Label" xml))
               :formatted-price (xpath:string-value (xpath:evaluate "ItemAttributes/FormattedPrice" xml))
               :detail-page-uri (xpath:string-value (xpath:evaluate "ItemAttributes/DetailPageURL" xml))
               :image-uri (ppcre:regex-replace
                           "SL[0-9]+"
                           (xpath:string-value (xpath:evaluate "MediumImage/URL" xml))
                           "SL400"))))

(let ((similarity-data (make-hash-table :test #'equal)))
  
  (defmethod similarity-lookup ((asin string))
    (or (gethash asin similarity-data)
        (with-aws-response (response (:operation "SimilarityLookup" :item-id asin))
          (let ((item-node-set (xpath:evaluate "Items/Item" (dom:document-element response)))
                (items))
            (xpath:map-node-set            
             (lambda (item)
               (push (node-to-book item)
                     items))
             item-node-set)
            items))))

  (defmethod similarity-lookup ((asins list))
    (or (gethash asins similarity-data)
        (with-aws-response (response (:operation "SimilarityLookup"
                                      :item-id (apply #'concatenate (cons 'string
                                                                          (loop for asin in asins
                                                                             nconcing (list asin ","))))))
          (let ((item-node-set (xpath:evaluate "Items/Item" (dom:document-element response)))
                (items))
            (xpath:map-node-set            
             (lambda (item)
               (push (node-to-book item)
                     items))
             item-node-set)
            items)))))

(defun get-book (asin)
  (with-aws-response (response (:operation "ItemLookup" :item-id asin))
    (node-to-book (xpath:first-node (xpath:evaluate "Items/Item" (dom:document-element response))))))