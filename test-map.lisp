(in-package :rebbelib)

(stefil:in-suite bookmap)

(stefil:deftest test-n-similar-items-single ()
  "Ensure that, for a known-valid ASIN, we get the specified number of items back."
  (stefil:with-fixture asin-list
    (let* ((quantity (random 50))
           (books (n-similar-books *asin-list* quantity)))
      (stefil:is (eql (length books)
                      quantity))
      (stefil:is (every (lambda (book) (eql (class-of book)
                                          (find-class 'book)))
                        books)))))