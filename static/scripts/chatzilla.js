(function($,jQuery,window){
	
	var chatAPI = {

		connect : function(done) {

			var that = this;

			this.socket = io.connect('/chat');
			this.socket.on('connect', done);

			this.socket.on('message', function(message){
				if(that.onMessage){
					that.onMessage(message);
				}
			});
		},

		join : function(email, onJoin){
			this.socket.emit('join', email, onJoin);
		},

		sendMessage : function(message, onSent) {
			this.socket.emit('message', message, onSent);
		}

	};	

	var bindUI = function(){

		$(".join-chat").validate({
			submitHandler: function(form) {
				chatAPI.join($(form).find("[name='email']").val(), function(joined, name){
					if(joined){
						alert("You've joined Chatzilla");
						$(form).hide();
						$(".compose-message-form").show();
						$(".messages").show();
					}
				});
			}
		});

		$(".compose-message-form").validate({
			submitHandler: function(form) {
				chatAPI.sendMessage($(form).find("[name='message']").val(), function(sent,message){
					if(sent){
						alert("Your message was sent");
					}
				});
			}
		});

		chatAPI.onMessage = function(message){
			$(".messages").append(
				jQuery("<li>").html(message)
			);
		};

	};

	var ready = function(){
		bindUI();
		console.log("Welcome to Chatzilla");
		chatAPI.connect(function(){});
	};



	$(function(){ ready(); });

}($,jQuery,window));