(in-package :rebbelib)

(defun start-server (&optional (port *httpd-port*))
  (setf *httpd-port* (h:start-server :port port)))

(setf h:*dispatch-table* (list
                          'h:dispatch-easy-handlers
                          (h:create-prefix-dispatcher "/" 'book-map)))

