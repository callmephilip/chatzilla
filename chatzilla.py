from gevent import monkey
from flask import Flask, Response, render_template, request
from socketio import socketio_manage
from socketio.namespace import BaseNamespace
from socketio.mixins import BroadcastMixin
from time import time

monkey.patch_all()

application = Flask(__name__)
application.debug = True
application.config['PORT'] = 5000


class ChatNamespace(BaseNamespace, BroadcastMixin):
    
    stats = {
        "people" : []
    }

    def initialize(self):
        self.logger = application.logger
        self.log("Socketio session started")

    def log(self, message):
        self.logger.info("[{0}] {1}".format(self.socket.sessid, message))

    def report_stats(self):
        self.broadcast_event("stats",self.stats)

    def recv_connect(self):
        self.log("New connection")

    def recv_disconnect(self):
        self.log("Client disconnected")
        
        if self.session.has_key("email"):
            email = self.session['email']
            self.stats["people"] = filter(lambda e : e != email, self.stats["people"])
            self.report_stats()

    def on_join(self, email):
        self.log("%s joined chat" % email)
        self.session['email'] = email

        if not email in self.stats["people"]:
            self.stats["people"].append(email) 

        self.report_stats()

        return True, email

    def on_message(self, message):
        message_data = {
            "sender" : self.session["email"],
            "content" : message,
            "sent" : time()*1000 #ms
        }
        self.broadcast_event_not_me("message",{ "sender" : self.session["email"], "content" : message})
        return True, message_data



@application.route('/', methods=['GET'])
def landing():
    return render_template('landing.html')

@application.route('/socket.io/<path:remaining>')
def socketio(remaining):
    try:
        socketio_manage(request.environ, {'/chat': ChatNamespace}, request)
    except:
        application.logger.error("Exception while handling socketio connection",
                         exc_info=True)
    return Response()