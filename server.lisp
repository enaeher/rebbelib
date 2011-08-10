(in-package :rebbelib)

(defun start-server (&optional (port *httpd-port*))
  (h:start (make-instance 'h:acceptor :port port)))

(setf h:*dispatch-table* (list
                          'h:dispatch-easy-handlers
			  (h:create-folder-dispatcher-and-handler "/" #P"/home/eli/work/rebbelib/")
                          (h:create-prefix-dispatcher "/" 'render-map)))

