from gevent import monkey
from flask import Flask

monkey.patch_all()

application = Flask(__name__)
application.debug = True
application.config['PORT'] = 5000


@application.route('/', methods=['GET'])
def landing():
    return "Welcome to Chatzilla"