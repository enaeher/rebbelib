;; taken, and patches, from ZS3. make-digester patched to use SHA256 instead of SHA1.

(in-package :zs3)

(defun make-digester (key)
  (let ((hmac (ironclad:make-hmac (string-octets key) :sha256)))
    (make-instance 'digester
                   :hmac hmac)))

;; url-encode patched to encode , instead of treading it as a non-special char

(defun url-encode (string)
  "Returns a URL-encoded version of the string STRING using the
LispWorks external format EXTERNAL-FORMAT."
  (let ((*print-pretty* nil))
    (with-output-to-string (out)
      (loop for octet across (string-octets (or string ""))
            for char = (code-char octet)
            do (cond ((or (char<= #\0 char #\9)
                          (char<= #\a char #\z)
                          (char<= #\A char #\Z)
                          (find char "$-_.!*'()" :test #'char=))
                      (write-char char out))
                     ((char= char #\Space)
                      (write-string "%20" out))
                     (t (format out "%~2,'0x" (char-code char))))))))

(in-package :rebbelib)

(defmacro when-bind ((var test) &body body)
  `(let ((,var ,test))
     (when ,var
       ,@body)))

(defmacro if-bind ((var test) then else)
  `(let ((,var ,test))
     (if ,var
       ,then
       ,else)))

(defun trim-sequence-if (predicate sequence &key key)
  (subseq sequence
          (or (position-if (complement predicate) sequence :key key) (length sequence))
          (if-bind (end (position-if (complement predicate) sequence :key key :from-end t))
              (1+ end)
              (length sequence))))