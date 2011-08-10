(in-package :rebbelib)

(defparameter *aws-access-key-id* "AKIAJZNGZVMGRAS7LDUA")
(defparameter *aws-secret-key* "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")
(defparameter *aws-associate-tag* "metrcodeandda-20")

(defparameter *aws-namespace-uri* "http://webservices.amazon.com/AWSECommerceService/2011-08-01")
(defparameter *aws-base-uri* #u"http://ecs.amazonaws.com/onca/xml")

(defparameter *httpd-port* 9000)

(defparameter *map-hash* (make-hash-table :test 'equal))
(defparameter *map-hash-mutex* (sb-thread:make-mutex :name "map-hash-mutex"))

(defparameter *map-width* 9)
(defparameter *map-height* 9)

(defparameter *cover-image-max-dimension* 400)

(defparameter *httpd-port* 4254)