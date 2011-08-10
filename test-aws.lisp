(in-package :rebbelib)

(stefil:in-suite aws)

(stefil:deftest test-item-lookup ()
  "Ensure that, for a known-valid ASIN, we get a book object."
  (stefil:with-fixture single-asin
    (stefil:is (eql (class-of (item-lookup *single-asin*))
                    (find-class 'book)))))

(stefil:deftest test-similarity-lookup-single ()
  "Test that similarity-lookup returns a list of books when passed a single ASIN as a string."
  (stefil:with-fixture single-asin
    (stefil:is (every (lambda (book) (eql (class-of book)
                                          (find-class 'book)))
                      (similarity-lookup *single-asin*)))))

(stefil:deftest test-similarity-lookup-multiple ()
  "Test that similarity-lookup returns a list of books when passed a list of ASINs."
  (stefil:with-fixture asin-list
    (stefil:is (every (lambda (book) (eql (class-of book)
                                          (find-class 'book)))
                      (similarity-lookup *asin-list*)))))